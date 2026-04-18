# Implementation Plan — v4.0.0: Security, Deputies & Attendance Override

**Status: COMPLETE — Superseded by v5.0.0**  
**Versions: 4.0.0 – 4.2.9**  
**Date: March – April 2026**  
**Reconstructed: April 2026 (from MULTI_DESIGN.md and CONTEXT.md)**

---

## 1. Overview

v4 added authentication layers, deputy instructor support, automated session management, and instructor attendance override on top of the v3 multi-instructor foundation. Key milestones:

- **v4.0.0**: Google session auth, email capture, `REQUIRE_LOGIN` flag
- **v4.1.0**: Trainee OTP hybrid auth for non-Google-session browsers
- **v4.2.0**: Deputy instructors (up to 2 per session with print access)
- **v4.2.3**: Instructor OTP auth, print token flow, OTP gate page
- **v4.2.4**: Auto-close past sessions (daily trigger), admin close buttons
- **v4.2.5**: Session event email notifications
- **v4.2.7**: Admin dashboard rework (active sessions list replaces broken stats)
- **v4.2.9**: Instructor attendance override (edit attending status + bullets from dashboard)

---

## 2. v4.0.0 — Authentication & Email Capture

### REQUIRE_LOGIN Flag

- Global constant: `var REQUIRE_LOGIN = true;` (in config.gs)
- Controls route-level gating in `doGet(e)` dispatcher
- When true, protected routes check `Session.getActiveUser().getEmail()`
- When false, all routes remain public (legacy behavior)

### Google Session Authentication

- Uses `Session.getActiveUser().getEmail()` for automatic user identification
- **Architecture limitation**: returns empty string for non-owner users accessing public web app
- Fallback mechanism needed for trainees and instructors without direct Google session
- Trainer email captured in silent background (no user interaction)

### Email Capture on Registration & Update

- **Source sheet column E (אימייל)**: new column for silent email storage
- `addTraineeData(data)` — calls `Session.getActiveUser().getEmail()` and stores in column E
- `updateTraineeData(data)` — updates Google session email on every edit
- `backfillTraineeEmail(traineeName)` — captures email for existing trainees during poll submission
- No user consent required (silent capture via Google OAuth session)

### ADMIN_EMAILS Array

- Replaces scattered hardcoded admin checks
- Global array: `var ADMIN_EMAILS = ['kommisar@gmail.com'];` (example)
- Used for:
  - Route-level gating: `doGet(e)` checks email against array for protected routes
  - Admin dashboard access: only users in array can view admin page
  - Email notifications: session events sent to `ADMIN_EMAILS[0]`
- Later renamed to `OWNER_EMAILS` in v5.0.0 for clarity in 4-tier role system

### Route-Level Gating in doGet()

```
if (REQUIRE_LOGIN && isProtectedRoute(action)) {
  var email = Session.getActiveUser().getEmail();
  if (!isAuthorizedEmail(email)) {
    return HtmlService.createHtmlOutput('Access denied');
  }
}
```

Protected routes in v4: `instructor`, `admin`, `print` (context-dependent), `status`

---

## 3. v4.1.0 — Trainee OTP Hybrid Auth

### Problem Solved

Non-Google-session browsers (private browsing, non-Chrome, mobile apps, etc.) have no email from `Session.getActiveUser()`. OTP provides a fallback for trainees and instructors in these scenarios.

### Hybrid Auth in lookupByTZ()

Four cases handled:

| Case | Google Session | Stored Email | Action |
|------|---|---|---|
| **1** | Yes (match) | Yes | Allow, return trainee data |
| **2** | Yes (mismatch) | Yes | Block (impersonation attempt) |
| **3** | No | Yes | Return `{needsOTP: true, maskedEmail}` → OTP flow |
| **4** | No | No | Return `{needsEmail: true, name}` → email collection → OTP flow |

### OTP Functions (Trainee)

