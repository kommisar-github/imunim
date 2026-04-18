# Roadmap — אימוני ירי

**Created: 2026-04-17**
**Current Version: 5.2.0**

---

## Pre-v3 — Single-Instructor Era ✅

Single-file architecture (`code.gs`), one instructor hardcoded via `INSTRUCTOR_TZ` constant. No sessions concept — one active poll at a time, with manual "refresh attending list" and "reset poll" operations. Admin dashboard was a simple overview with spreadsheet links and aggregated stats.

| Version | Key Changes |
|---------|-------------|
| v2.13.8 | Last single-instructor release. 3 spreadsheets (trainee DB, poll responses, instructors). Pages: dashboard, register, poll, print. `REQUIRE_LOGIN` toggle (disabled). Rate limiting. Reference file: `Imun/code.gs`. |

---

## v3.0.0–v3.0.15 — Multi-Instructor Refactor ✅

Introduced session-based architecture: sessions spreadsheet (4th sheet), per-session poll responses via session ID, instructor dashboard with session management. Landing page added as public entry point. Removed `doRefreshAttending()` and `doResetPollResponses()` — print page now reads directly from poll responses filtered by session ID.

| Version | Key Changes |
|---------|-------------|
| v3.0.0 | Multi-instructor refactor: sessions sheet, `generateSessionId()`, `createSession()`, `closeSession()`, per-session poll filtering, landing page, instructor dashboard, admin dashboard rework. Monolithic `code_multi.gs`. |
| v3.0.4 | Split `code_multi.gs` (1525 lines) into 6 files: config.gs, routing.gs, data.gs, pages.gs, setup.gs, logo.gs. Reference file: `Imun/code_multi.gs`. |
| v3.0.15 | Last pre-security release. Bug fixes and stabilization. |

---

## v4.0.0–v4.2.9 — Security + Deputies + Attendance Override ✅

Added authentication layers (Google session, OTP), deputy instructor support, automated session management, and instructor attendance override.

