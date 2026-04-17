# Implementation Plan — v5.0.0: Role-Based Access System

**Status: CODE COMPLETE + ITERATING**  
**Base Version: 5.0.0 → Current: 5.0.9**  
**Date: April 2026**  
**Implementation completed: 2026-04-17**

---

## 1. Overview

Introduce a 4-tier role hierarchy and restructure access control accordingly. The goal is to allow trusted instructors to perform administrative tasks (managing trainees, adding instructors, overriding attendance) without giving them access to raw databases — while preserving the system developer's (Owner) full visibility.

### Role Hierarchy (top → bottom)

| Role | Who | Access | Auth Method |
|------|-----|--------|-------------|
| **Owner** | System developer (today's admin) | Everything: all dashboards, raw DB links, debug | `OWNER_EMAILS` array (hardcoded, like today's `ADMIN_EMAILS`) |
| **Admin** | Any instructor with admin flag | Admin dashboard (no DB links), manage instructors, manage trainees, manage sessions | Instructor ת.ז. + Google/OTP, checked against `אדמין` column in instructor sheet |
| **Instructor** | Registered instructor without admin flag | Instructor dashboard: own sessions, attendance override, print | Instructor ת.ז. + Google/OTP (unchanged) |
| **Trainee** | Registered trainee | Registration, poll, edit own data | ת.ז. + Google/OTP (unchanged) |

### Guiding Principles

1. **Reuse existing forms** — the trainee edit interface should reuse `getLookupHtml()` patterns, not reinvent a new form
2. **Minimal disruption** — instructor and trainee flows remain identical unless they're directly affected by a new feature
3. **Lower tier = no higher-tier awareness** — trainee manual never mentions admin; instructor manual never mentions owner
4. **Additive changes** — new columns are appended to existing sheets, nothing is reordered or removed

---

## 2. Data Schema Changes

### 2.1 Instructor Sheet — Add "אדמין" Column

**Current columns (5):**
| Col | Header | Type |
|-----|--------|------|
| A | ת.ז. | Text |
| B | שם מלא | Text |
| C | מ"מ | Text |
| D | טלפון | Text |
| E | אימייל | Text |

**New column (append):**
| Col | Header | Type | Description |
|-----|--------|------|-------------|
| **F** | **אדמין** | **Text** | **"כן" = admin permissions, empty/"לא" = regular instructor** |

**Impact:**
- `getInstructorData(tz)` — read 6 columns instead of 5, return new `admin` field
- `getAllInstructors()` — read 6 columns, include `admin` field
- `setupInstructorSheet()` — add column F header
- New function: `addInstructor(data)` — append row with 6 columns
- New function: `updateInstructor(tz, data)` — update instructor row (name, license, phone, email, admin flag)
- New function: `isAdmin(tz)` — check instructor's admin column (F)

### 2.2 Trainee Source Sheet — Add Status Columns

**Current columns (21):** Timestamp, שם מלא, ת.ז., טלפון, אימייל, then 4 tool groups (4 cols each)

**New columns (append after last tool group):**
| Col | Header | Type | Description |
|-----|--------|------|-------------|
| **V (22)** | **סטטוס** | **Text** | **"פעיל" (default) / "לא פעיל" / "מושעה"** |
| **W (23)** | **סיבת השעיה** | **Text** | **Free text or value from suspension reasons list. Empty if not suspended.** |
| **X (24)** | **תאריך עדכון סטטוס** | **Timestamp** | **When status was last changed by admin** |

**Impact:**
- `lookupByTZ(tz)` — after auth, check status column; block "לא פעיל" entirely; return `{suspended: true, reason: "..."}` for "מושעה"
- `getTraineeData()` — include status and suspension reason in returned objects
- `addTraineeData(data)` — set default status "פעיל" on new registrations
- `submitPollResponse()` — check trainee status before allowing poll submission
- New function: `updateTraineeStatus(tz, status, reason)` — admin sets trainee status
- New function: `searchTrainees(query)` — search by name, tz, or phone for admin UI
- `setupSourceSheet()` — add new column headers

