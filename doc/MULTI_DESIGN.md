# Multi-Instructor Support — Implementation Design

**Status: IMPLEMENTED — v5.2.0 (April 2026 — 4-Tier Role System + Suspension Management + Deputy Support + OTP Auth + Simplified Auth + Unified CSS + Mobile Zoom Fix + Backups + Auto-Close)**

## Goal

Allow multiple instructors to independently advertise training dates, manage their own trainee attendance lists, and print per-instructor per-date attendance sheets. The trainee database (מאגר מתאמנים) remains shared — trainees register once and can attend any instructor's session.

## Current Architecture (Single Instructor)

- One shared poll sheet (`Form Responses 1`) — all responses mixed together
- One attendance sheet generated per refresh (overwrites previous)
- Dashboard is admin-only (`ADMIN_EMAILS` array — supports multiple admins)
- Instructor sheet exists with multiple instructors but only used for dashboard dropdown selection
- `INSTRUCTOR_TZ` constant used as default instructor
- Poll page has no concept of "which training session"

## Key Architectural Simplification: Eliminating Refresh & Reset

With per-session data, two current dashboard operations become unnecessary:

**"רענון רשימת מגיעים" (Refresh Attending) — REMOVED**
Currently this reads all poll responses, cross-references the trainee database, and generates a formatted attendance sheet. In the new design, the print page can do this directly — it reads poll responses filtered by session ID and pulls trainee details on the fly. There is no need for a separate "attending" sheet as an intermediate artifact. The print page IS the attendance report.

**"איפוס הסקר לאימון הבא" (Reset Poll) — REMOVED**
Currently this archives the attendance sheet and clears all poll responses to prepare for the next session. With per-session data, each session's responses are naturally isolated by session ID. When a session is closed/archived, its responses stay in the sheet but are simply no longer active. No deletion or clearing needed. Old responses don't interfere because new sessions have new session IDs.

**What replaces them:**
- **Refresh** → Print page reads directly from poll responses (filtered by session ID) + trainee database. Always up to date, no manual refresh step.
- **Reset** → Instructor clicks "סגור אימון" to mark the session as closed. That's it. No data is deleted or moved.

**Functions removed:**
- `doRefreshAttending()` — no longer needed
- `doResetPollResponses()` — no longer needed
- `refreshAttending()` — editor convenience wrapper, removed
- `resetPollResponses()` — editor convenience wrapper, removed

**Functions simplified:**
- `doGetStatus(sessionId)` — reads poll responses directly (filtered by session ID), no separate attending sheet
- `getPrintHtml(sessionId)` — builds attendance table directly from poll responses + trainee DB lookup (absorbs the logic that was in `doRefreshAttending`)

**Sheet cleanup:**
- The "סקר נוכחות וסיכום מגיעים" sheet in the response spreadsheet is no longer generated. Can be deleted after migration.
- Date-named archive sheets are no longer created. Historical data lives in the poll responses sheet tagged by session ID.

---

## New Concept: Training Sessions

A **session** = one instructor + one date. Each session has its own poll responses and attendance list. Sessions are stored in a new spreadsheet.

---

## Implementation Plan

### Phase 1: Sessions Sheet & Constants

**New constant:**
```javascript
var SESSIONS_SHEET_ID = '...'; // New spreadsheet for training sessions
var SESSIONS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/' + SESSIONS_SHEET_ID + '/edit';
```

**New spreadsheet: "אימוני ירי - לוח אימונים"**

Sheet tab: "אימונים"

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| A | מזהה אימון | Text | Auto-generated: `YYYYMMDD-{instructorTz}` (e.g., `20260320-318253233`) |
| B | תאריך אימון | Date | Training date (dd/mm/yyyy) |
| C | מדריך ת.ז. | Text | Main instructor ת.ז. (foreign key to instructor sheet) |
| D | מדריך שם | Text | Main instructor name (denormalized for display) |
| E | סטטוס | Text | `פעיל` / `סגור` / `ארכיון` |
| F | הערות | Text | Optional notes (location, time, special instructions) |
| G | נוצר בתאריך | Timestamp | When the session was created |
| **H** | **מ"מ 1 ת.ז.** | **Text** | **NEW (v4.2.0): Deputy 1 instructor ת.ז. (optional, foreign key to instructor sheet)** |
| **I** | **מ"מ 2 ת.ז.** | **Text** | **NEW (v4.2.0): Deputy 2 instructor ת.ז. (optional, foreign key to instructor sheet)** |

**New function: `setupSessionsSheet()`**
- Creates the spreadsheet with headers, RTL, bold, plain text for ת.ז. column
- Logs the new sheet ID for pasting into constants
- Pattern: same as existing `setupInstructorSheet()`

**New function: `generateSessionId(date, instructorTz)`**
- Returns `YYYYMMDD-{instructorTz}` string
- Example: `generateSessionId('20/03/2026', '318253233')` → `'20260320-318253233'`

---

### Phase 2: Poll Response Sheet — Add Session Column

**Modify poll response sheet headers (column F is new):**

| Column | Header | Status |
|--------|--------|--------|
| A | Timestamp | Existing |
| B | שם - רישיון | Existing |
| C | מגיע? | Existing |
| D | כמות כדורים | Existing |
| E | הערות | Existing |
| **F** | **מזהה אימון** | **New** |

