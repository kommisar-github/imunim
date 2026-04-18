# Implementation Plan — v6: Session Persistence + API Security

**Created: 2026-04-18**
**Version Range: v6.0.0 – v6.0.5**

---

## Problem Statement

### Problem 1: No Session Persistence
Every page load requires re-entering TZ and re-authenticating. A page refresh loses all state — instructors must re-enter TZ, wait for OTP, and re-load all session data. This is the primary UX complaint.

### Problem 2: Unprotected Server Functions
All global GAS functions are callable from the browser console via `google.script.run`. Today, anyone who visits the web app can call `getAllInstructors()`, `getTraineeData()`, or `getVerifiedTraineeData(tz)` directly and get full data back — no auth required. The UI enforces access control, but the server does not.

---

## Solution Overview

Both problems are solved by a single mechanism: **server-side session tokens**.

1. After successful auth, the server creates a UUID token in `CacheService` with a 2-hour TTL.
2. The client stores the token in `sessionStorage` and passes it with every `google.script.run` call.
3. Sensitive server functions validate the token and check the caller's role before returning data.
4. On page refresh, the stored token restores the session without re-authentication.

This is rolled out **role by role** — admin first, instructors next, trainees last — so each phase can be tested and deployed independently before moving to the next.

---

## Design Decisions

### Why `CacheService` (not `PropertiesService`)?

- Built-in TTL — tokens expire automatically, no cleanup needed.
- Already used in the project for OTP codes — familiar pattern.
- 6-hour max TTL is sufficient for a training day.
- PropertiesService has no TTL — would require manual expiry checks.

### Why `sessionStorage` (not `localStorage`)?

- Clears when the tab/window closes — natural logout boundary.
- Protects against stale tokens on shared devices.
- All GAS apps share the `script.google.com` origin — `localStorage` would persist across unrelated GAS apps. `sessionStorage` is tab-scoped.
- App-specific key (`imun_session`) avoids edge cases.

### Why NOT cookies?

- GAS iframe sandbox may restrict cookie access.
- Cookies are sent on every HTTP request — unnecessary for `google.script.run`.
- `sessionStorage` is simpler and more predictable in GAS iframes.

### Token scope: per-tab, NOT cross-tab

- `sessionStorage` only works in the tab that created it.
- Opening a new tab (e.g., admin link from instructor dashboard via `target="_blank"`) requires its own login. This is acceptable — it's an explicit user action.

### TTL duration

- **2 hours** (7200 seconds) as default `SESSION_TTL_SECONDS`.
- Covers a typical training day with buffer. Configurable in `config.gs`.

### Role-by-role rollout

- **Admin first** (v6.0.1) — smallest user base, most complex dashboard, highest value from persistence. Also the owner — can debug issues before they affect others.
- **Instructor next** (v6.0.2) — medium user base, biggest UX improvement (dashboard used throughout training day).
- **Trainees last** (v6.0.3–v6.0.4) — largest user base, simplest pages, lowest risk.

Each version is self-contained and deployable. If a phase has issues, earlier phases continue working.

---

## API Security Model

### Guard function

```javascript
/**
 * Validates session token and enforces role-based access.
 * Throws on failure — caller's withFailureHandler receives the error.
 *
 * @param {string} token — UUID from client sessionStorage
 * @param {string[]} allowedRoles — e.g. ['admin'], ['instructor','admin'], or null for any
 * @returns {object} — {tz, role, isAdmin, isOwner}
 * @throws {Error} — if token invalid or role insufficient
 */
function requireAuth(token, allowedRoles) {
  if (!token) throw new Error('נדרשת הזדהות');
  var session = validateUserSession(token);
  if (!session.valid) throw new Error('הזדהות פגה. יש להתחבר מחדש');
  if (allowedRoles && allowedRoles.indexOf(session.role) === -1) {
    throw new Error('אין הרשאה לפעולה זו');
  }
  return session;
}
```

On auth failure, `google.script.run.withFailureHandler` fires on the client. The client clears the stale token and reloads the page to show the TZ entry form:

```javascript
function handleAuthError(error) {
  if (error.message === 'הזדהות פגה. יש להתחבר מחדש' || error.message === 'נדרשת הזדהות') {
    clearSession();
    location.reload();
  } else {
    alert('שגיאה: ' + error.message);
  }
}
```

### Function access matrix