### 2.3 New Sheet: Suspension Reasons (סיבות השעיה)

**New separate spreadsheet** — dedicated spreadsheet for suspension reasons (not a tab in the instructor workbook):

| Col | Header | Type | Description |
|-----|--------|------|-------------|
| A | סיבה | Text | Suspension reason text |
| B | פעיל | Text | "כן" = appears in dropdown, "לא" = archived |

**Constants:**
```javascript
var SUSPENSION_REASONS_SHEET_ID = '...';  // Separate spreadsheet ID
var SUSPENSION_REASONS_TAB = 'סיבות השעיה';
```

**Functions:**
- `getSuspensionReasons()` — returns active reasons as array of strings for dropdown population
- `addSuspensionReason(reason)` — admin adds new reason (appends row)
- `setupSuspensionReasonsSheet()` — creates separate spreadsheet with headers, data validation (כן/לא on active column), and 4 default reasons
- `setupAll()` — updated to call all 5 setup functions and log all URLs

**Default reasons (pre-populated):**
- "רישיון לא בתוקף" (License expired)
- "בעיית בטיחות" (Safety concern)
- "חוסר ציוד מתאים" (Inadequate equipment)
- "סיבה אחרת" (Other)

### 2.4 Config Changes

```javascript
// v5.0.0 — Replace ADMIN_EMAILS with OWNER_EMAILS
var OWNER_EMAILS = ['kommisar@gmail.com'];  // Renamed from ADMIN_EMAILS

// Remove ADMIN_EMAILS — admin is now determined by instructor sheet column F
// Keep backward compat: isAdminEmail() renamed to isOwnerEmail()
```

---

## 3. Auth & Role System Changes

### 3.1 Function Renames & New Functions

| Current (v4.2.9) | New (v5.0.0) | Purpose |
|-------------------|-------------|---------|
| `isAdminEmail(email)` | `isOwnerEmail(email)` | Checks `OWNER_EMAILS` array |
| *(new)* | `isAdminByEmail(email)` | Looks up instructor by email → checks "אדמין" column |
| *(new)* | `isAdminByTz(tz)` | Looks up instructor by ת.ז. → checks "אדמין" column |
| `isAuthorizedEmail(email)` | `isAuthorizedEmail(email)` | Returns true if owner, admin, OR any instructor |
| `isSessionAuthorized(email, sid)` | `isSessionAuthorized(email, sid)` | Add: owner OR admin can access ANY session |
| `isSessionAuthorizedByTz(tz, sid)` | `isSessionAuthorizedByTz(tz, sid)` | Add: admin can access any session |

### 3.2 Route Auth Changes

| Route | v4.2.9 Auth | v5.0.0 Auth |
|-------|------------|-------------|
| `?action=admin` | `isAdminEmail(email)` (Google only) | `isOwnerEmail(email)` OR `isAdminByEmail(email)` (Google), or admin ת.ז.+OTP flow |
| ~~`?action=owner`~~ | ~~*(new)*~~ | ~~`isOwnerEmail(email)`~~ **(REMOVED v5.0.9 — merged into admin dashboard)** |
| `?action=instructor` | Client-side ת.ז.+OTP | Unchanged |
| All others | Unchanged | Unchanged |

### 3.3 Admin Auth Flow

The admin dashboard currently requires a Google email match against `ADMIN_EMAILS`. In v5.0.0:

**Option A (recommended): Reuse instructor OTP flow for admin login**
- Admin route shows same ת.ז. login as instructor dashboard
- After ת.ז. + Google/OTP verification, check `isAdminByTz(tz)` 
- If admin → show admin dashboard
- If not admin but valid instructor → redirect to instructor dashboard or show "אין הרשאה"
- This avoids needing a Google session for admin access (consistent with instructor flow)