**Modified function: `submitPollResponse(responseData)`**
- `responseData` now includes `sessionId` field
- When writing a new row, write session ID to column F
- When updating (upsert), match on both trainee name AND session ID (not just name)
- This is critical: a trainee can respond to multiple sessions

**Modified function: `getExistingPollResponse(traineeName, sessionId)`**
- Add `sessionId` parameter
- Match on both name and session ID column
- Returns existing response only for that specific session

**Migration:** Add column F header to existing sheet. Existing rows will have empty session ID — they belong to the "legacy" single-instructor era and can be ignored or backfilled.

---

### Phase 3: Session Management Functions

**Modified function: `parseSessionRow(data, i)` — NEW (v4.2.0)**
```
1. Parse a single session row from sessions sheet
2. Extracts columns A–I (includes new columns H and I for deputies)
3. Returns object with: sessionId, date, instructorTz, instructorName, status, notes, deputy1Tz, deputy2Tz
4. Shared helper used by getActiveSessions(), getAllSessions(), getInstructorSessions()
```

**Modified function: `createSession(date, instructorTz, notes, deputy1Tz, deputy2Tz)` — v4.2.0**
```
1. Validate: instructorTz exists in instructor sheet
2. Validate: deputy1Tz and deputy2Tz exist in instructor sheet (if provided)
3. Generate sessionId = generateSessionId(date, instructorTz)
4. Check for duplicate sessionId in sessions sheet
5. Look up instructor name from instructor sheet
6. Append row: [sessionId, date, instructorTz, instructorName, 'פעיל', notes, new Date(), deputy1Tz, deputy2Tz]
7. Return {success: true, sessionId: sessionId}
```

**Modified function: `getActiveSessions()` — v4.2.0**
```
1. Read sessions sheet (read up to 9 columns to include deputy fields)
2. Filter rows where סטטוס = 'פעיל'
3. Use parseSessionRow() helper to extract row data
4. Return array of {sessionId, date, instructorTz, instructorName, notes, deputy1Tz, deputy2Tz, role: 'main'}
5. Sort by date ascending (nearest first)
```

**Modified function: `getInstructorSessions(instructorTz)` — v4.2.0**
```
1. Read sessions sheet (read up to 9 columns to include deputy fields)
2. Filter rows where instructorTz matches (using normalizeId):
   - Column C (main instructor): set role = 'main'
   - Column H (deputy 1): set role = 'deputy'
   - Column I (deputy 2): set role = 'deputy'
3. Use parseSessionRow() helper to extract row data
4. Return array of sessions with role field: {sessionId, date, ..., deputy1Tz, deputy2Tz, role}
5. Sort by date descending (most recent first)
```

**Modified function: `getAllSessions()` — v4.2.0**
```
1. Read sessions sheet (read up to 9 columns to include deputy fields)
2. Use parseSessionRow() helper for all rows
3. Return array of all sessions (all statuses) with: {sessionId, date, ..., deputy1Tz, deputy2Tz}
4. Sort by date descending
```

**New function: `closeSession(sessionId)`**
```
1. Find row by sessionId
2. Set סטטוס = 'סגור'
3. Return {success: true}
```

**Note on `archiveSession(sessionId)`**
NOT IMPLEMENTED. Sessions are simply closed (סטטוס = 'סגור') and remain in the sheet with their poll responses tagged. No separate archiving mechanism is needed — closed sessions are naturally isolated by sessionId.

---

### Phase 4: Instructor Dashboard (New Page)

**New route: `?action=instructor`**

**New function: `getInstructorDashboardHtml()`**

This replaces the current admin dashboard for instructor-specific operations. Flow:

**Step 1 — Instructor Login:**
- Same dark theme UI as other pages
- Enter ת.ז. field
- "כניסה" button
- Validates ת.ז. exists in instructor sheet
- On success → shows instructor's dashboard

**Step 2 — Instructor Dashboard View:**
- Header: "שלום, {instructorName}" with מ"מ number
- Section: "האימונים שלי" — list of instructor's sessions (from `getInstructorSessions`)
- Each session card shows:
  - Date (bold)
  - **Status badge: פעיל (green), סגור (gray), ארכיון (dim). NEW (v4.2.0): Deputy-role sessions show "מ"מ" badge**
  - Notes (if any)
  - **NEW (v4.2.0): Deputy names below main instructor: show "מ"מ 1: {name}" and/or "מ"מ 2: {name}" if assigned**
  - Response count badge: "X מגיעים" (count from poll responses matching this sessionId)
  - **NEW (v4.2.0): Deputy-role sessions show "הדפסה" and "רשימת מגיעים" buttons only (cannot create, share, close)**
  - Main-instructor action buttons (active sessions):
    - "🔗 שיתוף" → copy formatted message to clipboard for manual sharing
    - "📲 שלח בווטסאפ" (green button) → opens wa.me directly with session-specific poll link
    - "✏️ רשימת מגיעים" → **NEW (v4.2.9)** open attendance override panel (see below)
    - "🖨️ הדפסה" → print attendance for this session (works for BOTH active AND closed sessions)
    - "סגור" → close session (with confirmation). No data reset needed
    - Response count badge: "מגיעים: X / סהכ: Y"
  - Main-instructor buttons (closed sessions): "הדפסה" only