**Public — no token required** (these ARE the auth flow):

| Function | Why public |
|----------|-----------|
| `lookupByTZ(tz)` | Entry point — has its own OTP/Google auth logic |
| `requestOTP(tz)` | Sends OTP email — must work before auth |
| `requestOTPForEmail(tz, email)` | Same |
| `verifyOTP(tz, code)` | Validates OTP — returns data on success |
| `checkInstructorAuth(tz)` | Checks Google session match |
| `requestInstructorOTP(tz)` | Sends OTP to instructor |
| `verifyInstructorOTP(tz, code)` | Validates instructor OTP |
| `validateUserSession(token)` | Token check — returns valid/invalid, no sensitive data |
| `createUserSession(tz, role)` | Called internally after auth success |
| `destroyUserSession(token)` | Logout — removes token |

**Gated — any valid token** (trainee, instructor, or admin):

| Function | Current risk | Gated in |
|----------|-------------|----------|
| `submitPollResponse(token, ...)` | Anyone can submit fake poll responses | v6.0.3 |
| `getActiveSessions(token)` | Leaks session dates/instructor names | v6.0.3 |
| `getSessionResponseCount(token, sessionId)` | Minor — just a count | v6.0.3 |

**Gated — instructor or admin token**:

| Function | Current risk | Gated in |
|----------|-------------|----------|
| `getInstructorData(token, tz)` | Exposes name, email, phone, admin flag | v6.0.2 |
| `getAllInstructors(token)` | Exposes all instructors with emails | v6.0.2 |
| `getInstructorSessions(token, tz)` | Exposes session list | v6.0.2 |
| `createSession(token, ...)` | Anyone could create fake sessions | v6.0.2 |
| `closeSession(token, sessionId)` | Anyone could close sessions | v6.0.2 |
| `getSessionResponses(token, sessionId)` | Exposes trainee attendance data | v6.0.2 |
| `updateSessionResponse(token, ...)` | Anyone could edit attendance | v6.0.2 |
| `issuePrintToken(token, tz, sessionId)` | Could generate print access | v6.0.2 |

**Gated — admin token only**:

| Function | Current risk | Gated in |
|----------|-------------|----------|
| `getTraineeData(token)` | Exposes ALL trainees (names, TZ, phones, tools) | v6.0.1 |
| `getVerifiedTraineeData(token, tz)` | Bypasses OTP — returns full data for any TZ | v6.0.1 |
| `updateTraineeStatus(token, ...)` | Anyone could suspend trainees | v6.0.1 |
| `getSuspendedTrainees(token)` | Exposes suspended trainee list | v6.0.1 |
| `resolveTraineeSuspension(token, tz)` | Anyone could un-suspend | v6.0.1 |
| `addInstructor(token, ...)` | Anyone could add instructors | v6.0.1 |
| `updateInstructor(token, ...)` | Anyone could modify instructors | v6.0.1 |
| `removeInstructor(token, tz)` | Anyone could delete instructors | v6.0.1 |

**Gated — owner token only** (admin token + `isOwner` check):

| Function | Current risk | Gated in |
|----------|-------------|----------|
| `getSuspensionReasons(token)` | Minor — just reason strings | v6.0.1 |
| `getActiveSuspensionReasons(token)` | Same | v6.0.1 |
| `addSuspensionReason(token, reason)` | Anyone could add reasons | v6.0.1 |
| `toggleSuspensionReason(token, ...)` | Anyone could toggle reasons | v6.0.1 |

### How `requireAuth` works for owner-only functions

```javascript
function addSuspensionReason(token, reason) {
  var session = requireAuth(token, ['admin']);
  if (!session.isOwner) throw new Error('הפעולה זמינה לבעלים בלבד');
  // ... existing logic
}
```

---

## Implementation Phases

### Phase 0: Foundation (v6.0.0)

**Server-side** — data.gs:

```javascript
// Session management
function createUserSession(tz, role) { ... }
function validateUserSession(token) { ... }
function destroyUserSession(token) { ... }
function requireAuth(token, allowedRoles) { ... }
```

**Config** — config.gs:

```javascript
var SESSION_TTL_SECONDS = 7200;  // 2 hours
var SESSION_KEY_PREFIX = 'sess-'; // Cache key prefix
```

**Client-side shared helper** — pages.gs:

```javascript
function getSessionScript() {
  return '<script>'
    + 'var SESSION_KEY="imun_session";'
    + 'function saveSession(token){try{sessionStorage.setItem(SESSION_KEY,token)}catch(e){}}'
    + 'function loadSession(){try{return sessionStorage.getItem(SESSION_KEY)||""}catch(e){return""}}'
    + 'function clearSession(){try{sessionStorage.removeItem(SESSION_KEY)}catch(e){}}'
    + 'function doLogout(){var t=loadSession();if(t){google.script.run.destroyUserSession(t)}clearSession();location.reload()}'
    + 'function handleAuthError(e){if(e.message.indexOf("הזדהות")>-1){clearSession();location.reload()}else{alert(e.message)}}'
    + '</script>';
}
```

**Risk:** None — no callers yet. Foundation is inert until pages use it.

**Est. lines:** config.gs +2, data.gs +60, pages.gs +10. **Total: ~72 lines.**

---

### Phase 1: Admin Dashboard (v6.0.1)

**Session persistence:**

On successful admin login (TZ + OTP/Google verified):
```javascript
// In doAdminLogin success path:
google.script.run.withSuccessHandler(function(token){
  saveSession(token);
}).createUserSession(currentAdminTz, 'admin');
```

On page load — auto-restore:
```javascript
(function(){
  var token = loadSession();
  if (!token) return;
  google.script.run
    .withSuccessHandler(function(r) {
      if (r.valid && r.role === 'admin') {
        currentAdminTz = r.tz;
        currentIsOwner = r.isOwner;
        enterAdminDashboard();
      }
    })
    .withFailureHandler(function(){})
    .validateUserSession(token);
})();
```

Zoom handling: `enterAdminDashboard()` already removes zoom via `window._adminZoomed` — works on token-restored sessions too.

Logout button in dashboard header area.

**API security — gate admin functions:**

All admin-only functions gain `token` as first parameter. Example:

```javascript
// Before:
function getTraineeData() { ... }

// After:
function getTraineeData(token) {
  requireAuth(token, ['admin']);
  // ... existing logic unchanged
}
```

Client-side calls updated:
```javascript
// Before:
google.script.run.withSuccessHandler(...).getTraineeData();

// After:
google.script.run.withSuccessHandler(...).withFailureHandler(handleAuthError).getTraineeData(loadSession());
```

**Functions gated in this phase:**

| Function | New signature | Role required |
|----------|--------------|---------------|
| `getTraineeData` | `getTraineeData(token)` | admin |
| `getVerifiedTraineeData` | `getVerifiedTraineeData(token, tz)` | admin |
| `updateTraineeStatus` | `updateTraineeStatus(token, tz, status, reason, date)` | admin |
| `getSuspendedTrainees` | `getSuspendedTrainees(token)` | admin |
| `resolveTraineeSuspension` | `resolveTraineeSuspension(token, tz)` | admin |
| `addInstructor` | `addInstructor(token, data)` | admin |
| `updateInstructor` | `updateInstructor(token, data)` | admin |
| `removeInstructor` | `removeInstructor(token, tz)` | admin |
| `getSuspensionReasons` | `getSuspensionReasons(token)` | admin (+ isOwner) |
| `getActiveSuspensionReasons` | `getActiveSuspensionReasons(token)` | admin (+ isOwner) |
| `addSuspensionReason` | `addSuspensionReason(token, reason)` | admin (+ isOwner) |
| `toggleSuspensionReason` | `toggleSuspensionReason(token, idx, active)` | admin (+ isOwner) |

**Special handling — `getVerifiedTraineeData`:**
This function is also called from the register page in admin-edit mode (`?tz=X`). In admin-edit mode, the register page is opened from the admin dashboard, which has a valid admin token in sessionStorage. So passing `loadSession()` works — the token carries over because it's the same origin (even in a new tab opened via `target="_blank"` if using `window.open` within the same session... wait, `target="_blank"` creates a new tab with empty sessionStorage).

**Correction:** Admin edit mode opens in a new tab → empty sessionStorage → no token. Two options:
1. Pass the token via URL parameter (`?tz=X&token=Y`) — but we said no tokens in URLs.
2. Keep `getVerifiedTraineeData` callable without token ONLY when `adminMode` is true AND a valid admin-edit-mode token exists.
3. **Simplest:** In admin-edit mode, the register page doesn't need a session token — the `?tz=X` parameter already signals admin intent, and `getVerifiedTraineeData` is only called from that code path. We gate it behind a separate short-lived admin-edit token (like the existing print token pattern): the admin dashboard creates a 60-second `admin-edit-token` in CacheService, appends it to the URL, and the register page validates it once on load.