**Option B: Keep Google-only for admin**
- Simpler but limits who can be admin (must have Google account linked in browser)
- Given that instructors already support OTP fallback, Option A is more consistent

**Decision: Option A** — admin login uses same ת.ז.+OTP pattern as instructor. The admin dashboard page (`getAdminDashboardHtml`) gets a login step identical to instructor dashboard.

### 3.4 Trainee Status Enforcement Points

Status checks must be inserted at these points:

1. **`lookupByTZ(tz)`** — after finding trainee:
   - Status "לא פעיל" → return `{found: false, message: 'חשבון לא פעיל. פנה למנהל המערכת.'}` (block completely)
   - Status "מושעה" → return `{found: true, suspended: true, reason: '...', name: '...'}` (allow data edit, block poll)

2. **`submitPollResponse(data)`** — before saving:
   - Look up trainee status by name → ת.ז. mapping
   - If "מושעה" or "לא פעיל" → return `{success: false, message: 'לא ניתן לדווח נוכחות...'}`

3. **Poll page UI** — if `lookupByTZ` returns `{suspended: true}`:
   - Show suspension reason in a warning box
   - Show link to edit personal data (register page)
   - Hide session picker and attendance form

4. **Register page (edit mode)** — suspended trainee CAN edit their data:
   - `lookupByTZ` returns suspended status → still populate form
   - Show info banner: "החשבון שלך מושעה. ניתן לעדכן פרטים אישיים. לביטול ההשעיה פנה למנהל."
   - Allow `updateTraineeData()` — no status check on data edit

---

## 4. UI Changes

### 4.1 Owner Panels in Admin Dashboard (v5.0.9 — merged from former `?action=owner`)

~~**Function:** `getOwnerDashboardHtml()`~~ **REMOVED in v5.0.9** — owner features merged into admin dashboard.

When an admin logs into `?action=admin` and their email matches `OWNER_EMAILS` (checked via `isOwnerByTz(tz)`), two additional sections appear in the admin dashboard, tagged with a yellow "בעלים" badge:

1. **גיליונות נתונים** — direct links to all 4 Google Sheets (מאגר מתאמנים, תשובות סקר, מדריכים, לוח אימונים)
2. **אימונים לפי מדריך** — instructor dropdown + filterable sessions table (all/active/closed) with print & close buttons

These panels are wrapped in `#ownerSections` div (hidden by default), shown after `isOwnerByTz()` returns true during `enterAdminDashboard()`.

### 4.2 Redesigned Admin Dashboard (`?action=admin`)

**Function:** `getAdminDashboardHtml()` — completely rewritten

**Login step:** Same pattern as instructor dashboard — ת.ז. input → Google auto-detect or OTP → verify admin flag.

**After login, 4 sections:**

#### Section A: Active Sessions (existing, from current admin dashboard)
- List of active sessions with close buttons
- Print button per session
- **NEW: Attendance override button per session** (reuse `showAttendanceList()` from instructor dashboard)

#### Section B: Instructor Management (NEW)
- **List of instructors** — table showing: name, ת.ז., phone, email, admin badge
- **"הוספת מדריך" (Add Instructor) button** — opens inline form:
  - Fields: שם מלא, ת.ז., מ"מ (dropdown), טלפון, אימייל
  - **Checkbox: "הרשאת ניהול" (Admin permission)** — sets "אדמין" column to "כן"
  - Submit → calls `addInstructor(data)` → refreshes list
- **Edit instructor** — click row or edit icon → opens inline form pre-filled with current data:
  - All fields editable: name, ת.ז., license, phone, email
  - **Admin checkbox** — any admin can toggle any instructor's admin flag (including other admins')
  - Submit → calls `updateInstructor(tz, data)` → refreshes list
- **Note:** Delete is NOT available — deactivating an instructor is done by owner via spreadsheet if needed.