- **`generateOTP()`** — Returns random 6-digit string
- **`maskEmail(email)`** — Returns format: `a***b@example.com` for UI display
- **`requestOTP(tz)`** — Looks up trainee by ת.ז., sends OTP to stored email via `MailApp.sendEmail()` with styled HTML. Returns `{success, maskedEmail}`
- **`requestOTPForEmail(tz, email)`** — For trainees without stored email. Validates email format, generates OTP, sends code, stores email in source sheet (new entry created if needed). Returns `{success, maskedEmail}`
- **`verifyOTP(tz, code)`** — Verifies code against cache. Handles attempt counting (max 3 attempts, 15-min block after exhaustion). On success, returns full trainee data via `getVerifiedTraineeData(tz)`
- **`getVerifiedTraineeData(tz)`** — Returns trainee data (bypasses auth checks). Called only after successful OTP verification in v4.1.0; later reused in v5.0.0 for admin-mode trainee edit

### OTP Rate Limiting

- Cache keys: `otp-{tz}`, `otp-block-{tz}`, `otp-attempt-{tz}`
- Max 3 attempts per OTP request
- After 3 failed attempts: 15-minute block (cache key `otp-block-{tz}`)
- OTP validity: 5 minutes (TTL set via `OTP_TTL_SECONDS`)
- Storage: `CacheService.getScriptCache()` with auto-expiry

### Email Configuration

- `MailApp.sendEmail(email, subject, htmlBody, {htmlBody: html})`
- Sender: hardcoded email in config.gs (`OTP_FROM_EMAIL = 'kommisar@gmail.com'`)
- Display name: `OTP_FROM_NAME = 'מערכת אימוני ירי'`
- Subject & body in Hebrew
- HTML template with styled formatting

---

## 4. v4.2.0 — Deputy Instructors (מ"מ)

### Sessions Sheet Extension

**New columns H, I (appended to existing 7 columns):**

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| H | מ"מ 1 ת.ז. | Text | Deputy 1 instructor ת.ז. (optional, foreign key to instructor sheet) |
| I | מ"מ 2 ת.ז. | Text | Deputy 2 instructor ת.ז. (optional, foreign key to instructor sheet) |

### parseSessionRow() Helper

- **NEW function**: parses a single session row from sessions sheet
- Extracts columns A–I (including new deputy columns)
- Returns object: `{sessionId, date, instructorTz, instructorName, status, notes, deputy1Tz, deputy2Tz}`
- Used by: `getActiveSessions()`, `getInstructorSessions()`, `getAllSessions()`, `getPrintHtml()`
- Eliminates duplicated row-parsing code across functions

### createSession() Modification

**Signature**: `createSession(dateStr, instructorTz, notes, deputy1Tz, deputy2Tz)`

- **NEW parameters**: optional `deputy1Tz`, `deputy2Tz`
- Validates: instructorTz exists in instructor sheet
- Validates: deputy1Tz and deputy2Tz exist in instructor sheet (if provided)
- Generates sessionId = `YYYYMMDD-{instructorTz}`
- Checks for duplicate sessionId
- Looks up instructor name from instructor sheet
- Appends row: `[sessionId, date, instructorTz, instructorName, 'פעיל', notes, timestamp, deputy1Tz, deputy2Tz]`
- Returns `{success: true, sessionId: sessionId}`

### getInstructorSessions() Extension

- **NEW**: returns sessions with `role` field
- Matches instructorTz in three columns:
  - Column C (main instructor): `role: 'main'`
  - Column H (deputy 1): `role: 'deputy'`
  - Column I (deputy 2): `role: 'deputy'`
- Returns array: `[{sessionId, date, ..., deputy1Tz, deputy2Tz, role}, ...]`
- Allows deputies to see their assigned sessions in dashboard

### Instructor Dashboard Display

**For main instructor sessions:**
- "🔗 שתף" (share)
- "📲 שלח בווטסאפ" (WhatsApp)
- "✏️ רשימת מגיעים" (attendance override)
- "🖨️ הדפסה" (print)
- "סגור" (close)