- Button at top: "➕ פתח אימון חדש" → create new session form
- **Create session form (v4.2.0): date picker + notes field + 2 deputy dropdown selects (populated from instructor list, excluding self) + "צור אימון" button**
  - Deputy dropdowns are optional — instructor can leave them empty for main-instructor-only sessions

**Attendance Override Panel (v4.2.9):**

When the instructor clicks "רשימת מגיעים ✏️" on an active session:
1. Dashboard sections are hidden, a new `.att-panel` overlay appears
2. Calls `getSessionResponses(sessionId)` — returns all poll responses for the session
3. Renders an editable list of trainees, each row showing:
   - Trainee name (read-only)
   - "מגיע" checkbox (editable)
   - Bullet count input field (editable)
4. Changed rows are highlighted with orange border (`.att-changed`)
5. Two action buttons:
   - "שמור שינויים" (green `.btn-save`) — calls `updateSessionResponse()` for each changed row
   - "חזור ללוח" (gray `.btn-back`) — discards changes, restores dashboard view
6. If no responses exist, shows empty state message
7. Available to both main instructor and deputies of the session

**Key functions:**
- `showAttendanceList(sessionId)` — hides dashboard, creates panel, fetches data
- `renderAttendanceList(sessionId, rows)` — builds editable rows
- `markAttChanged(el)` — highlights changed rows with orange border
- `saveAttendanceChanges(sessionId)` — collects changed rows, fires parallel `updateSessionResponse` calls
- `hideAttendanceList()` — removes panel, restores dashboard sections

**CSS classes:** `.att-panel`, `.att-header`, `.att-row`, `.att-name`, `.att-check`, `.att-input`, `.att-changed`, `.att-empty`, `.att-actions`, `.btn-back`, `.btn-save`, `.btn-att`

**Super-admin view:** If the logged-in instructor's ת.ז. matches `INSTRUCTOR_TZ` (or email matches any `ADMIN_EMAILS` entry), show an additional "כל האימונים" tab with all instructors' sessions.

---

### Phase 5: Poll Page — Session Picker

**Modified function: `getPollHtml()`**

Current flow: trainee enters ת.ז. → immediate tool selection → submit.

New flow: trainee enters ת.ז. → **session picker** → tool selection → submit.

**After ת.ז. lookup succeeds (trainee found):**

1. Call `getActiveSessions()` to get all active sessions
2. Display a list of active session cards:
   - Each card shows: date, instructor name, notes
   - "השתתפות" button on each card
3. Trainee clicks a session → proceeds to the existing tool selection + attendance form
4. Session ID is stored in a hidden field and sent with `submitPollResponse()`

**If only one active session exists:** Auto-select it (skip the picker for convenience).

**If no active sessions exist:** Show message "אין אימונים פתוחים כרגע" (no active sessions right now).

**URL shortcut:** Support `?action=poll&session=SESSIONID` to skip the session picker (useful for WhatsApp share links that are session-specific).

---

### Phase 6: Modified Existing Functions

**REMOVED: `doRefreshAttending()`, `doResetPollResponses()`, `refreshAttending()`, `resetPollResponses()`**
See "Key Architectural Simplification" section above. These functions are no longer needed — the print page reads poll data directly, and sessions are closed (not reset).

**`doGetStatus(sessionId)` — was `doGetStatus()`**
```
Changes:
1. Accept sessionId
2. Read poll responses filtered by sessionId (column F)
3. Count responses and attending directly from poll data
4. Return counts for this specific session
```

**`getPrintHtml(sessionId)` — was `getPrintHtml(sessionDate, instructorTz)` — Updated v4.2.0**
```
Changes:
1. Accept sessionId instead of separate params
2. Look up session details (date, instructorTz) from sessions sheet, including deputy1Tz and deputy2Tz
3. Read poll responses filtered by sessionId (column F)
4. For each "כן" response, look up full trainee details from source sheet (absorbs the licenseMap logic from the old doRefreshAttending)
5. Build the attendance table directly — no intermediate "attending" sheet
6. NEW (v4.2.0): Page header shows deputy information: "מ"מ 1: {name} | מ"מ 2: {name}" instead of old license-based מ"מ field
7. Print layout stays identical (logo, B&W, bold headers, A4 landscape)
```

**`doGet(e)` — route changes:**