#### Section C: Trainee Management (NEW)
- **Search bar** — search by name, ת.ז., or phone
  - Calls `searchTrainees(query)` → returns matching trainees (max 20)
  - Results shown as cards: name, ת.ז., status badge
- **OR dropdown** — select from full trainee list (sorted alphabetically)
- **On trainee selection** → show trainee detail card:
  - **Personal data section** — reuse `getLookupHtml()` field layout (name, phone, tools) as READ-ONLY display
  - **"עריכת פרטים" button** — opens register page in new tab pre-filled: `?action=register&tz={tz}&admin=1`
    - The `admin=1` parameter triggers admin edit mode: bypasses OTP (admin already authenticated), shows all fields editable
    - Reuses the EXISTING register form — no new form needed
  - **Status management section:**
    - Current status badge (color-coded: green=פעיל, gray=לא פעיל, yellow=מושעה)
    - **Status dropdown:** פעיל / לא פעיל / מושעה
    - **If "מושעה" selected:** show suspension reason interface:
      - Dropdown populated from `getSuspensionReasons()` (dynamic list)
      - Free-text input for custom reason
      - Both can be used — dropdown pre-fills the text field, admin can modify
    - **"עדכן סטטוס" button** → calls `updateTraineeStatus(tz, status, reason)`

#### Section D: System Links (existing, minus DB links)
- Registration page link
- Poll page link  
- Instructor dashboard link
- **NO spreadsheet links** (those are owner-only)

### 4.3 Landing Page & Admin Entry Point

**Landing page cards — UNCHANGED (3):**
1. "מדריך? כניסה לניהול אימונים" → `?action=instructor`
2. "מתאמן? רישום" → `?action=register`
3. "מתאמן? סקר נוכחות" → `?action=poll`

**No admin card on the landing page.** Admin access is discoverable only from within the instructor dashboard.

**Admin entry via instructor page:**
- After instructor login, if the instructor has admin permission (column F = "כן"), show a button/link: **"לוח ניהול →"** that navigates to `?action=admin`
- This keeps the landing page clean and avoids exposing admin functionality to non-instructors
- The button appears only after successful ת.ז.+OTP login, so admin status is verified server-side

**Owner access:** Owner logs into admin dashboard (`?action=admin`) like any admin — owner-only panels appear automatically after login if their email matches `OWNER_EMAILS`.

### 4.4 Register Page — Admin Edit Mode

When accessed with `?action=register&tz=XXXXX&admin=1`:

1. The page checks if the current session is admin-authenticated (via a server call or token)
2. If admin: auto-fills ת.ז., loads trainee data, skips OTP, enters edit mode
3. All fields editable (same as regular edit mode)
4. **New fields visible in admin mode only:**
   - Status display (read-only badge — status changes happen in admin dashboard, not here)
5. Save calls `updateTraineeData()` as usual
6. After save, redirect back to admin dashboard or show success

**Why reuse register page:** The register page already has complete trainee editing UI with validation, tool groups, etc. Building a separate admin edit form would duplicate ~200 lines of form HTML and all validation logic.

### 4.5 Poll Page — Suspension Handling

When `lookupByTZ()` returns `{suspended: true, reason: '...'}`:

```
┌──────────────────────────────────────┐
│  ⚠️ החשבון שלך מושעה                │
│                                      │
│  סיבה: [reason text]                 │
│                                      │
│  לא ניתן לדווח נוכחות בזמן השעיה.   │
│  לביטול ההשעיה פנה למנהל.            │
│                                      │
│  [עריכת פרטים אישיים →]             │
└──────────────────────────────────────┘
```

The session picker and attendance form are NOT shown.

When status is "לא פעיל" — `lookupByTZ` returns `{found: false}` with a generic message. The trainee cannot even reach the edit page via poll lookup.

---

## 5. Function Inventory — New & Modified

### 5.1 New Functions (data.gs)