**For deputy sessions (NEW):**
- "הדפסה" (print only)
- "רשימת מגיעים" (attendance override — added in v4.2.9)
- Cannot create, share, or close

**Deputy display on session cards:**
- Shows "מ"מ 1: {name}" and/or "מ"מ 2: {name}" if assigned
- Badge shows "מ"מ" status for non-main roles

### isSessionAuthorized() & isSessionAuthorizedByTz()

- Checks ת.ז. or email against: main instructor + deputy1 + deputy2
- Used for print page access control
- Returns true if caller is any of the three instructors OR admin

---

## 5. v4.2.3 — Instructor OTP Auth & Print Tokens

### checkInstructorAuth(tz)

- **NEW function**: verifies instructor authentication
- First tries Google session: `Session.getActiveUser().getEmail()`
- If Google email present: looks up instructor by ת.ז., checks if email matches
  - Match: returns `{authenticated: true}`
  - Mismatch: returns `{authenticated: false, needsOtp: true}` or error
- If no Google email: returns `{authenticated: false, needsOtp: true}`
- Called from instructor dashboard login flow

### Instructor OTP Flow

- **`requestInstructorOTP(tz)`** — sends 6-digit OTP to instructor's registered email
  - Cache keys: `otp-inst-{tz}`, `otp-block-inst-{tz}`
  - Returns `{success, maskedEmail}`
  - Rate limiting: same as trainee (3 attempts, 15-min block)

- **`verifyInstructorOTP(tz, code)`** — verifies instructor OTP
  - Checks code against cache
  - On success: calls `issuePrintToken()` to create access token
  - Returns `{success, printToken}`
  - Token used to access print page

### Print Token Flow

- **`issuePrintToken(tz, sessionId)`** — issues one-time 60-second token
  - Generates UUID (e.g., `a1b2c3d4-e5f6-7890-1234-567890abcdef`)
  - Stores in cache: `print-token-{token}`
  - TTL: 60 seconds (expiration auto-managed by CacheService)
  - Returns token string

- **Token usage**: after OTP verification, redirect to `?action=printVerified&session=ID&token=T`
- **`getPrintHtml(sessionId)`** validates token before rendering print page
- Token consumed on use (not persisted for reuse)

### getPrintOtpGateHtml() — OTP Gate Page

- **NEW function**: standalone page for print access without Google session
- Two-step flow:
  1. **Enter ת.ז.**: field for instructor ID
  2. **Send OTP**: calls `requestInstructorOTP(tz)` → shows masked email
  3. **Enter code**: 6-digit code field
  4. **Verify**: calls `verifyInstructorOTP(tz, code)`
  5. **Redirect**: on success, navigates to `?action=printVerified&session=ID&token=T`
- Page styling matches other auth pages (dark theme, centered form)
- Used when instructor tries `?action=print&session=ID` without valid Google session

### Route Flow for Print Access

```
GET ?action=print&session=ID
  ↓
Server checks Google session email
  ↓
CASE 1: Valid Google session + isSessionAuthorizedByTz(email, sessionId)
  ↓ Render getPrintHtml(sessionId)
  ↓
CASE 2: No Google session OR unauthorized
  ↓ Render getPrintOtpGateHtml(sessionId)
  ↓ User enters ת.ז. + OTP code
  ↓ Server verifies, calls issuePrintToken()
  ↓ Redirect to ?action=printVerified&session=ID&token=T
  ↓
GET ?action=printVerified&session=ID&token=T
  ↓
Server validates token (from cache)
  ↓
Token valid: Render getPrintHtml(sessionId), clear token
Token invalid: Show error "Token expired or invalid"
```

---

## 6. v4.2.4 — Auto-Close & Admin Controls

### autoClosePastSessions()

- **NEW function**: closes all sessions where date < today (Israel timezone)
- Reads all sessions from sessions sheet
- For each session with status `פעיל`:
  - Parses session date
  - Compares to today (Israel timezone)
  - If past: sets status to `סגור`