| Route | Handler | Auth | Notes |
|-------|---------|------|-------|
| (none) | `getLandingHtml()` | Public | Landing page with navigation cards |
| `?action=landing` | `getLandingHtml()` | Public | Alias for default route |
| `?action=admin` | `getAdminDashboardHtml()` | Client-side OTP (v5.0.0) | Admin dashboard: login + sessions + instructors + trainees + suspension. Owner-only panels (DB links, sessions-by-instructor) shown if `isOwnerByTz()` is true (v5.0.9). |
| `?action=instructor` | `getInstructorDashboardHtml()` | ת.ז. + Google or OTP | Instructor dashboard with session management |
| `?action=register` | `getLookupHtml(prefillTz, adminMode)` | Public (OTP for data access) | Supports `&admin=1` for admin edit mode (v5.0.0) |
| `?action=poll&session=ID` | `getPollHtml(sessionId)` | Public (OTP for data access) | Session-specific poll link |
| `?action=print&session=ID` | `getPrintHtml` or `getPrintOtpGateHtml` | Google session or OTP gate | Session-scoped: main instructor, deputy 1/2, or owner |
| `?action=printVerified&session=ID&token=T` | `getPrintHtml(sessionId)` | One-time token 60s | Print page after OTP verification |
| `?action=status&session=ID` | `doGetStatus(sessionId)` | Called from authenticated dashboard | Session-specific status (JSON) |
| `?action=debug` | Debug info page | Public | Diagnostic: email, auth, config |

**Removed routes:** `?action=refresh` and `?action=reset` are no longer needed.

**Backward compatibility:** If `session` param is missing, fall back to legacy behavior (read all responses). This allows a gradual migration.

---

### Phase 7: WhatsApp Share — Session-Specific

**Implemented share mechanisms:**

The instructor dashboard provides TWO share mechanisms for active sessions:

**1. Copy to Clipboard (Blue "שתף" Button)**
- Calls `buildShareMsg(sessionId, dateStr)` helper
- Helper returns `{url, msg}` object where:
  - `url` = session-specific poll link with session ID
  - `msg` = formatted greeting + date line + notes + poll link
- Message format (template):
  ```
  שלום! 🎯
  אימון ירי בתאריך {date}
  מדריך: {instructorName}
  {notes}

  לאישור הגעה:
  {POLL_PAGE_URL}?action=poll&session={sessionId}

  לרישום מתאמנים חדשים:
  {REGISTER_URL}
  ```
- Button action: copies formatted message to clipboard for manual pasting into WhatsApp

**2. Direct WhatsApp Share (Green "📲 שלח בווטסאפ" Button)**
- Also calls `buildShareMsg(sessionId, dateStr)`
- Opens `wa.me` directly with session-specific poll link encoded
- User can add message manually or accept the formatted version

---

### Phase 8: Landing Page + Admin Dashboard

The default route (`WEBAPP_URL` with no action) becomes a **public landing page** for all users. The current admin dashboard is reworked into a **super-admin overview** on a dedicated route.

**8A. Landing Page (new, replaces current default route)**

Route: `WEBAPP_URL` (no action parameter)

Function: `getLandingHtml()`

A simple entry point with three navigation cards:
- "מדריך? כניסה לניהול אימונים" → `?action=instructor`
- "מתאמן? רישום" → `?action=register`
- "מתאמן? סקר נוכחות" → `?action=poll`

No authentication required. Clean, minimal, follows the existing dark theme design.

**8B. Admin Dashboard (reworked, new dedicated route)**

Route: `?action=admin`

Function: `getAdminDashboardHtml()` (reworked from current `getDashboardHtml()`)

Accessible only to `ADMIN_EMAILS`. Contains:

- **Active sessions list (v4.2.7)** — shows all currently active sessions with close buttons. Replaced broken aggregated stats view.
- **Quick navigation links:**
  - "רישום מתאמנים" → `?action=register`
  - "סקר נוכחות" → `?action=poll`
  - "כניסת מדריך" → `?action=instructor`
- **System info** — version number, deployment URL

Removes the old refresh/reset buttons entirely. The admin dashboard is primarily an overview + navigation hub. **NEW (v4.2.4): Admin can close any instructor's active session directly from the sessions table.**

**Owner-only panels (v5.0.9):** When the logged-in admin's email matches `OWNER_EMAILS` (checked via `isOwnerByTz()`), two additional sections appear tagged with a yellow "בעלים" badge:
- **גיליונות נתונים** — direct links to all 4 Google Sheets (מאגר מתאמנים, תשובות סקר, מדריכים, לוח אימונים)
- **אימונים לפי מדריך** — instructor dropdown + filterable sessions table (all/active/closed) with print & close buttons, DOM elements via `createElement()`

---

## Data Flow Diagrams

### New Poll Flow
```
Trainee enters ת.ז.
  → lookupByTZ(tz) — finds trainee
  → getActiveSessions() — lists available sessions
  → Trainee picks session
  → getExistingPollResponse(name, sessionId) — checks for existing answer
  → Trainee fills form (tool, attending, bullets, notes)
  → submitPollResponse({...data, sessionId}) — saves with session tag
```

### New Instructor Flow
```
Instructor enters ת.ז.
  → getInstructorData(tz) — validates instructor
  → checkInstructorAuth(tz) — Google session or OTP (v4.2.3)
  → getInstructorSessions(tz) — lists their sessions (incl. deputy sessions)
  → Instructor creates/manages sessions
  → Per session: share, attendance override, print, close
```

### Attendance Override Flow (v4.2.9)
```
Instructor clicks "רשימת מגיעים" on active session
  → showAttendanceList(sessionId) — hides dashboard, creates panel
  → google.script.run.getSessionResponses(sessionId)
  → renderAttendanceList(sessionId, rows) — editable checkboxes + inputs
  → Instructor edits rows (checkbox for attending, input for bullets)
  → markAttChanged(el) — highlights changed rows with orange border
  → Instructor clicks "שמור שינויים"
  → saveAttendanceChanges(sessionId) — collects changed rows
  → For each changed row: google.script.run.updateSessionResponse(sessionId, name, attending, bullets)
  → On all success: hideAttendanceList() — restores dashboard view
```