| Function | Purpose |
|----------|---------|
| `isOwnerEmail(email)` | Checks `OWNER_EMAILS` array (renamed from `isAdminEmail`) |
| `isAdminByEmail(email)` | Looks up instructor by email → checks column F "אדמין" = "כן" |
| `isAdminByTz(tz)` | Looks up instructor by ת.ז. → checks column F "אדמין" = "כן" |
| `addInstructor(data)` | Appends new instructor row (6 cols). Validates: no duplicate ת.ז., required fields. |
| `updateInstructor(tz, data)` | Updates existing instructor row (name, license, phone, email, admin flag). Admin can edit any instructor. |
| `searchTrainees(query)` | Searches source sheet by name/tz/phone. Returns max 20 results with status. |
| `updateTraineeStatus(tz, status, reason)` | Sets trainee status column + reason + timestamp. Admin-only. |
| `getTraineeStatusData(tz)` | Returns trainee's status, reason, and last status update date. |
| `getSuspensionReasons()` | Returns active reasons from suspension reasons tab. |
| `addSuspensionReason(reason)` | Appends new reason to suspension reasons tab. |
| `setupSuspensionReasonsSheet()` | Creates/initializes the suspension reasons tab. |
| `checkAdminAuth(tz)` | Like `checkInstructorAuth(tz)` but also verifies admin flag. |
| `requestAdminOTP(tz)` | Like `requestInstructorOTP(tz)` but verifies admin flag first. |
| `verifyAdminOTP(tz, code)` | Like `verifyInstructorOTP(tz, code)` but verifies admin flag. |

### 5.2 Modified Functions

| Function | Change |
|----------|--------|
| `isAdminEmail(email)` | **Renamed to `isOwnerEmail(email)`**. All call sites updated. |
| *(new)* `updateInstructorAdmin(tz, isAdmin)` | **Replaced by `updateInstructor(tz, data)`** — full instructor edit, not just admin toggle. |
| `isAuthorizedEmail(email)` | Check `isOwnerEmail` instead of `isAdminEmail`. Also check `isAdminByEmail`. |
| `isSessionAuthorized(email, sid)` | Owner OR admin can access any session (not just main/deputy). |
| `isSessionAuthorizedByTz(tz, sid)` | Admin (by tz) can access any session. |
| `getInstructorData(tz)` | Read 6 cols, return `{..., admin: true/false}`. |
| `getAllInstructors()` | Read 6 cols, include `admin` field. |
| `lookupByTZ(tz)` | After auth: check status column. Block "לא פעיל", flag "מושעה". |
| `submitPollResponse(data)` | Check trainee status before saving. |
| `addTraineeData(data)` | Set default status "פעיל" in new column. |
| `getTraineeData()` | Include status fields in returned objects. |
| `notifyAdminSessionEvent(...)` | Send to `OWNER_EMAILS` (not `ADMIN_EMAILS`). |
| `autoClosePastSessions()` | Error emails to `OWNER_EMAILS[0]`. |

### 5.3 New Pages (pages.gs)

| Function | Purpose |
|----------|---------|
| ~~`getOwnerDashboardHtml()`~~ | ~~Owner dashboard with DB links~~ **(REMOVED v5.0.9 — merged into admin)** |
| `getAdminDashboardHtml()` | **Rewritten.** Login step + 4 sections (sessions, instructors, trainees, links) + owner-only panels (DB links, sessions-by-instructor) shown via `isOwnerByTz()` (v5.0.9). |

### 5.4 Modified Pages

| Function | Change |
|----------|--------|
| `getLandingHtml()` | **No change** — landing page stays 3 cards, no admin card |
| `getLookupHtml(prefillTz)` | Support `admin=1` query param: skip OTP, auto-load, admin-mode banner |
| `getPollHtml(sessionId)` | Handle `{suspended: true}` from lookup — show warning box, hide form |
| `getInstructorDashboardHtml()` | If instructor has admin flag, show "לוח ניהול →" button/link to `?action=admin` (primary admin entry point) |