- Wrapped in try/catch: failures logged but don't block other closures
- Returns count of closed sessions

### Automatic Daily Trigger

- **`installAutoCloseTrigger()`** in setup.gs — creates daily time-driven trigger
- Runs `autoClosePastSessions()` at ~02:00 Israel time (after backup at ~01:00)
- Removes any existing auto-close trigger first (prevents duplicates)
- Registered in `setupAll()`

- **`removeAutoCloseTrigger()`** — removes trigger by handler function name
- Used for uninstalling or disabling auto-close

### Admin Close Button

- Admin dashboard displays all active sessions (v4.2.7 improvement)
- Each session row has "סגור" button
- Admin can manually close any session immediately
- Calls `closeSession(sessionId)` on click
- Session status → `סגור`, becomes unavailable for new poll responses

---

## 7. v4.2.5 — Session Event Notifications

### notifyAdminSessionEvent()

- **NEW function**: sends email to all `ADMIN_EMAILS` on session state change
- Called from `createSession()` (session opened) and `closeSession()` (session closed)
- Parameters: `eventType` ('open' or 'close'), `dateStr`, `instructorName`, `instructorTz`, `deputy1Tz`, `deputy2Tz`
- Email body includes:
  - Event type (Hebrew: "אימון נפתח" / "אימון נסגר")
  - Session date
  - Main instructor name
  - Deputy names (if assigned)
  - Link to admin dashboard
- HTML-formatted email via `MailApp.sendEmail()`
- **Safety**: wrapped in try/catch — failures are logged but don't block session operations
- Allows admins to monitor session activity without checking dashboard constantly

---

## 8. v4.2.7 — Admin Dashboard Rework

### Problem & Solution

- **v4.2.6**: Admin dashboard stats rendering broken (aggregation errors)
- **v4.2.7**: Replaced with active sessions list + close buttons
- Simpler, more reliable, more actionable

### Admin Dashboard Sections (v4.2.7)

1. **Active Sessions List**
   - Reads all sessions with status `פעיל`
   - For each session: shows date, instructor name, deputy names, response count
   - Close button (inline with each row)
   - Sorted by date ascending (nearest session first)

2. **Navigation Links**
   - "רישום מתאמנים" → register page
   - "סקר נוכחות" → poll page
   - "כניסת מדריך" → instructor dashboard

3. **System Info**
   - Version number (from `SCRIPT_VERSION`)
   - Deployment URL

### Dashboard Functions

- `getAdminDashboardHtml()` — renders page
- `doGetStatus(sessionId)` — returns JSON: `{success, total, attending}` for a session
  - Called from dashboard to update response count badge
  - Filters poll responses by sessionId
  - Counts total rows and rows with attending = "כן"

---

## 9. v4.2.9 — Instructor Attendance Override

### Problem Solved

- Instructors could not edit trainee attendance records post-submission
- If trainee submitted wrong "attending" status or bullet count, instructor had to ask them to resubmit
- Needed manual override capability for last-minute changes (no-shows, late arrivals, etc.)

### New Functions

- **`getSessionResponses(sessionId)`** — returns all poll responses for a session as editable array
  - Reads response sheet filtered by sessionId (column F)
  - Returns array: `[{name, trainee, attending, bullets, notes, rowIndex}, ...]`
  - Available to main instructor and deputies of the session

- **`updateSessionResponse(sessionId, traineeName, attending, bullets)`** — updates a single trainee's record
  - Matches by sessionId + traineeName
  - Updates: attending status (column C) and bullet count (column D)
  - Validates: attending is "כן" or "לא", bullets is numeric or empty
  - Returns `{success: true}` or error

### Attendance Override Panel UI

When instructor clicks "✏️ רשימת מגיעים" on an active session:

1. Dashboard sections hidden, new `.att-panel` overlay appears
2. Server call: `getSessionResponses(sessionId)` — fetches all responses
3. Rendered list of trainees:
   - Row for each trainee: name, "מגיע" checkbox, bullet count input
   - Name is read-only, checkbox & input are editable
