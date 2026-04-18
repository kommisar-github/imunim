# Implementation Plan — v3.0.0: Multi-Instructor Refactor

**Status: COMPLETE — Superseded by v4.0.0**  
**Versions: 3.0.0 – 3.0.15**  
**Date: March 2026**

---

## Goal

Allow multiple instructors to independently advertise training dates, manage their own trainee attendance lists, and print per-instructor per-date attendance sheets. The trainee database (מאגר מתאמנים) remains shared — trainees register once and can attend any instructor's session.

## Pre-v3 Architecture

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

**New function: `createSession(date, instructorTz, notes)`**
```
1. Validate: instructorTz exists in instructor sheet
2. Generate sessionId = generateSessionId(date, instructorTz)
3. Check for duplicate sessionId in sessions sheet
4. Look up instructor name from instructor sheet
5. Append row: [sessionId, date, instructorTz, instructorName, 'פעיל', notes, new Date()]
6. Return {success: true, sessionId: sessionId}
```

**New function: `getActiveSessions()`**
```
1. Read sessions sheet
2. Filter rows where סטטוס = 'פעיל'
3. Return array of {sessionId, date, instructorTz, instructorName, notes}
4. Sort by date ascending (nearest first)
```

**New function: `getInstructorSessions(instructorTz)`**
```
1. Read sessions sheet
2. Filter rows where instructorTz matches (using normalizeId)
3. Return array of {sessionId, date, instructorTz, instructorName, notes}
4. Sort by date descending (most recent first)
```

**New function: `getAllSessions()`**
```
1. Read sessions sheet
2. Return array of all sessions (all statuses)
3. Sort by date descending
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
- Header: "שלום, {instructorName}"
- Section: "האימונים שלי" — list of instructor's sessions (from `getInstructorSessions`)
- Each session card shows:
  - Date (bold)
  - Status badge: פעיל (green), סגור (gray), ארכיון (dim)
  - Notes (if any)
  - Response count badge: "X מגיעים" (count from poll responses matching this sessionId)
  - Main-instructor action buttons (active sessions):
    - "🔗 שיתוף" → copy formatted message to clipboard for manual sharing
    - "📲 שלח בווטסאפ" (green button) → opens wa.me directly with session-specific poll link
    - "🖨️ הדפסה" → print attendance for this session (works for BOTH active AND closed sessions)
    - "סגור" → close session (with confirmation). No data reset needed
  - Main-instructor buttons (closed sessions): "הדפסה" only
- Button at top: "➕ פתח אימון חדש" → create new session form
- **Create session form:** date picker + notes field + "צור אימון" button

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

**`getPrintHtml(sessionId)` — was `getPrintHtml(sessionDate, instructorTz)`**
```
Changes:
1. Accept sessionId instead of separate params
2. Look up session details (date, instructorTz) from sessions sheet
3. Read poll responses filtered by sessionId (column F)
4. For each "כן" response, look up full trainee details from source sheet (absorbs the licenseMap logic from the old doRefreshAttending)
5. Build the attendance table directly — no intermediate "attending" sheet
6. Print layout stays identical (logo, B&W, bold headers, A4 landscape)
```

**`doGet(e)` — route changes:**

| Route | Handler | Auth | Notes |
|-------|---------|------|-------|
| (none) | `getLandingHtml()` | Public | Landing page with navigation cards |
| `?action=landing` | `getLandingHtml()` | Public | Alias for default route |
| `?action=instructor` | `getInstructorDashboardHtml()` | ת.ז. + Google session | Instructor dashboard with session management |
| `?action=register` | `getLookupHtml()` | Public | Trainee registration and edit |
| `?action=poll&session=ID` | `getPollHtml(sessionId)` | Public | Session-specific poll link |
| `?action=print&session=ID` | `getPrintHtml(sessionId)` | Google session | Session-scoped: main instructor only |
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

- **Active sessions list** — shows all currently active sessions
- **Quick navigation links:**
  - "רישום מתאמנים" → `?action=register`
  - "סקר נוכחות" → `?action=poll`
  - "כניסת מדריך" → `?action=instructor`
- **System info** — version number, deployment URL

Removes the old refresh/reset buttons entirely. The admin dashboard is primarily an overview + navigation hub.

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
  → getInstructorSessions(tz) — lists their sessions
  → Instructor creates/manages sessions
  → Per session: share, print, close
```

---

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
- Quick navigation links section: styled as a `.card` with links using `.link` class (blue `#60a5fa`, underline on hover)
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

---

## Migration Checklist

1. [x] Create sessions spreadsheet (manual or via `setupSessionsSheet()`)
2. [x] Add `SESSIONS_SHEET_ID` and `SESSIONS_SHEET_URL` constants to code.gs
3. [x] Add column F "מזהה אימון" header to existing poll response sheet
4. [x] Implement `generateSessionId()`, `createSession()`, `getActiveSessions()`, `getInstructorSessions()`, `closeSession()`, `getAllSessions()`
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
16. [x] Rework `getDashboardHtml()` into `getAdminDashboardHtml()` — admin overview with navigation
17. [x] Ensure all new pages follow existing visual design (dark theme, RTL, same CSS tokens — see Visual Design Requirements section)
18. [x] Update `setupSpreadsheets()` to include sessions sheet and new poll column
19. [x] Update CONTEXT.md with all new functions, routes, and data flows
20. [x] Test: create session → trainee poll → print → close session → verify isolation between instructors

---

**Historical Notes:**

v3.0.4: Code split from monolithic code_multi.gs into 6 .gs files (config, routing, data, pages, setup, logo).

v3.0.15: Last pre-security release.