```javascript
// Admin dashboard — when clicking "edit trainee":
google.script.run.withSuccessHandler(function(editToken){
  window.open(REGISTER_URL + '&tz=' + tz + '&editToken=' + editToken, '_blank');
}).issueAdminEditToken(loadSession());

// data.gs:
function issueAdminEditToken(token) {
  var session = requireAuth(token, ['admin']);
  var editToken = Utilities.getUuid();
  CacheService.getScriptCache().put('edit-token-' + editToken, session.tz, 120); // 2 min
  return editToken;
}

// Register page — on load in admin mode:
// Validate editToken from URL via server call, then use getVerifiedTraineeData with editToken
function getVerifiedTraineeData(tokenOrEditToken, tz) {
  // Try session token first
  var cache = CacheService.getScriptCache();
  var editTz = cache.get('edit-token-' + tokenOrEditToken);
  if (editTz) {
    cache.remove('edit-token-' + tokenOrEditToken); // one-time use
    // Valid admin edit token — proceed
  } else {
    // Must be a session token
    requireAuth(tokenOrEditToken, ['admin']);
  }
  // ... existing logic
}
```

**Risk:** Medium — most complex page, but falls back gracefully.

**Testing:**
- [ ] Admin login → refresh → dashboard restored
- [ ] Owner panels visible after restore
- [ ] Zoom removed on restore
- [ ] Logout clears session
- [ ] Calling gated functions from console without token → error
- [ ] Calling gated functions with trainee/instructor token → error
- [ ] Admin edit mode (new tab) → works via admin-edit token
- [ ] Token expiry → refresh shows TZ entry

**Est. lines:** data.gs +25 (guards + admin-edit token), pages.gs +40 (admin page). **Total: ~65 lines.**

---

### Phase 2: Instructor Dashboard (v6.0.2)

**Session persistence:**

On successful instructor login:
```javascript
google.script.run.withSuccessHandler(function(token){
  saveSession(token);
}).createUserSession(currentInstructor.tz, 'instructor');
```

On page load — auto-restore:
```javascript
(function(){
  var token = loadSession();
  if (!token) return;
  google.script.run
    .withSuccessHandler(function(r) {
      if (r.valid && (r.role === 'instructor' || r.role === 'admin')) {
        google.script.run
          .withSuccessHandler(function(inst) {
            if (inst && inst.name) {
              currentInstructor = inst;
              enterDashboard();
            }
          })
          .withFailureHandler(function(){})
          .getInstructorData(loadSession(), r.tz);
      }
    })
    .withFailureHandler(function(){})
    .validateUserSession(token);
})();
```

Logout button next to admin link slot in header.

**API security — gate instructor functions:**

| Function | New signature | Role required |
|----------|--------------|---------------|
| `getInstructorData` | `getInstructorData(token, tz)` | instructor, admin |
| `getAllInstructors` | `getAllInstructors(token)` | instructor, admin |
| `getInstructorSessions` | `getInstructorSessions(token, tz)` | instructor, admin |
| `createSession` | `createSession(token, dateStr, tz, notes, d1, d2)` | instructor, admin |
| `closeSession` | `closeSession(token, sessionId)` | instructor, admin |
| `getSessionResponses` | `getSessionResponses(token, sessionId)` | instructor, admin |
| `updateSessionResponse` | `updateSessionResponse(token, sessionId, name, attending, bullets)` | instructor, admin |
| `issuePrintToken` | `issuePrintToken(token, tz, sessionId)` | instructor, admin |

**Client-side updates:** All `google.script.run` calls in the instructor dashboard pass `loadSession()` as first argument and use `handleAuthError` as failure handler.

**Note — `getInstructorData` during login:** During the login flow (before a session token exists), `getInstructorData(tz)` is called to get the instructor's name. At that point there's no token yet. Solution: the function accepts `token` as optional first param — if it looks like a TZ (numeric, 7-9 digits), treat it as the old single-param call (login flow). If it looks like a UUID, treat it as a token.