4. **Change tracking**: changed rows highlighted with orange border (`.att-changed`)
5. Two action buttons:
   - "שמור שינויים" (green `.btn-save`) — calls `updateSessionResponse()` for each changed row
   - "חזור ללוח" (gray `.btn-back`) — discards changes, restores dashboard view
6. Empty state message if no responses exist

### Client-Side Functions

- **`showAttendanceList(sessionId)`** — hides dashboard, creates panel, fetches data
- **`renderAttendanceList(sessionId, rows)`** — builds editable rows with event listeners
- **`markAttChanged(el)`** — highlights row with orange border when value changes
- **`saveAttendanceChanges(sessionId)`** — collects all changed rows, fires parallel `updateSessionResponse` calls
- **`hideAttendanceList()`** — removes panel, restores dashboard view

### CSS Classes

- `.att-panel` — overlay container
- `.att-header` — panel title row
- `.att-row` — individual trainee row
- `.att-name` — name cell (read-only)
- `.att-check` — checkbox cell for attending
- `.att-input` — input field for bullet count
- `.att-changed` — orange border highlight for modified rows
- `.att-empty` — message when no responses exist
- `.att-actions` — button row (save/back)
- `.btn-back`, `.btn-save`, `.btn-att` — button styles

### Access Control

- Available to **main instructor** of the session
- Available to **both deputies** (new in v4.2.9)
- Deputies have read-only view to session (can print + override attendance) but cannot create, share, or close

---

## 10. Security Model Summary

### Deployment Configuration (v4.0.0+)

- **Execute as**: Me (script owner)
- **Who has access**: Anyone (no Google account required)
- Consequence: `Session.getActiveUser().getEmail()` returns empty for non-owner users
- **Solution**: OTP provides authentication layer for users without Google session

### Authentication Flows

| Route | Method | Handler | Notes |
|-------|--------|---------|-------|
| Trainee Register | Google session (silent) + OTP fallback (hybrid) | `lookupByTZ()` | Email captured silently on first submit |
| Trainee Poll | Google session (silent) + OTP fallback (hybrid) | `lookupByTZ()` | Email captured if missing (via `backfillTraineeEmail()`) |
| Instructor Dashboard | ת.ז. + Google session OR OTP | `checkInstructorAuth(tz)` | TZ entry, then Google or OTP code entry |
| Admin Dashboard | ת.ז. + Google session OR OTP, check `ADMIN_EMAILS` | Same as instructor + email check | Admin-only access |
| Print | Google session (direct) OR OTP gate | `isSessionAuthorizedByTz()` → OTP gate → print token | Session-scoped: main instructor + deputies only |

### Helper Functions (v4.2.3)

- `isOwnerEmail(email)` — checks `OWNER_EMAILS` array (later renamed `isOwnerByTz` in v5.0.0)
- `isAdminByEmail(email)` — checks instructor sheet email column (v5.0.0)
- `isAuthorizedEmail(email)` — delegates to `isOwnerEmail()` or email column match
- `isSessionAuthorized(email, sessionId)` — email matches main instructor OR deputy1 OR deputy2 OR admin
- `isSessionAuthorizedByTz(tz, sessionId)` — TZ-based version of above
- `checkInstructorAuth(tz)` — Google session check with OTP fallback
- `requestInstructorOTP(tz)` / `verifyInstructorOTP(tz, code)` — instructor OTP
- `issuePrintToken(tz, sessionId)` — 60-second access token
- `autoClosePastSessions()` — auto-close task (v4.2.4)
- `notifyAdminSessionEvent()` — email notifications (v4.2.5)
- `getSessionResponses(sessionId)` — fetch session responses (v4.2.9)
- `updateSessionResponse(sessionId, name, attending, bullets)` — update attendance (v4.2.9)

---

## 11. Files Changed

### Overview

v4 evolved incrementally, with most additions to existing files rather than new files:

| File | Changes |
|------|---------|
| **config.gs** | `REQUIRE_LOGIN`, `OWNER_EMAILS`, OTP config (`OTP_TTL_SECONDS`, `OTP_MAX_ATTEMPTS`, `OTP_BLOCK_SECONDS`, `OTP_FROM_EMAIL`, `OTP_FROM_NAME`) |
| **routing.gs** | Print token validation in `doGet()`, new routes for print OTP gate |
| **data.gs** | All new OTP functions, `parseSessionRow()`, session deputy support, `createSession()` / `getInstructorSessions()` mods, instructor auth, attendance override, auto-close, email notifications |
| **pages.gs** | OTP UI in register/poll/instructor pages, print OTP gate page, attendance override panel, updated instructor dashboard |
| **setup.gs** | Trigger installation functions (`installAutoCloseTrigger`, `removeAutoCloseTrigger`) |
| **logo.gs** | Version bump |
| **backup.gs** | No changes in v4 |

### data.gs Additions (Cumulative, v4.0.0–v4.2.9)

- v4.0.0: `backfillTraineeEmail()`, email capture in `addTraineeData()` / `updateTraineeData()`
- v4.1.0: `generateOTP()`, `maskEmail()`, `requestOTP()`, `requestOTPForEmail()`, `verifyOTP()`, `getVerifiedTraineeData()`, OTP rate limiting logic
- v4.2.0: `parseSessionRow()`, `createSession()` mods for deputies, `getInstructorSessions()` with role field
- v4.2.3: `checkInstructorAuth()`, `requestInstructorOTP()`, `verifyInstructorOTP()`, `issuePrintToken()`, `isSessionAuthorizedByTz()`
- v4.2.4: `autoClosePastSessions()`, trigger functions in setup.gs
- v4.2.5: `notifyAdminSessionEvent()` wrapped in try/catch
- v4.2.7: No new functions (admin dashboard rework in pages.gs)
- v4.2.9: `getSessionResponses()`, `updateSessionResponse()`

### pages.gs Additions

- v4.0.0: Email capture in registration form
- v4.1.0: Full OTP UI in `getLookupHtml()`, `getPollHtml()`, client-side handlers for OTP code entry
- v4.2.0: Deputy display in instructor dashboard (names, role badge)
- v4.2.3: `getPrintOtpGateHtml()` — standalone OTP gate page for print access
- v4.2.7: Rework `getAdminDashboardHtml()` — replace stats with active sessions list
- v4.2.9: Attendance override panel (`showAttendanceList()`, `renderAttendanceList()`, `saveAttendanceChanges()`, `hideAttendanceList()`) in instructor dashboard

---

## 12. Migration Checklist

From MULTI_DESIGN.md, items 21–27 (v4.2.x specific):

- [ ] 21. **(v4.2.6)** Fix admin dashboard stats rendering issues
- [ ] 22. **(v4.2.7)** Replace broken admin stats with active sessions list + close buttons
- [ ] 23. **(v4.2.8)** Bug fixes and stability improvements
- [ ] 24. **(v4.2.9)** Implement instructor attendance override: `getSessionResponses()`, `updateSessionResponse()`, attendance panel UI in instructor dashboard
- [ ] 25. **(v4.2.9)** Update deputy role to include attendance override access (not just print)
- [ ] 26. **(v4.2.9)** Update instructor manual to v4.2.9 (`מדריך_למדריך_v429.docx`) — 12 sections including attendance override
- [ ] 27. **(v4.2.9)** Update CONTEXT.md and MULTI_DESIGN.md with all v4.2.x features

---

## 13. Testing Checklist

### Authentication & OTP

- [ ] Trainee registers with Google session → email captured silently
- [ ] Trainee registers without Google session → email entry form → OTP sent → code verification → registration succeeds
- [ ] Trainee poll with OTP fallback → OTP code max 3 attempts → block for 15 minutes
- [ ] Instructor login with Google session → direct access to dashboard
- [ ] Instructor login without Google session → TZ entry → OTP sent → code verification → dashboard access
- [ ] Invalid OTP code → error message, attempt counter
- [ ] OTP code expires after 5 minutes → request new code