| Version | Key Changes |
|---------|-------------|
| v4.0.0 | Security: `REQUIRE_LOGIN` flag, email column (E) on trainee sheet, Google session auth, `ADMIN_EMAILS` array |
| v4.1.0 | Trainee OTP hybrid auth: TZ → email lookup → send OTP → verify. Fallback for non-Google-session browsers |
| v4.2.0 | Deputy instructors (מ"מ): up to 2 per session (columns H, I on sessions sheet), `parseSessionRow()`, deputy role with print access |
| v4.2.3 | Instructor OTP auth, print token flow (60s UUID via CacheService), print OTP gate page, `checkInstructorAuth()`, `isSessionAuthorizedByTz()` |
| v4.2.4 | Auto-close past sessions (daily trigger ~02:00 Israel time), admin close button on active sessions |
| v4.2.5 | Session event email notifications to admins on open/close |
| v4.2.7 | Admin dashboard: active sessions list with close buttons replaces broken aggregated stats view |
| v4.2.9 | Instructor attendance override: `getSessionResponses()`, `updateSessionResponse()`, edit attending status + bullet count from dashboard. Deputy role expanded to include attendance override. Instructor manual updated. |

---

## v5.0.0–v5.0.12 — 4-Tier Role System ✅

Full admin dashboard rewrite: owner/admin/instructor/trainee roles, suspension management, instructor CRUD, trainee status, simplified auth, documentation, manuals.

| File | Lines | Key Changes |
|------|-------|-------------|
| config.gs | 33 | `OWNER_EMAILS` (was `ADMIN_EMAILS`), `SUSPENSION_REASONS_SHEET_ID`, suspension reasons constants |
| data.gs | ~1665 | 20+ new functions, ~12 modified — admin auth, trainee status, instructor CRUD, suspension reasons, `isOwnerByTz()` |
| routing.gs | ~121 | Modified `?action=admin` (client-side auth), admin edit mode, `?action=owner` removed (v5.0.9) |
| pages.gs | ~1280 | Rewritten admin dashboard (4 sections + owner panels), suspension handling in poll/register, withLoading |
| setup.gs | ~305 | `setupSuspensionReasonsSheet`, status cols, admin col, data validation, `setupAll()` installs triggers |
| backup.gs | ~144 | Backup folder to project subfolder (v5.0.9) |
| logo.gs | ~110KB | Version bump |

### Patch History

| Version | Key Changes |
|---------|-------------|
| v5.0.1 | `SpreadsheetApp.flush()` in all setup functions for Table typed-column compatibility |
| v5.0.2 | Data validation dropdowns on all 4 data spreadsheets |
| v5.0.3 | Admin-mode trainee edit: `getVerifiedTraineeData()` bypasses OTP auth |
| v5.0.4 | Instructor dashboard layout: vertical cards, compact buttons |
| v5.0.5 | Admin suspension UI: suspended trainees list, resolve button, collapsible reasons panel with add/toggle |
| v5.0.6 | Response count `(מגיעים: X / Y)` next to status badge for all sessions |
| v5.0.7 | Fix: השעיות section refresh after trainee status update in admin dashboard |
| v5.0.8 | `withLoading(btn, callback)` loading indicators on all async buttons (instructor, admin, print OTP gate) |
| v5.0.9 | Merge owner dashboard into admin (owner-only panels via `isOwnerByTz()`), remove `?action=owner` route, backup folder to project folder, `setupAll()` installs triggers |
| v5.0.10 | Add 5th spreadsheet link to owner panel, standardize TZ entry pages, standardize all button loading |
| v5.0.11 | Fix TZ pane positioning, hide instructor header until login, add `.btn:disabled` CSS |
| v5.0.12 | Fix `updateTraineeData()` preserving status/suspension columns, gate debug route behind owner email |

### Pre-Deployment Steps (v5.0.12)

1. ~~**Run `setupAll()`**~~ ✅ Done
2. ~~**Copy Suspension Reasons spreadsheet ID**~~ ✅ Done
3. **Mark admin users** — set "כן" in column F (אדמין)
4. **Backfill trainee status** — set "פעיל" in column V (סטטוס)
5. **Deploy new version**

### Documentation ✅

All manuals complete: instructor (Hebrew + English), admin (Hebrew), trainee (Hebrew). See `doc/DOC_GUIDELINES.md` for specs.

---

## v5.1.0–v5.2.0 — Mobile GUI + Simplified Auth + CSS Unification ✅

### Mobile Touch-Up ✅

GAS iframes ignore `<meta viewport>` and use a 980px virtual viewport on mobile, breaking all standard responsive techniques. Solved via CSS `zoom` using `screen.width` vs `window.innerWidth` comparison.

| Version | Approach | Result |
|---------|----------|--------|
| v5.1.0 | CSS `@media(max-width:1024px)` | ❌ GAS iframe always 980px |
| v5.1.2 | JS `screen.width` detection | ❌ Caching issues |
| v5.1.4 | UA-based desktop detection | ❌ "Request Desktop Site" spoofs UA |
| v5.1.5 | `@media(hover:hover)` | ❌ Samsung firmware bug |
| v5.1.6 | `@media(min-width:1200px)` | ❌ Desktop Site inflates viewport |
| v5.1.8 | **CSS zoom via `screen.width` vs `window.innerWidth`** | ✅ Works everywhere |
| v5.1.9 | Fix PC false positive, admin conditional zoom | ✅ Final fix |

### Simplified Auth ("דלת אחורית") ✅ (v5.1.0)

Hidden per-trainee flag (`דא` column Y). When `כן`, non-Gmail trainees skip OTP — TZ-only login. No UI, no admin visibility, owner-only knowledge.

### CSS Unification ✅ (v5.2.0)

Extracted shared CSS into `getBaseCSS()` and zoom into `getZoomScript(desktopMaxWidth, adminFlag)`. All 5 main pages use shared base + page-specific overrides. Created `doc/GUI_GUIDELINES.md`.

### Patch History

| Version | Key Changes |
|---------|-------------|
| v5.1.0 | Landing top-align, mobile containers, instructor button sizing, simplified auth דא |
| v5.1.1 | Raised mobile breakpoint to 1024px |
| v5.1.2 | Replace CSS @media with JS screen.width detection |
| v5.1.3 | Add `target="_blank"` to admin link in instructor dashboard |
| v5.1.4 | Mobile-first CSS + UA-based desktop detection |
| v5.1.5 | Switched to `@media(hover:hover)` — broken by Samsung bug |
| v5.1.6 | Switched to `@media(min-width:1200px)` — broken by Desktop Site |
| v5.1.7 | Removed all @media desktop overrides |
| v5.1.8 | **Root cause found.** CSS zoom fix via screen.width/innerWidth |
| v5.1.9 | Fix PC zoom (`Math.min` → `screen.width`), admin conditional zoom, register visual match |
| v5.2.0 | **CSS unification:** `getBaseCSS()`, `getZoomScript()`, GUI_GUIDELINES.md |

---

## v6 — Session Persistence + API Security (Planned)

**Design doc:** `doc/PLAN_v6.md`

### Problem

1. **No session persistence** — every page refresh requires re-login (TZ + OTP). Painful for instructors using the dashboard all day.
2. **Unprotected API** — all global GAS functions callable from browser console via `google.script.run`. Anyone can call `getAllInstructors()`, `getTraineeData()`, or `getVerifiedTraineeData(tz)` without auth.

### Solution

Server-side session tokens via `CacheService` (2hr TTL) + `sessionStorage` on client. After auth, server creates a UUID token. Client stores it and passes it with every `google.script.run` call. Sensitive functions validate the token and check the caller's role before returning data. On page refresh, the stored token restores the session.

### Rollout (role by role)

| Version | Scope | What ships |
|---------|-------|-----------|
| v6.0.0 | Foundation | `createUserSession`, `validateUserSession`, `destroyUserSession`, `requireAuth`, `getSessionScript()`, config constants. No behavioral changes. |
| v6.0.1 | Admin | Session persistence + logout + 12 admin/owner functions gated + 2 soft-gated. Admin-edit token for register cross-tab. |
| v6.0.2 | Instructor | Session persistence + logout + 8 instructor functions gated. Soft gates promoted to hard. `getInstructorData` split (limited data pre-login). |
| v6.0.3 | Poll | Session persistence + logout + 3 trainee-level functions gated. |
| v6.0.4 | Register | Session persistence + logout + `getTraineeDataBySession` for safe self-data access. |
| v6.0.5 | Cleanup | Final audit, all soft gates removed, version bump, docs + manuals updated. |

### Backward Compatibility

Functions called by not-yet-updated pages use **soft gates** during transition (accept token if present, allow without). Promoted to hard gates once all callers pass tokens.

| Function | Soft gate | Hard gate | Called by |
|----------|-----------|-----------|-----------|
| `getAllInstructors` | v6.0.1 | v6.0.2 | Admin + Instructor |
| `getInstructorData` | v6.0.1 | v6.0.2 | Admin + Instructor |

### Files Changed (cumulative)

| File | Changes | Est. Lines |
|------|---------|-----------|
| config.gs | `SESSION_TTL_SECONDS`, `SESSION_KEY_PREFIX`, version bumps | +2 |
| data.gs | 4 session functions, `requireAuth`, guards on ~23 functions, `getTraineeDataBySession`, `issueAdminEditToken`, `getInstructorData` split | +130 |
| pages.gs | `getSessionScript()`, auto-restore + token passing + logout on 4 pages | +155 |
| routing.gs | Pass admin-edit token in register URL | +5 |
| **Total** | | **~292 lines** |

Not changed: setup.gs, logo.gs, backup.gs. Not changed pages: Landing, Print, Print OTP Gate.

### Testing (per-phase checklists in PLAN_v6.md)

Cross-phase integration tests after v6.0.5:

- [ ] Admin in tab 1, instructor in tab 2 → independent sessions
- [ ] Trainee token → admin functions → rejected
- [ ] Token expiry → next call triggers reload to TZ entry
- [ ] Mobile: persistence + zoom on restore
- [ ] All existing flows work during rollout (pages not yet updated)

---

## Future Considerations

Not planned for any current version:

- **Cross-tab sessions** — `localStorage` with explicit logout handling
- **Token refresh / sliding expiry** — extend TTL on each validation call
- **Form state persistence** — save form inputs to sessionStorage alongside token
- **"Remember me" mode** — `localStorage` + longer TTL for trusted devices
- **Session activity log** — token creation/validation tracking
- **Rate limiting on public functions** — prevent TZ enumeration
- **Instructor deactivation UI** — admin can deactivate (currently spreadsheet-only)
- **Audit log** — track admin actions and status changes
- **Bulk status operations** — admin selects multiple trainees at once
- **Suspension expiry** — auto-reactivate after a set period
- **Dashboard analytics** — attendance rates, trainee metrics, instructor workload
- **Email notifications** — notify trainee on status change