---

## Security Model (v4.2.3)

### Deployment Configuration

- **Execute as:** Me (script owner)
- **Who has access:** Anyone (no Google account required)
- `Session.getActiveUser().getEmail()` returns empty for non-owner users — OTP fallback handles this

### Authentication Flows

**Instructor authentication (v4.2.3):**
- `checkInstructorAuth(tz)` — tries Google session first; if unavailable, returns `{needsOtp: true}`
- `requestInstructorOTP(tz)` — sends 6-digit OTP to instructor's registered email via `MailApp.sendEmail()`
- `verifyInstructorOTP(tz, code)` — verifies code, issues print token on success
- `issuePrintToken(tz, sessionId)` — issues 60-second UUID token for print page access
- Cache keys: `otp-inst-{tz}`, `otp-block-inst-{tz}`, `print-token-{token}`

**Print page access (v4.2.3):**
- From dashboard: `issuePrintToken()` → redirect to `?action=printVerified&session=ID&token=T`
- Direct URL access: `?action=print` → if Google session authorized, show print; otherwise → `getPrintOtpGateHtml()` OTP gate
- `isSessionAuthorizedByTz(tz, sessionId)` — checks tz against main instructor + deputy1 + deputy2

**Trainee identity protection:**
- Source sheet has "אימייל" column (E) — stores Google account email when available
- `lookupByTZ()` — hybrid auth: Google session match / OTP fallback / email collection
- First-time users pass through freely — email captured on interaction

**Trainee OTP Authentication (v4.1.0+):**
- For trainees without active Google session:
  - If stored email exists → OTP sent to stored email (6-digit code, 5min TTL)
  - If no stored email → trainee provides email, OTP sent, email stored on verification
- Rate limiting: max 3 attempts per OTP, 15-minute block after exhaustion
- OTP storage: `CacheService.getScriptCache()` with auto-expiry
- Email delivery: `MailApp.sendEmail()` with styled HTML template
- OTP UI in register page (getLookupHtml), poll page (getPollHtml), and instructor dashboard

**Auth helper functions (data.gs):**
- `isOwnerEmail(email)` — checks against `OWNER_EMAILS` array (renamed from `isAdminEmail` in v5.0.0)
- `isOwnerByTz(tz)` — looks up instructor by ת.ז. → checks if their email is in `OWNER_EMAILS` (v5.0.9)
- `isAdminByEmail(email)` — looks up instructor by email → checks "אדמין" column (v5.0.0)
- `isAdminByTz(tz)` — looks up instructor by ת.ז. → checks "אדמין" column (v5.0.0)
- `isAuthorizedEmail(email)` — delegates to `isOwnerEmail()` + `isAdminByEmail()` + instructor sheet email column
- `isSessionAuthorized(email, sessionId)` — checks email against session's instructor + deputies; owner/admin can access any session
- `isSessionAuthorizedByTz(tz, sessionId)` — same check by ת.ז.; admin can access any session
- `checkInstructorAuth(tz)` — Google session check for instructors (v4.2.3)
- `checkAdminAuth(tz)` — like checkInstructorAuth but also verifies admin flag (v5.0.0)
- `requestInstructorOTP(tz)` / `verifyInstructorOTP(tz, code)` — instructor OTP flow
- `requestAdminOTP(tz)` / `verifyAdminOTP(tz, code)` — admin OTP flow (v5.0.0)
- `issuePrintToken(tz, sessionId)` — print page access token
- `autoClosePastSessions()` — auto-close sessions past their date
- `notifyAdminSessionEvent(eventType, ...)` — email owners on session open/close
- `getSessionResponses(sessionId)` — returns all poll responses for a session as editable array
- `updateSessionResponse(sessionId, traineeName, attending, bullets)` — updates a single trainee's attendance record
- `requestOTP(tz)` / `requestOTPForEmail(tz, email)` — trainee OTP via MailApp
- `verifyOTP(tz, code)` / `getVerifiedTraineeData(tz)` — trainee OTP verification
- `addInstructor(data)` — append new instructor row with 6 columns (v5.0.0)
- `updateInstructor(tz, data)` — update instructor row fields including admin flag (v5.0.0)
- `searchTrainees(query)` — search source sheet by name/tz/phone, max 20 results (v5.0.0)
- `updateTraineeStatus(tz, status, reason)` — set trainee status + reason + timestamp (v5.0.0)
- `getSuspensionReasons()` — returns active suspension reasons from dedicated sheet (v5.0.0)
- `getAllSuspensionReasons()` — returns all reasons with active status (v5.0.5)
- `addSuspensionReason(reason)` — appends new reason to suspension reasons sheet (v5.0.0)
- `toggleSuspensionReason(reason, active)` — toggle reason active/inactive status (v5.0.5)
- `getSuspendedTrainees()` — returns all trainees with status "מושעה" (v5.0.5)