### Deputy Instructors

- [ ] Create session with deputy1 & deputy2 → both TZs stored in columns H, I
- [ ] Deputy TZ appears in instructor dashboard → role badge shows "מ"מ"
- [ ] Deputy can click "הדפסה" button → print page renders
- [ ] Deputy cannot click "צור אימון" or "שתף" buttons
- [ ] Main instructor can access session, deputies can access session, unrelated instructor cannot access session

### Print Token

- [ ] Instructor clicks print → checks Google session
- [ ] Valid Google session → print page renders directly
- [ ] No Google session → OTP gate page shown
- [ ] OTP gate → TZ entry → OTP code → verification → redirect with token
- [ ] Print page validates token (60s TTL) → renders if valid
- [ ] Token expires → error message on page load

### Auto-Close

- [ ] Create session with date = yesterday
- [ ] Run `autoClosePastSessions()` manually or wait for daily trigger at 02:00
- [ ] Session status → `סגור`
- [ ] Admin dashboard shows session as closed (or not in active list)

### Attendance Override (v4.2.9)

- [ ] Trainee submits poll response: "כן", 50 bullets
- [ ] Instructor opens attendance override panel on active session
- [ ] Panel shows trainee row: name (read-only), checkbox "כן" (checked), input field (50)
- [ ] Instructor unchecks checkbox → row highlighted orange
- [ ] Instructor changes bullets to 75 → row highlighted orange
- [ ] Instructor clicks "שמור שינויים" → changes saved
- [ ] Print page reflects updated values: "לא" attending, 75 bullets
- [ ] Deputy can also open and modify attendance
- [ ] Closed session → attendance override button unavailable

---

## 14. Known Limitations & Future Improvements

### Limitations in v4

1. **No session persistence** — every page refresh requires re-login (TZ + OTP). Painful for instructors managing sessions all day.
2. **No unprotected API** — global GAS functions callable directly from browser console without auth. `getAllInstructors()`, `getTraineeData()`, etc. are accessible.
3. **Email notifications one-way** — admins notified on session open/close but cannot reply or configure notification preferences.
4. **No trainee suspension** — instructors cannot block problematic trainees from attending. Addressed in v5.0.0.
5. **Single admin email** — notifications sent only to `ADMIN_EMAILS[0]`. All v4 versions support multiple admins but only first one gets emails.

### Addressed in v5.0.0+

- **Session persistence & API security** → planned for v6.0
- **Trainee suspension** → v5.0.0
- **4-tier role system (Owner/Admin/Instructor/Trainee)** → v5.0.0
- **Simplified auth (דא column)** → v5.1.0
- **Mobile zoom fixes** → v5.1.8–5.1.9
- **CSS unification** → v5.2.0

---

## 15. Version Summary

| Version | Focus | Key Additions | Status |
|---------|-------|---------------|--------|
| v4.0.0 | Auth foundation | Email capture, Google session, OTP groundwork | Complete |
| v4.1.0 | Trainee OTP | Hybrid auth, email verification, rate limiting | Complete |
| v4.2.0 | Deputy support | 2 deputies per session, role-based access | Complete |
| v4.2.3 | Instructor OTP | Print token flow, OTP gate page, authorization | Complete |
| v4.2.4 | Auto-operations | Daily auto-close, admin close buttons | Complete |
| v4.2.5 | Notifications | Email alerts to admins on session events | Complete |
| v4.2.7 | Dashboard rework | Replace stats with active sessions list | Complete |
| v4.2.9 | Attendance override | Edit attending & bullets from dashboard | Complete |

**Superseded by**: v5.0.0 (4-tier roles, suspension, admin dashboard rewrite)

---

**Last Updated**: April 2026 | **Reconstructed by**: Claude from MULTI_DESIGN.md and CONTEXT.md | **Status**: COMPLETE & ARCHIVED