### 5.5 Routing Changes (routing.gs)

```javascript
// Owner route REMOVED in v5.0.9 — owner panels merged into admin dashboard

// Modified route — admin now uses client-side auth (like instructor)
// Owner-only panels shown after login if isOwnerByTz() returns true
if (action === 'admin') {
  return HtmlService.createHtmlOutput(getAdminDashboardHtml())...;
}
```

---

## 6. Implementation Phases

### Phase 1: Data Schema (config.gs, data.gs, setup.gs) ✅ DONE
1. Rename `ADMIN_EMAILS` → `OWNER_EMAILS` in config.gs
2. Add suspension reasons spreadsheet setup in setup.gs (`setupSuspensionReasonsSheet`)
3. Add instructor column F "אדמין" in setupInstructorSheet (with data validation)
4. Add trainee columns V-X (סטטוס, סיבת השעיה, תאריך עדכון) in setupSourceSheet (with data validation)
5. Implement all new data functions (12+ new functions in data.gs)
6. Update all existing functions to read new columns
7. **Version bump: v5.0.0 across all 7 files**

### Phase 2: Auth System (data.gs, routing.gs) ✅ DONE
1. Rename `isAdminEmail` → `isOwnerEmail` (all call sites including backup.gs)
2. Implement `isAdminByEmail`, `isAdminByTz`
3. Implement admin OTP flow (`checkAdminAuth`, `requestAdminOTP`, `verifyAdminOTP`)
4. Update `isAuthorizedEmail`, `isSessionAuthorized`, `isSessionAuthorizedByTz`
5. ~~Add `?action=owner` route~~ (removed in v5.0.9 — merged into admin)
6. Modify `?action=admin` route to remove server-side email gate

### Phase 3: Owner Dashboard (pages.gs) ✅ DONE → MERGED in v5.0.9
1. ~~Renamed current `getAdminDashboardHtml()` → `getOwnerDashboardHtml()`~~ (removed in v5.0.9)
2. Owner panels (DB links, sessions-by-instructor) now embedded in admin dashboard, shown via `isOwnerByTz()`

### Phase 4: Admin Dashboard — Sessions & Instructor Management (pages.gs) ✅ DONE
1. Rewrote `getAdminDashboardHtml()` with login step (ת.ז. + OTP via admin-specific auth)
2. Section A: active sessions with close, print, and attendance override buttons
3. Section B: instructor list + add/edit instructor form with admin checkbox
4. `addInstructor(data)` and `updateInstructor(tz, data)` in data.gs
5. Section D: system links (no DB links)

### Phase 5: Admin Dashboard — Trainee Management (pages.gs, data.gs) ✅ DONE
1. Section C: trainee search UI (`doSearchTrainees` → `searchTrainees`)
2. Trainee detail card with status management and trainee data display
3. Suspension reasons dropdown (dynamic from `getSuspensionReasons()`)
4. `updateTraineeStatus()` integration
5. Admin edit mode link to register page (`?action=register&tz=XXX&admin=1`)

### Phase 6: Trainee Status Enforcement (data.gs, pages.gs) ✅ DONE
1. `lookupByTZ()` — status checks (block "לא פעיל", flag "מושעה")
2. `submitPollResponse()` — status checks via `getTraineeStatusData`
3. Poll page — suspension warning UI with reason and edit link
4. Register page — suspended trainee info banner (allows data edit)
5. Register page — admin edit mode (`adminMode` parameter)

### Phase 7: Navigation & Admin Entry Point ✅ DONE
1. **No landing page changes** — landing page stays 3 cards
2. Admin entry via instructor dashboard: purple "לוח ניהול →" button (visible only if `currentInstructor.admin`)
3. ~~Owner dashboard: accessible only via hidden URL (`?action=owner`)~~ **(merged into admin dashboard in v5.0.9)**