```javascript
function getInstructorData(tokenOrTz, maybeTz) {
  var tz;
  if (maybeTz) {
    // Two params: token + tz
    requireAuth(tokenOrTz, ['instructor', 'admin']);
    tz = normalizeId(maybeTz);
  } else {
    // One param: tz only (login flow — limited data)
    tz = normalizeId(tokenOrTz);
    // Return limited data — name and admin flag only, no email/phone
    var inst = _getInstructorRecord(tz);
    return inst ? {name: inst.name, tz: inst.tz, admin: inst.admin} : {name: ''};
  }
  // Full data with token
  return _getInstructorRecord(tz);
}
```

This way, the unauthenticated login flow only gets the instructor's name (needed to show "שלום, [name]"), not their email or phone. Full data is available only after authentication.

**Risk:** Medium — dashboard state restoration must work. Print token flow unchanged.

**Testing:**
- [ ] Instructor login → refresh → dashboard restored with sessions
- [ ] Deputy sessions visible after restore
- [ ] Print button still works (print token mechanism unchanged)
- [ ] Attendance panel works with token
- [ ] Admin link visible if admin flag set
- [ ] Logout clears session
- [ ] `getAllInstructors()` from console without token → error
- [ ] `createSession()` from console without token → error

**Est. lines:** data.gs +20 (guards + split getInstructorData), pages.gs +35 (instructor page). **Total: ~55 lines.**

---

### Phase 3: Poll Page (v6.0.3)

**Session persistence:**

On successful trainee auth (OTP verified, Gmail matched, or simplified auth):
```javascript
google.script.run.withSuccessHandler(function(token){
  saveSession(token);
}).createUserSession(currentTz, 'trainee');
```

On page load — auto-restore:
```javascript
(function(){
  var token = loadSession();
  if (!token) return;
  google.script.run
    .withSuccessHandler(function(r) {
      if (r.valid && r.role === 'trainee') {
        currentTz = r.tz;
        // Skip TZ entry, show session picker directly
        document.getElementById('tzArea').style.display = 'none';
        loadTraineeAndSessions(r.tz);
      }
    })
    .withFailureHandler(function(){})
    .validateUserSession(token);
})();
```

Logout link (subtle, below form).

**API security — gate trainee-level functions:**

| Function | New signature | Role required |
|----------|--------------|---------------|
| `submitPollResponse` | `submitPollResponse(token, responseData)` | trainee, instructor, admin |
| `getActiveSessions` | `getActiveSessions(token)` | trainee, instructor, admin |
| `getSessionResponseCount` | `getSessionResponseCount(token, sessionId)` | trainee, instructor, admin |

**Note:** `getActiveSessions` is also called from the instructor page to show sessions. Since instructor tokens are also valid for "any valid token" functions, this works naturally.

**Risk:** Low — simple page, graceful fallback.

**Testing:**
- [ ] Poll login (OTP) → refresh → session picker visible without re-auth
- [ ] Poll login (Gmail) → refresh → auto-restore
- [ ] Poll login (simplified auth) → refresh → auto-restore
- [ ] Submit poll → works with token
- [ ] `submitPollResponse()` from console without token → error
- [ ] Logout → back to TZ entry

**Est. lines:** data.gs +10 (guards), pages.gs +35 (poll page). **Total: ~45 lines.**

---

### Phase 4: Register Page (v6.0.4)

**Session persistence:**

On successful trainee auth:
```javascript
google.script.run.withSuccessHandler(function(token){
  saveSession(token);
}).createUserSession(currentTz, 'trainee');
```

On page load — auto-restore:
```javascript
(function(){
  var token = loadSession();
  if (!token) return;
  google.script.run
    .withSuccessHandler(function(r) {
      if (r.valid && r.role === 'trainee') {
        currentTz = r.tz;
        document.getElementById('tzInput').value = r.tz;
        // Load data and show form
        google.script.run
          .withSuccessHandler(function(data) {
            if (data && data.found) {
              editMode = true;
              showResult(data);
            }
          })
          .getVerifiedTraineeData(loadSession(), r.tz);
      }
    })
    .withFailureHandler(function(){})
    .validateUserSession(token);
})();
```

**Wait — `getVerifiedTraineeData` requires admin token (gated in Phase 1).** For trainee self-restore, we need a different approach. The trainee already authenticated — their data was returned by `verifyOTP()` or `lookupByTZ()`. On restore, we can call `lookupByTZ(tz)` again — but that would trigger OTP again.