**Auto-close trigger (v4.2.4):**
- `installAutoCloseTrigger()` / `removeAutoCloseTrigger()` in setup.gs
- Daily trigger at ~02:00 Israel time (after backup at ~01:00)
- Closes any session where date < today (Israel timezone)
- On failure, sends error email to `ADMIN_EMAILS[0]`

**Access matrix (v5.0.0+):**
| Route | Auth Method | Owner | Admin | Instructors | Public |
|-------|-----------|-------|-------|-------------|--------|
| Landing, Register, Poll | OTP or Google | ✓ | ✓ | ✓ | ✓ |
| Instructor dashboard | ת.ז. + Google or OTP | ✓ | ✓ | ✓ | ✗ |
| Admin dashboard | ת.ז. + OTP, admin flag check | ✓ (+ owner panels) | ✓ | ✗ | ✗ |
| Print | Google session or OTP gate | ✓ | ✓ (any session) | ✓ (session-scoped) | ✗ |
| PrintVerified | One-time token (60s) | ✓ | ✓ | ✓ (session-scoped) | ✗ |
| Status | Called from authenticated dashboard | ✓ | ✓ | ✓ | ✗ |
| Debug | None | ✓ | ✓ | ✓ | ✓ |

---

## Migration Checklist

1. [x] Create sessions spreadsheet (manual or via `setupSessionsSheet()`)
2. [x] Add `SESSIONS_SHEET_ID` and `SESSIONS_SHEET_URL` constants to code.gs
3. [x] Add column F "מזהה אימון" header to existing poll response sheet
4. [x] Implement `generateSessionId()`, `createSession()`, `getActiveSessions()`, `getInstructorSessions()`, `closeSession()`, `archiveSession()`
5. [x] Implement `getInstructorDashboardHtml()` with login + session management (no refresh/reset buttons)
6. [x] Modify `submitPollResponse()` to include sessionId
7. [x] Modify `getExistingPollResponse()` to filter by sessionId
8. [x] Modify `getPollHtml()` to show session picker
9. [x] Modify `getPrintHtml()` to accept sessionId and read poll data directly (absorb `doRefreshAttending` logic)
10. [x] Modify `doGetStatus()` to filter by sessionId
11. [x] Remove `doRefreshAttending()`, `doResetPollResponses()`, `refreshAttending()`, `resetPollResponses()` and their routes
12. [x] Remove "סקר נוכחות וסיכום מגיעים" sheet generation (no longer needed)
13. [x] Update `doGet(e)` routes (remove refresh/reset, add landing/admin/instructor/session routes)
14. [x] Update WhatsApp share to use session-specific links
15. [x] Implement `getLandingHtml()` — public landing page with navigation cards
16. [x] Rework `getDashboardHtml()` into `getAdminDashboardHtml()` — admin overview with spreadsheet links (all 4 sheets), aggregated stats, navigation
17. [x] Ensure all new pages follow existing visual design (dark theme, RTL, same CSS tokens — see Visual Design Requirements section)
18. [x] Update `setupSpreadsheets()` to include sessions sheet and new poll column
19. [x] Update CONTEXT.md with all new functions, routes, and data flows
20. [x] Test: create session → trainee poll → print → close session → verify isolation between instructors
21. [x] **(v4.2.6)** Fix admin dashboard stats rendering issues
22. [x] **(v4.2.7)** Replace broken admin stats with active sessions list + close buttons
23. [x] **(v4.2.8)** Bug fixes and stability improvements
24. [x] **(v4.2.9)** Implement instructor attendance override: `getSessionResponses()`, `updateSessionResponse()`, attendance panel UI in instructor dashboard
25. [x] **(v4.2.9)** Update deputy role to include attendance override access (not just print)
26. [x] **(v4.2.9)** Update instructor manual to v4.2.9 (`מדריך_למדריך_v429.docx`) — 12 sections including attendance override
27. [x] **(v4.2.9)** Update CONTEXT.md and MULTI_DESIGN.md with all v4.2.x features
28. [x] **(v5.0.0)** 4-tier role system: Owner/Admin/Instructor/Trainee with admin flag in instructor sheet
29. [x] **(v5.0.0)** Trainee status columns (V-X): סטטוס, סיבת השעיה, תאריך עדכון סטטוס
30. [x] **(v5.0.0)** Suspension reasons separate spreadsheet with setup function and default reasons
31. [x] **(v5.0.0)** Admin dashboard rewrite: OTP login, sessions, instructor CRUD, trainee management, status management
32. [x] **(v5.0.0)** Owner dashboard: relocated DB links and system tools to owner-only route
33. [x] **(v5.0.0)** Admin entry via instructor dashboard "לוח ניהול" button (visible only if admin flag)
34. [x] **(v5.0.1)** SpreadsheetApp.flush() in all setup functions for Table typed-column compatibility
35. [x] **(v5.0.2)** Data validation dropdowns on all spreadsheets (instructor admin, response attending, source status, session status)
36. [x] **(v5.0.3)** Admin-mode trainee edit: getVerifiedTraineeData() bypasses OTP auth in register page
37. [x] **(v5.0.4)** Instructor dashboard layout refinement: vertical session cards, compact buttons
38. [x] **(v5.0.5)** Admin suspension management UI: suspended trainees list, resolve button, collapsible reasons panel with add/toggle
39. [x] **(v5.0.6)** Response count shown next to status badge in instructor dashboard for all sessions
40. [x] **(v5.0.7)** Fix השעיות section refresh after trainee status update in admin dashboard
41. [x] **(v5.0.8)** `withLoading(btn, callback)` loading indicators on all async buttons across instructor, admin, and print OTP gate pages
42. [x] **(v5.0.9)** Merge owner dashboard into admin dashboard: owner-only panels shown via `isOwnerByTz()`, remove `getOwnerDashboardHtml()` and `?action=owner` route
43. [x] **(v5.0.9)** Backup folder moved from Drive root to project folder as "Backups" subfolder
44. [x] **(v5.0.9)** `setupAll()` now installs both triggers (backup + auto-close)