### Post-v5.0.0 Patches (v5.0.1–v5.0.9) ✅ DONE

These incremental fixes and enhancements were applied after the initial v5.0.0 code complete:

| Version | Changes |
|---------|---------|
| v5.0.1 | `SpreadsheetApp.flush()` in all 5 setup functions — fixes deferred errors on Google Sheets "Table" typed columns |
| v5.0.2 | Data validation dropdowns on all spreadsheets: instructor admin (כן/לא), response attending (כן/לא), source status (פעיל/לא פעיל/מושעה), session status (פעיל/סגור/ארכיון) |
| v5.0.3 | Admin-mode trainee edit fix: `doSearch()` routes to `getVerifiedTraineeData(tz)` when `ADMIN_MODE=true`, bypassing OTP auth that blocked data loading in new tabs |
| v5.0.4 | Instructor dashboard layout: vertical session cards with `flex-direction:column`, compact `.btn-small` buttons, same-sized "אימון חדש" and "לוח ניהול" top buttons |
| v5.0.5 | Admin suspension management UI: suspended trainees list with name/tz/reason/resolve button at top; collapsible reasons panel with all defined reasons + add/toggle functionality. Uses `data-idx` attribute pattern for button handlers. New functions: `getSuspendedTrainees()`, `getAllSuspensionReasons()`, `toggleSuspensionReason()` |
| v5.0.6 | Response count `(מגיעים: X / Y)` shown next to status badge in instructor dashboard session headers for ALL sessions (active + closed), not just active |
| v5.0.7 | Fix: `doUpdateStatus()` success handler now also calls `loadSuspendedList()` to refresh השעיות section after trainee status update |
| v5.0.8 | `withLoading(btn, callback)` loading indicators on all async buttons across instructor dashboard, admin dashboard, and print OTP gate pages. Two patterns: `event.target.closest("button")` for direct onclick, `this` passed from dynamically generated buttons |
| v5.0.9 | Merge owner dashboard into admin: owner-only panels (DB links, sessions-by-instructor) shown via `isOwnerByTz()`. Remove `getOwnerDashboardHtml()` and `?action=owner` route. Backup folder moved to project folder as "Backups". `setupAll()` installs both triggers (backup + auto-close) |

### Phase 8: Manuals (3 documents) — NOT YET STARTED
1. **מדריך_למנהל_v500.docx** — Admin manual (12+ sections):
   - Login, session management, instructor management, trainee management, status management, suspension reasons, FAQ
   - Same docx format (see CONTEXT.md §14)
   - No mention of owner/developer features or database links
2. **מדריך_למדריך_v500.docx** — Update instructor manual:
   - Remove any admin references
   - Keep sections 1-12, update version
   - No mention of admin dashboard, trainee management, or owner
3. **מדריך_למתאמן_v500.docx** — New trainee manual:
   - Registration, poll attendance, editing personal data, suspension info
   - No mention of instructors, admin, sessions management, or system internals
   - Focus on: how to register, how to report attendance, what to do if suspended

---

## 7. Migration Checklist

### Code Implementation (DONE)
- [x] Add column F "אדמין" header to instructor sheet (via setupInstructorSheet)
- [x] Add columns V-X to trainee source sheet (via setupSourceSheet) — with data validation on סטטוס column
- [x] Create "סיבות השעיה" separate spreadsheet setup function (setupSuspensionReasonsSheet) — with default reasons and active/inactive validation
- [x] Update `ADMIN_EMAILS` → `OWNER_EMAILS` in config.gs
- [x] Add `SUSPENSION_REASONS_SHEET_ID` and `SUSPENSION_REASONS_TAB` constants
- [x] Implement all Phase 1-7 code changes across all 7 .gs files
- [x] Version bump to v5.0.0 in all files (config, data, routing, pages, backup, setup, logo)