**Solution: new function `getTraineeDataBySession(token, tz)`** — returns trainee data if the token is valid AND the token's TZ matches the requested TZ. A trainee can only fetch their own data.

```javascript
function getTraineeDataBySession(token, tz) {
  var session = requireAuth(token, null); // any valid role
  tz = normalizeId(tz);
  if (session.role === 'trainee' && session.tz !== tz) {
    throw new Error('אין הרשאה'); // trainee can only fetch own data
  }
  // Admin/instructor can fetch any trainee (already gated by role)
  return _getVerifiedTraineeData(tz); // internal helper, same logic
}
```

This keeps `getVerifiedTraineeData(token, tz)` admin-only, while giving trainees a safe way to reload their own data on refresh.

Logout link (subtle, below form).

**Risk:** Low — simple page, same pattern as poll.

**Testing:**
- [ ] Register login (OTP) → refresh → form visible with data
- [ ] Register login (Gmail) → refresh → auto-restore
- [ ] Suspended trainee → banner still shows on restore
- [ ] Admin edit mode → still works via admin-edit token
- [ ] Trainee calling `getTraineeDataBySession` with someone else's TZ → error
- [ ] Logout → back to TZ entry

**Est. lines:** data.gs +15 (new function + internal refactor), pages.gs +35 (register page). **Total: ~50 lines.**

---

### Phase 5: Cleanup & Version Bump (v6.0.5)

- Verify all functions are gated according to access matrix
- Add `withFailureHandler(handleAuthError)` to any remaining `google.script.run` calls
- Bump all .gs file headers to v6.0.5
- Update documentation (DESIGN.md, ROADMAP.md, GUI_GUIDELINES.md)
- Update manuals with logout button and refresh behavior

---

## Complete Version Sequence

| Version | Scope | What ships |
|---------|-------|-----------|
| v6.0.0 | Foundation | `createUserSession`, `validateUserSession`, `destroyUserSession`, `requireAuth`, `getSessionScript()`, config constants. No behavioral changes yet. |
| v6.0.1 | Admin | Admin session persistence + logout + all admin/owner function gating (~12 functions). Admin edit token for register page. |
| v6.0.2 | Instructor | Instructor session persistence + logout + instructor function gating (~8 functions). `getInstructorData` split (limited data without token). |
| v6.0.3 | Poll | Poll session persistence + logout + trainee-level function gating (~3 functions). |
| v6.0.4 | Register | Register session persistence + logout + `getTraineeDataBySession` for safe self-data access. |
| v6.0.5 | Cleanup | Final audit, version bump, documentation updates, manual updates. |

---

## Files Changed (cumulative)

| File | Changes | Est. Lines |
|------|---------|-----------|
| config.gs | `SESSION_TTL_SECONDS`, `SESSION_KEY_PREFIX`, version bumps | +2 |
| data.gs | 4 session functions, `requireAuth`, guards on ~23 functions, `getTraineeDataBySession`, `issueAdminEditToken`, `getInstructorData` split | +130 |
| pages.gs | `getSessionScript()`, auto-restore + token passing + logout on 4 pages | +155 |
| routing.gs | Pass admin-edit token in `?action=register` URL | +5 |
| **Total** | | **~292 lines** |

Files NOT changed: setup.gs, logo.gs, backup.gs.

---

## What NOT To Do

1. **Don't persist form state** — only auth state is persisted. Form inputs reset on refresh.
2. **Don't use `localStorage`** — `sessionStorage` is the right security boundary.
3. **Don't create a "remember me" option** — single session behavior is sufficient for now.
4. **Don't change existing OTP flow** — tokens are created AFTER auth, not as replacement.
5. **Don't add session tokens to URL parameters** — exception: admin-edit token (short-lived, one-time).
6. **Don't modify print page flows** — print tokens have their own mechanism.
7. **Don't gate public auth functions** — `lookupByTZ`, `requestOTP`, `verifyOTP`, etc. must remain callable without tokens.
8. **Don't break backward compatibility mid-rollout** — each phase must leave ungated pages still working. For example, after v6.0.1 gates admin functions, the instructor page (not yet updated) must still be able to call `getAllInstructors` — so we use a transition approach: functions accept token as optional param during rollout, and enforce it only after all callers are updated.