## Visual Design Requirements

**All new pages MUST follow the existing visual design language established by the current pages.** This is critical for a consistent user experience.

### Design Tokens (from existing pages — see CONTEXT.md "UI Design" section)
- **Background:** `#0f172a` (dark navy)
- **Card background:** `#1e293b` (dark slate)
- **Borders:** `#334155`
- **Text:** `#e2e8f0` (light gray)
- **Accent blue:** `#3b82f6` / `#60a5fa`
- **Success green:** `#16a34a` / `#4ade80`
- **Error red:** `#dc2626` / `#f87171`
- **Warning yellow:** `#fbbf24`
- **Font:** Segoe UI, Tahoma, Arial, sans-serif
- **Layout:** RTL (`dir="rtl"`, `lang="he"`)
- **Border radius:** 10–16px (cards 16px, inputs/buttons 10px)
- **Padding:** cards 32px, inputs 10px 14px, buttons 14px

### Per-Page Design Notes

**Landing Page (`getLandingHtml`):**
- Centered container like existing pages
- Three large navigation cards (instructor / register / poll)
- Each card: icon or emoji, Hebrew title, brief description, full-width clickable
- Card style matches `.card` from registration page
- Minimal — no status info, no data, just navigation

**Instructor Dashboard (`getInstructorDashboardHtml`):**
- Login step: identical layout to poll/registration ת.ז. input (same field styling, same button style)
- Dashboard view: reuse `.card` styling for session cards
- Status badges: green/gray/dim text within cards (not separate colored boxes)
- Action buttons inside cards: same `.btn` classes (`.btn-primary` for print, `.btn-save` for WhatsApp, etc.)
- "פתח אימון חדש" button: use `.btn-new` (purple) style at top
- Session list: vertically stacked cards, most recent first
- Toast notifications for actions: same `.toast` component

**Admin Dashboard (`getAdminDashboardHtml`):**
- Same dark theme container
- Spreadsheet links section: styled as a `.card` with links using `.link` class (blue `#60a5fa`, underline on hover)
- Aggregated stats: simple text in a card, not charts or complex visualizations
- Session overview: compact list (not full cards — this is a summary view)
- Navigation links: same button styles as other pages
- Version/system info: small gray text at bottom (like existing dashboard footer)

**Session Picker on Poll Page:**
- Session cards: same `.card` background and border style
- Each card shows date (bold), instructor name, notes
- "השתתפות" button per card: `.btn-primary` style
- If only one session: auto-select, no picker shown
- If no sessions: `.not-found` style message (yellow text, centered)

### Print Page
The print page (`getPrintHtml`) retains its own B&W design (gray headers, A4 landscape, logo) — it is NOT dark theme. No changes to print visual design.

---

## What Does NOT Change

- Trainee registration page (רישום מתאמנים) — completely unchanged
- Instructor sheet structure (מדריכים) — unchanged
- Print page visual layout — unchanged (just filtered by session)
- All validation logic — unchanged
- `normalizeId()`, `normalizePhone()` — unchanged
- Dark theme UI — unchanged

**Note on Source Sheet:** With v4.0.0, the source sheet (מאגר מתאמנים) now includes a new "אימייל" column (E) to support `REQUIRE_LOGIN` authentication. With v4.1.0, this email column is also used for OTP verification of trainees without Google sessions. All other columns and logic remain unchanged.

---

## Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| 3.0.0 | Mar 2026 | Multi-instructor refactor: sessions sheet, per-session poll, instructor dashboard, landing page |
| 4.0.0 | Mar 2026 | Security: `REQUIRE_LOGIN`, email capture, Google session auth |
| 4.1.0 | Mar 2026 | Trainee OTP hybrid auth (email verification for non-Google sessions) |
| 4.2.0 | Apr 2026 | Deputy instructors (מ"מ): up to 2 per session, print access |
| 4.2.3 | Apr 2026 | Instructor OTP auth, print token flow, OTP gate page |
| 4.2.4 | Apr 2026 | Auto-close past sessions (daily trigger ~02:00), admin close button |
| 4.2.5 | Apr 2026 | Session event emails to admins on open/close |
| 4.2.7 | Apr 2026 | Admin dashboard: active sessions list replaces broken stats |
| 4.2.9 | Apr 2026 | Instructor attendance override: edit attending status + bullets from dashboard |
| 5.0.0 | Apr 2026 | 4-tier role system (Owner/Admin/Instructor/Trainee), trainee status & suspension, admin dashboard with OTP login, instructor/trainee management |
| 5.0.1 | Apr 2026 | Setup fixes: SpreadsheetApp.flush() for Table typed-column compatibility |
| 5.0.2 | Apr 2026 | Spreadsheet dropdowns: כן/לא on instructor admin, response attending; status dropdowns on source and sessions sheets |
| 5.0.3 | Apr 2026 | Fix admin-mode trainee edit: bypass OTP auth via getVerifiedTraineeData() |
| 5.0.4 | Apr 2026 | Instructor dashboard layout: vertical session cards, compact buttons, same-sized top actions |
| 5.0.5 | Apr 2026 | Admin suspension management UI: suspended trainees list with resolve, collapsible reasons panel with add/toggle |
| 5.0.6 | Apr 2026 | Response count next to status badge in instructor dashboard for all sessions (active + closed) |
| 5.0.7 | Apr 2026 | Fix: השעיות section refresh after trainee status update in admin dashboard |
| 5.0.8 | Apr 2026 | `withLoading(btn, callback)` loading indicators on all async buttons (instructor, admin, print OTP gate) |
| 5.0.9 | Apr 2026 | Merge owner dashboard into admin: owner-only panels (DB links, sessions-by-instructor) shown via `isOwnerByTz()`. Remove `getOwnerDashboardHtml()` and `?action=owner` route. Backup folder moved to project folder as "Backups". `setupAll()` installs triggers. |

## Architecture: Multi-File Structure (v5.0.9)

The implementation uses a **multi-file `.gs` architecture** (not single-file), split into 7 logical modules. All files share a global scope in GAS — functions defined in any file are accessible from all others.

| File | Size | Purpose |
|------|------|---------|
| `config.gs` | ~32 lines | Constants: `SCRIPT_VERSION`, sheet IDs (5 sheets), `WEBAPP_URL`, `OWNER_EMAILS`, suspension reasons config, OTP settings. No functions. |
| `routing.gs` | ~121 lines | `doGet(e)` router dispatcher. Parses URL parameters, dispatches to page handlers. |
| `data.gs` | ~1665 lines | All server-side data functions: session CRUD, trainee lookup/validation, poll submit/query, OTP auth (instructor + trainee + admin), auto-close, email notifications, attendance override, instructor CRUD, trainee status management, suspension reasons CRUD, `isOwnerByTz()`. |
| `pages.gs` | ~1280 lines | All HTML page generators: landing, register, poll, instructor dashboard (incl. OTP UI, attendance override panel, response counts, withLoading), admin dashboard (login + sessions + instructor mgmt + trainee mgmt + suspension mgmt + owner-only panels), print, print OTP gate. |
| `setup.gs` | ~305 lines | Sheet initialization for all 5 spreadsheets (`setupAll()`), data validation rules, trigger installation (backup + auto-close). |
| `backup.gs` | ~144 lines | Scheduled daily backup to project folder on Google Drive (~01:00 Israel time). Copies all 4 data spreadsheets. Folder "Backups" created next to project spreadsheets. |
| `logo.gs` | ~110KB | `LOGO_BASE64` constant — Base64-encoded logo image for HTML pages. |

**Key architectural patterns:**
- **GAS single-line JS**: All string concatenation in `.gs` files produces ONE line of JS in the browser. ASI never applies. Every statement MUST end with `;`.
- **`data-sid` pattern**: Dynamic onclick handlers use `data-sid` attributes to avoid quote-escaping nightmares (see CONTEXT.md §10.5).
- **OTP hybrid auth**: Both instructors and trainees fall back from Google session → OTP email verification → email collection, depending on browser state.
- **Print token bridge**: 60-second UUID tokens cached in `CacheService` bridge OTP verification to print page access across page navigation.
- **All pages inline**: CSS and JS are embedded in HTML strings (no separate files). Pages are self-contained.

**Supporting documentation (all in `doc/`):**
- `doc/CONTEXT.md` — Complete function inventory, data schemas, routes, UI tokens, security model, development workflow. **Primary reference for another agent to continue development.**
- `doc/MULTI_DESIGN.md` — This file. Architecture rationale, data flows, migration history.
- `doc/MULTI_SETUP.md` — Deployment guide: spreadsheet creation, GAS project config, trigger setup.
- `doc/PLAN_v5.md` — Implementation plan for v5.0.0 role system. Detailed design decisions, function inventory, and phase breakdown.
- `doc/ROADMAP_v5.md` — Roadmap: what's done, what remains, future considerations.
- `doc/DOC_GUIDELINES.md` — Manual formatting specs and creation workflow.

**User manuals (all in `manuals/`):**
- `manuals/מדריך_למדריך_v5012.docx` — Hebrew instructor manual (reference template). **See DOC_GUIDELINES.md for creation/editing workflow.**
- `manuals/Instructor_Manual_v5012.docx` — English instructor manual.
- `manuals/מדריך_למנהל_v5012.docx` — Hebrew admin manual.
- `manuals/מדריך_למתאמן_v5012.docx` — Hebrew trainee manual.