### Pre-Deployment (partially done)
- [x] Run `setupAll()` to create new spreadsheets (or manually add columns to existing sheets)
- [x] Copy new Suspension Reasons spreadsheet ID → `SUSPENSION_REASONS_SHEET_ID` in config.gs (`1E3htH5udGPwgnqvOC6cJbtEjG0cva1EdDG_v1SByENQ`)
- [ ] Mark existing admin users with "כן" in column F of instructor sheet
- [ ] Backfill status "פעיל" for all existing trainees in column V
- [ ] Deploy new version to Apps Script

### Testing (TODO)
- [ ] Test: owner panels visible in admin dashboard after owner login (DB links + sessions-by-instructor)
- [ ] Test: admin login via OTP → admin dashboard (`?action=admin`)
- [ ] Test: admin adds instructor with admin flag
- [ ] Test: admin edits existing instructor data and toggles admin flag
- [ ] Test: admin searches trainee → views detail → changes status
- [ ] Test: suspended trainee tries poll → sees warning
- [ ] Test: suspended trainee edits data via register page → succeeds
- [ ] Test: inactive trainee tries anything → blocked
- [ ] Test: instructor without admin flag cannot access admin dashboard
- [ ] Test: admin can override attendance on any active session
- [ ] Test: admin entry via instructor dashboard "לוח ניהול →" button

### Documentation (TODO)
- [ ] Create admin manual (מדריך_למנהל_v500.docx)
- [ ] Update instructor manual (מדריך_למדריך_v500.docx)
- [ ] Create trainee manual (מדריך_למתאמן_v500.docx)
- [ ] Update CONTEXT.md with all new schemas, functions, routes
- [ ] Update MULTI_DESIGN.md with role architecture

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking existing instructor flow | Instructor dashboard code is untouched except for minor "admin link" addition |
| Breaking existing trainee flow | `lookupByTZ` changes are additive — new status check happens AFTER existing auth |
| Admin OTP adds complexity | Reuse exact instructor OTP infrastructure — same cache keys pattern, same UI |
| Spreadsheet column index drift | New columns are APPENDED (not inserted) — existing column indices unchanged |
| Owner loses access if ADMIN_EMAILS rename missed | Global search-replace; `isOwnerEmail` is a direct rename of `isAdminEmail` |
| Suspension reason list management | Start with hardcoded defaults; admin can add via UI; no delete (only archive) |

---

## 9. What Does NOT Change

- Trainee registration form fields (name, tz, phone, tools) — unchanged
- Poll submission flow for active trainees — unchanged
- Instructor dashboard session CRUD — unchanged
- Print page layout — unchanged
- Backup system — unchanged
- Auto-close trigger — unchanged (error emails go to `OWNER_EMAILS[0]`)
- Session event emails — go to `OWNER_EMAILS` (renamed constant)
- OTP email template — unchanged
- All existing CSS/dark theme — unchanged

---

## 10. Design Decisions (Resolved)

1. **Suspension reasons tab location:** ✅ **Separate spreadsheet** — dedicated `SUSPENSION_REASONS_SHEET_ID` constant.

2. **Admin can edit instructor data?** ✅ **Yes** — admin can edit all instructor fields (name, license, phone, email) AND toggle admin flag on any instructor.

3. **Can admin change another admin's admin flag?** ✅ **Yes** — any admin can change any instructor's admin flag, including other admins'.

4. **Admin session access scope:** ✅ **Any active session** — admin can close and override attendance on any active session.

5. **Owner dashboard link visibility:** ✅ **Merged into admin dashboard (v5.0.9)** — owner-only panels (DB links, sessions-by-instructor) appear automatically in admin dashboard when logged-in admin's email matches `OWNER_EMAILS`. No separate route needed.

6. **Admin entry point:** ✅ **Via instructor page** — no admin card on landing page. Instructors with admin flag see a "לוח ניהול →" button in the instructor dashboard after login.