### Backward Compatibility During Rollout

**Critical:** Between v6.0.1 and v6.0.2, the instructor page doesn't pass tokens yet, but `getAllInstructors` is already gated in v6.0.1. This would break the instructor page.

**Solution:** Functions gated in Phase 1 that are also called from the instructor page use a **soft gate** during v6.0.1–v6.0.2:

```javascript
function getAllInstructors(token) {
  // Soft gate: enforce if token provided, allow without during transition
  if (token) requireAuth(token, ['instructor', 'admin']);
  // ... existing logic
}
```

In v6.0.2, when the instructor page starts passing tokens, the soft gate becomes a hard gate:

```javascript
function getAllInstructors(token) {
  requireAuth(token, ['instructor', 'admin']); // Hard gate
  // ... existing logic
}
```

**Functions needing soft gate in v6.0.1 (called by both admin and instructor pages):**
- `getAllInstructors`
- `getInstructorData`

All other admin-gated functions are only called from the admin page, so they can be hard-gated immediately.

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Token theft from sessionStorage | Tab-scoped, cleared on close. Same-origin policy prevents cross-site access. |
| Token guessing | UUID v4 = 122 bits. Brute-force infeasible. |
| Session fixation | Tokens generated server-side only after successful auth. |
| Stale permissions | Token stores role at creation. 2-hour TTL limits exposure. |
| Shared devices | sessionStorage clears on tab close. Logout button available. |
| GAS origin sharing | App-specific key `imun_session`. UUID token can't validate against another app's CacheService. |
| Console API abuse (current) | **Fixed:** All sensitive functions require valid token with correct role. |
| Admin-edit token in URL | Short-lived (2 min), one-time use (removed from cache after first validation). |
| `getInstructorData` pre-login | Returns limited data (name + admin flag only) without token. No email/phone exposed. |

---

## Testing Plan

### Per-Phase Testing

Each phase has its own test checklist (listed in the phase sections above).

### Cross-Phase Integration Tests (after v6.0.5)

- [ ] Admin login → open instructor link in same tab → session carries over (both use `imun_session`)
- [ ] Instructor login → open admin link in new tab → new tab requires own login
- [ ] Trainee token → try calling admin functions from console → rejected
- [ ] Instructor token → try calling admin-only functions → rejected
- [ ] Admin token → try calling owner-only functions without isOwner → rejected
- [ ] Expire token server-side (reduce TTL) → next `google.script.run` call → `handleAuthError` fires → page reloads to TZ entry
- [ ] Multiple roles same browser: admin in tab 1, instructor in tab 2 → independent sessions
- [ ] Mobile: all persistence tests on phone (zoom behavior + token restore)
- [ ] "Request Desktop Site" mode → persistence still works

### Regression Tests

- [ ] All existing flows work WITHOUT tokens on pages not yet updated (during rollout)
- [ ] Print flow unchanged
- [ ] Admin edit mode works via edit token
- [ ] Simplified auth (דא) still works
- [ ] OTP flow unchanged for first-time login

---

## Future Considerations (NOT in v6.0.x)

- **Cross-tab sessions** — `localStorage` with explicit logout. Needs "session active in another tab" handling.
- **Token refresh / sliding expiry** — extend TTL on each `validateUserSession`. Prevents timeout during active use.
- **Form state persistence** — save inputs to sessionStorage alongside token.
- **"Remember me" mode** — `localStorage` + longer TTL for trusted devices.
- **Session activity log** — track token creation/validation for security auditing.
- **Rate limiting on public functions** — add attempt counting to `lookupByTZ` to prevent TZ enumeration.
- **CSP headers** — GAS controls the iframe's Content-Security-Policy, but could explore `HtmlService.setContent()` headers.

---

## Documentation Updates (v6.0.5)

| Document | Update |
|----------|--------|
| All .gs headers | Bump to v6.0.5 |
| config.gs | `SESSION_TTL_SECONDS`, `SESSION_KEY_PREFIX` |
| doc/DESIGN.md | New functions, updated function signatures, security model section, version |
| doc/ROADMAP.md | Already updated with v6 plan |
| doc/GUI_GUIDELINES.md | Add `getSessionScript()`, logout button placement |
| Manuals | Logout button, refresh behavior, updated screenshots |
