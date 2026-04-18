# Implementation Plan — v2.x: Single-Instructor System

**Status: COMPLETE — Superseded by v3.0.0**  
**Final Version: 2.13.8**  
**Date: October 2025 – March 2026**  
**Reconstructed: April 2026 (from code.gs and CONTEXT.md)**

---

## 1. Overview

v2 was a single-file, single-instructor implementation of the shooting training attendance system (אימוני ירי). It replaced Google Forms with custom HTML pages for trainee registration and attendance polling, providing:

- **Trainee registration** — capture full personal data (name, ID, phone) and up to 4 weapons with licensing details
- **Attendance polling** — per-session sign-in with license expiry verification, pre-fill for repeat submissions
- **Attendance reporting** — automated sheet generation with instructor data and bullet count
- **Print attendance** — A4 landscape formatted output with embedded logo header
- **Dashboard** — admin interface for managing poll state, refreshing sheets, resetting sessions
- **WhatsApp integration** — share poll links directly with training group

All code lived in a single `code.gs` file (no modularization). The instructor was hardcoded into `INSTRUCTOR_TZ` constant. Security was optional via `REQUIRE_LOGIN` toggle (disabled by default, ready to enable).

---

## 2. Architecture

### 2.1 Single-File Code Structure

**`code.gs`** — 3000+ lines (version 2.13.8)
- Constants (database IDs, URLs, security settings)
- Authentication & security helpers
- Spreadsheet I/O functions
- HTML page generators (returned as string literals)
- Server-side request handlers
- Utility functions (normalization, validation)

No separate `.html` files — all page layouts are string concatenations inside `getDashboardHtml()`, `getLookupHtml()`, `getPollHtml()`, `getPrintHtml()`.

### 2.2 Three Google Spreadsheets

| Spreadsheet | Purpose | Sheets | Columns |
|-------------|---------|--------|---------|
| **Source Sheet (מאגר מתאמנים)** | Trainee database | "Form Responses 1" | 24 (name, ID, phone, 4 × tools) |
| **Response Sheet (תשובות סקר)** | Poll responses & attendance | "Form Responses 1" (poll), "סקר נוכחות וסיכום מגיעים" (attendance), archive sheets | 5 (timestamp, name-license, attending, bullets, notes) |
| **Instructor Sheet (מדריכים)** | Instructor lookup table | "מדריכים" | 5 (ת.ז., name, מ"מ, phone, email) |

### 2.3 No "Sessions" Concept

- One **active poll** per response spreadsheet at any time (sheet "Form Responses 1")
- Manual refresh/reset workflow:
  1. Instructor submits attendance poll
  2. Clicks "רענון רשימת מגיעים" to build attendance sheet
  3. Clicks "איפוס הסקר לאימון הבא" to archive and clear the poll
- No session IDs, no concurrent polls, no session isolation

### 2.4 Web App Routes

Single `doGet(e)` handler routes via `action` parameter:

| URL | Action | Page | Auth |
|-----|--------|------|------|
| `https://script.google.com/macros/s/.../exec` | (none) | Dashboard | Admin only |
| `?action=register` | register | Registration/lookup | Any user |
| `?action=lookup` | lookup | Same as register | Any user |
| `?action=poll` | poll | Attendance poll | Any user |
| `?action=print&sessionDate=...&instructorTz=...` | print | Print-friendly page | Admin only |
| `?action=refresh` | refresh | JSON API | Admin only |
| `?action=reset` | reset | JSON API | Admin only |
| `?action=status` | status | JSON API | Admin only |

---

## 3. Key Features

### 3.1 Trainee Registration

**Page:** `getLookupHtml(prefillTz)`

1. Trainee enters ת.ז. to search
2. If found → edit form (pre-filled)
3. If not found → blank registration form (read-only ת.ז.)
4. Mandatory fields:
   - שם מלא (full name)
   - ת.ז. (ID number, plain text format)
   - טלפון (phone, plain text format)
   - כלי 1 (first tool) — all 5 fields required
   - כלי 2–4 (optional tools) — all-or-nothing (all 5 fields or all empty)
5. Tool fields per weapon:
   - מס׳ רישיון (license number, digits)
   - בתוקף עד (expiry date, dd/mm/yyyy)
   - סוג כלי (type: אקדח or PCC)
   - מספר כלי (serial number, string)
   - קוטר (caliber: 9x19, .40S&W, .45 ACP)
6. Validation:
   - ת.ז.: 8–9 digits, no leading zeros on storage
   - טלפון: 10 digits starting with 0, stored as plain text
   - Duplicate ת.ז. check on add (unique constraint per trainee)
7. On save: ת.ז. and phone stored as explicit `String()` to preserve leading zeros

**Data storage:** Rows appended to source sheet (24 columns total)

### 3.2 Attendance Polling

**Page:** `getPollHtml()`

1. Trainee enters ת.ז.
2. System looks up trainee in source sheet
3. If found:
   - Greeting with name
   - Tool selector (if multiple tools registered)
   - "כן / לא" attendance radio buttons
   - כמות כדורים (bullet count) text field
   - הערות (notes) text area
   - **License expiry check:** red overlay popup blocks submission if selected tool license is expired
   - **Existing response pre-fill:** if trainee already answered, form loads with previous tool, attendance, bullets, notes + yellow banner explaining they can update/cancel
   - Submit button disabled ("טוען...") during existing response lookup, enables ("שלח") after check completes
4. If not found: message with link to registration page
5. Submit → upsert to poll sheet (updates existing row if trainee already responded, otherwise appends)

**Data storage:** Poll responses written to response sheet (5 columns: timestamp, name-license, attending, bullets, notes)

### 3.3 Attendance Refresh

**Page:** Dashboard action "רענון רשימת מגיעים"

1. Admin clicks button
2. System calls `doRefreshAttending(sessionDate, instructorTz)`
3. Flow:
   - Reads all poll responses from "Form Responses 1"
   - Filters for "כן" responses only
   - Builds `licenseMap` from source sheet (license → name, ID, phone, etc.)
   - For each "כן" response, looks up full trainee details using license number
   - Extracts bullet count from poll sheet column D
   - Generates formatted 10-column attendance sheet:
     - מס' (row number)
     - שם מלא (name)
     - ת.ז. (ID)
     - טלפון (phone)
     - מס' רישיון (license)
     - בתוקף עד (expiry)
     - סוג כלי (type)
     - מספר כלי (serial)
     - קוטר (caliber)
     - כמות כדורים (bullets)
   - Writes to sheet "סקר נוכחות וסיכום מגיעים" (creates if doesn't exist)
   - Header row: instructor name, מ"מ, ת.ז., session date (pulled from instructor sheet via `INSTRUCTOR_TZ`)
   - Alternating row colors for readability
   - RTL layout

**License lookup:** Uses `normalizeId()` on both sides to handle Sheets auto-conversion (.0 suffix, leading zero stripping)

### 3.4 Attendance Reset

**Page:** Dashboard action "איפוס הסקר לאימון הבא"

1. Admin clicks button (confirmation dialog)
2. System calls `doResetPollResponses(sessionDate)`
3. Flow:
   - Archives current attendance sheet (copy to new sheet named with date: dd/MM/yyyy)
   - Clears attendance sheet (deletes all rows except header)
   - Clears poll responses sheet (deletes all rows except header)
4. Ready for next training session

**Archive retention:** Old session sheets remain in response spreadsheet for historical reference

### 3.5 Print Attendance

**Page:** Dashboard action "🖨️ הדפסה"

1. Admin selects session date and instructor from dropdown
2. Clicks print button → opens `?action=print&sessionDate=...&instructorTz=...` in new tab
3. System calls `getPrintHtml(sessionDate, instructorTz)`
4. Output: A4 landscape, RTL, B&W optimized
   - Header section (3 table rows):
     - Left: embedded logo (base64 data URI) — height = 3 rows
     - Right: title, date, instructor name/מ"מ (pulled from instructor sheet)
   - 10-column table (same structure as attendance sheet)
   - Gray header row (not blue), bold 13px vs. normal 11px data
   - Browser print dialog (print to PDF or physical printer)

---

## 4. Security Model (REQUIRE_LOGIN)

### 4.1 Feature Toggle

**`REQUIRE_LOGIN`** constant (default: `false`)

- When `false` — no authentication, all routes open (ready for testing)
- When `true` — requires Google Account login on all routes, admin-only access to sensitive operations

### 4.2 Authentication Flow (when enabled)

1. User visits app
2. `doGet(e)` calls `getAuthenticatedEmail()` (requires Google Account deployment)
3. If not logged in → "נדרשת התחברות" page
4. If logged in → check email against whitelist/domain/admin list

### 4.3 Role Model

| Email | Role | Access |
|-------|------|--------|
| `ADMIN_EMAIL` (kommisar@gmail.com) | Admin/Instructor | All pages (dashboard, register, poll, print, refresh, reset, status JSON) |
| Other in `ALLOWED_EMAILS` | Trusted user | All pages |
| From `ALLOWED_DOMAINS` domain | Domain member | All pages |
| Else (if `ALLOWED_DOMAINS` empty) | Any Google user | All pages |

### 4.4 Rate Limiting

**`CacheService`-based per-user limiting (when `REQUIRE_LOGIN=true`)**

- `RATE_LIMIT_MAX` = 30 requests per user
- `RATE_LIMIT_WINDOW_SECONDS` = 60 seconds
- Excess requests → "יותר מדי בקשות" page

### 4.5 Admin-Only Operations

When `REQUIRE_LOGIN=true`:

- Dashboard (`action=null`) — admin only
- Print (`action=print`) — admin only
- Refresh (`action=refresh` JSON) — admin only
- Reset (`action=reset` JSON) — admin only
- Status (`action=status` JSON) — admin only
- Registration/poll — open to all logged-in users

---

## 5. Spreadsheet Schemas

### 5.1 Source Sheet — Trainee Database (24 columns)

**Sheet:** "Form Responses 1"  
**Format:** RTL, auto-resized, plain text (ת.ז., phone)

| Col | Header | Type | Format | Notes |
|-----|--------|------|--------|-------|
| A | Timestamp | Text | — | Registration timestamp |
| B | שם מלא | Text | — | Full name, required |
| C | ת.ז. | Text | Plain text (@) | ID number, 8–9 digits, primary key, required |
| D | טלפון | Text | Plain text (@) | Phone 10 digits 0XXXXXXXXX, required |
| E | מס׳ רישיון - כלי 1 | Text | — | License (digits), tool 1 required |
| F | בתוקף עד - כלי 1 | Text | dd/mm/yyyy | Expiry date, tool 1 required |
| G | סוג כלי - כלי 1 | Text | — | אקדח or PCC, tool 1 required |
| H | מספר כלי - כלי 1 | Text | — | Serial number, tool 1 required |
| I | קוטר - כלי 1 | Text | — | 9x19, .40S&W, .45 ACP, tool 1 required |
| J–N | (כלי 2 columns) | Text | (same as above) | Tool 2 all-or-nothing |
| O–S | (כלי 3 columns) | Text | (same as above) | Tool 3 all-or-nothing |
| T–X | (כלי 4 columns) | Text | (same as above) | Tool 4 all-or-nothing |

**Column detection:** Dynamic (by header keyword), not by position. Resilient to column reordering.

### 5.2 Response Sheet — Poll Responses (5 columns)

**Sheet:** "Form Responses 1"  
**Format:** RTL, auto-resized

| Col | Header | Type | Notes |
|-----|--------|------|-------|
| A | Timestamp | Text | Poll submission timestamp |
| B | שם - רישיון | Text | Format: "שם מלא - מס׳ רישיון" (parsed by refresh via split) |
| C | מגיע? | Text | כן or לא (yes/no) |
| D | כמות כדורים | Text | Bullet count (entered on poll) |
| E | הערות | Text | Notes/remarks |

**Upsert behavior:** `submitPollResponse()` checks if trainee already responded by name; if yes, updates row; if no, appends

### 5.3 Instructor Sheet — Instructor Lookup (5 columns)

**Sheet:** "מדריכים"  
**Format:** RTL, auto-resized, plain text (ת.ז., מ"מ, phone), Google Sheets Table (no regular filter)

| Col | Header | Type | Format | Notes |
|-----|--------|------|--------|-------|
| A | ת.ז. | Text | Plain text (@) | Instructor ID, primary key |
| B | שם מלא | Text | — | Full name |
| C | מ"מ | Text | Plain text (@) | License/instructor number |
| D | טלפון | Text | Plain text (@) | Phone (10 digits, 0XXXXXXXXX) |
| E | אימייל | Text | — | Email address |

**Lookup key:** `INSTRUCTOR_TZ` (hardcoded constant, e.g., '319253233')

**Workflow:** Dashboard and print page pull instructor name/מ"מ/ת.ז. via `getInstructorData(INSTRUCTOR_TZ)` for display in headers

### 5.4 Archive Sheets

**Sheet name format:** "dd/MM/yyyy" (e.g., "18/04/2026")  
**Created by:** `doResetPollResponses()` before clearing attendance  
**Content:** Copy of "סקר נוכחות וסיכום מגיעים" (10-column attendance table) from that session

---

## 6. Functions Reference

### 6.1 Request Routing

| Function | Purpose |
|----------|---------|
| `doGet(e)` | Main entry point; routes by `action` parameter; enforces `REQUIRE_LOGIN`, auth, rate limiting |
| `getAuthenticatedEmail()` | Returns logged-in user email or empty string |
| `isAdmin(email)` | Checks if email === `ADMIN_EMAIL` |
| `isAllowedUser(email)` | Validates email against whitelist/domain/admin |
| `checkRateLimit(email)` | Rate limiting via `CacheService`; returns true if allowed |

### 6.2 Authentication & Pages

| Function | Purpose |
|----------|---------|
| `getAccessDeniedHtml(reason)` | Styled Hebrew error page for auth failures |
| `getDashboardHtml()` | Main admin dashboard (HTML string) |
| `getLookupHtml(prefillTz)` | Registration/edit page (HTML string) |
| `getPollHtml()` | Attendance poll page (HTML string) |
| `getPrintHtml(sessionDate, instructorTz)` | Print-friendly A4 attendance page (HTML string) |

### 6.3 Spreadsheet I/O

| Function | Purpose | Called By |
|----------|---------|----------|
| `getTraineeData()` | Reads source sheet, returns array of trainee objects with dynamic column detection | `doRefreshAttending`, `debugTraineeData` |
| `lookupByTZ(tz)` | Searches source sheet raw data for ת.ז. (not via `getTraineeData`); returns trainee object or null | `getLookupHtml`, `getPollHtml`, registration/poll pages |
| `getInstructorData(tz)` | Looks up instructor by ת.ז. from instructor sheet; returns object with name, license, phone, email | Dashboard, print page, refresh |
| `getAllInstructors()` | Returns array of all instructors `[{tz, name, license}]` for dropdown | Dashboard HTML |
| `getExistingPollResponse(name)` | Looks up existing poll response by trainee name; returns object or null | Poll page (pre-fill) |

### 6.4 Trainee Data Management

| Function | Purpose | Validation |
|----------|---------|-----------|
| `addTraineeData(newData)` | Appends new trainee row to source sheet; checks duplicate ת.ז. | Client + server |
| `updateTraineeData(updatedData)` | Updates existing trainee row by ת.ז. match | Client + server |
| `validateTraineeData(data)` | Validates all fields: mandatory, format (digits, length), tool completeness | Called by add/update |

### 6.5 Poll Operations

| Function | Purpose |
|----------|---------|
| `submitPollResponse(responseData)` | Upsert: updates existing response by name, otherwise appends |
| `doGetStatus()` | Returns JSON: `{responseCount, attendingCount}` from poll sheet |

### 6.6 Attendance Workflow

| Function | Purpose | Called By |
|----------|---------|----------|
| `doRefreshAttending(sessionDate, instructorTz)` | Builds attendance sheet from "כן" responses; pulls trainee details, instructor info | Dashboard via `google.script.run` |
| `doResetPollResponses(sessionDate)` | Archives attendance sheet to date-named sheet; clears both attendance and poll sheets | Dashboard via `google.script.run` |

### 6.7 Setup & Utilities

| Function | Purpose | Manual |
|----------|---------|--------|
| `setupSpreadsheets()` | Creates both source and response sheets with correct headers, formatting, plain text columns | One-time setup or disaster recovery |
| `setupInstructorSheet()` | Creates/populates instructor sheet with headers, formatting (bold, RTL, plain text, auto-resize); converts to Google Sheets Table | One-time setup |
| `refreshAttending()` | Editor convenience wrapper for `doRefreshAttending` | Manual run in editor |
| `resetPollResponses()` | Editor convenience wrapper for `doResetPollResponses` | Manual run in editor |
| `normalizeId(val)` | Strips `.0` suffix and leading zeros for ת.ז./license comparison | Utility (normalization) |
| `normalizePhone(val)` | Restores leading `0` on 9-digit Israeli phone numbers | Utility (display) |
| `debugTraineeData()` | Logs column detection and trainee array for debugging | Manual run in editor |

### 6.8 Request Handler

| Function | Purpose |
|----------|---------|
| `serverCall(action, sessionDate, instructorTz)` | Dispatcher for dashboard `google.script.run` calls; accepts instructor TZ as 3rd param |

---

## 7. Key Data Flows

### 7.1 Registration Flow

```
1. Trainee navigates to ?action=register
2. Enters ת.ז., clicks "חיפוש"
3. Client: lookupByTZ(tz)
   ├─ If found → pre-fill edit form
   └─ If not found → show blank form (read-only ת.ז.)
4. Trainee fills form (name, phone, tools 1–4)
5. Client: validateTraineeData() → toast feedback
6. Clicks "שמירה"
7. Server: addTraineeData() or updateTraineeData()
   ├─ Validate again (all mandatory fields, format)
   ├─ Check duplicate ת.ז. (on add only)
   ├─ Store ת.ז. and phone as String() to preserve leading zeros
   └─ Append or update row in source sheet
8. Redirect to poll page or success message
```

### 7.2 Attendance Poll Flow

```
1. Trainee navigates to ?action=poll
2. Enters ת.ז., clicks "שלח"
3. Client: lookupByTZ(tz) → if not found, show registration link
4. Server: getExistingPollResponse(name)
   ├─ Submit button disabled ("טוען...") until response loads
   └─ If found, pre-fill form + show yellow "update/cancel" banner
5. Trainee selects tool, כן/לא, bullet count, notes
6. License expiry check on form load and tool change
   ├─ If expired → red overlay popup blocks submission
   └─ Safety net: check again in doSubmit()
7. Trainee clicks "שלח"
8. Server: submitPollResponse() → upsert to poll sheet
9. Confirmation message + link back to poll or dashboard
```

### 7.3 Refresh Attendance Flow

```
1. Admin clicks "רענון רשימת מגיעים" on dashboard
2. Client: serverCall('refresh', sessionDate, instructorTz)
3. Server: doRefreshAttending(sessionDate, instructorTz)
   ├─ Read poll responses from "Form Responses 1"
   ├─ Build licenseMap from source sheet
   ├─ For each "כן" response:
   │  ├─ Parse "שם - רישיון" into name + license
   │  ├─ Normalize license (normalizeId)
   │  └─ Look up trainee by license in licenseMap
   ├─ Extract bullet count from poll column D
   ├─ Fetch instructor data via getInstructorData(instructorTz)
   ├─ Generate 10-column formatted sheet
   └─ Write to "סקר נוכחות וסיכום מגיעים" (create if needed)
4. Toast success message
```

### 7.4 Reset Poll Flow

```
1. Admin clicks "איפוס הסקר לאימון הבא" (confirmation dialog)
2. Client: serverCall('reset', sessionDate)
3. Server: doResetPollResponses(sessionDate)
   ├─ Copy "סקר נוכחות וסיכום מגיעים" to new sheet "dd/MM/yyyy"
   ├─ Delete rows in "סקר נוכחות וסיכום מגיעים" (keep header)
   ├─ Delete rows in "Form Responses 1" (keep header)
   └─ Poll sheet ready for next session
4. Toast success message
```

### 7.5 Print Attendance Flow

```
1. Admin selects session date and instructor from dropdown
2. Clicks "🖨️ הדפסה"
3. openPrintPage() opens new tab: ?action=print&sessionDate=...&instructorTz=...
4. Server: getPrintHtml(sessionDate, instructorTz)
   ├─ Fetch instructor data via getInstructorData(instructorTz)
   ├─ Fetch attendance sheet data (if refresh was run)
   ├─ Generate A4 landscape RTL HTML
   │  ├─ Header: logo (base64) on left, title/date/instructor on right
   │  └─ 10-column attendance table (gray header, alternating rows)
   └─ Return to browser
5. Browser print dialog (Ctrl+P or 🖨️)
6. Print to PDF or physical printer
```

---

## 8. UI Design & Experience

### 8.1 Dark Theme (Consistent Across All Pages)

```
Background:    #0f172a (dark navy)
Card:          #1e293b (dark slate)
Border:        #334155 (slate)
Text:          #e2e8f0 (light gray)
Accent:        #3b82f6 / #60a5fa (blue)
Success:       #16a34a / #4ade80 (green)
Error:         #dc2626 / #f87171 (red)
Warning:       #fbbf24 (yellow)
```

### 8.2 RTL Hebrew Layout

All pages are `dir="rtl" lang="he"`. Text flows right-to-left. Tables and forms respect RTL.

### 8.3 Special UI Elements

| Element | Purpose | Pages |
|---------|---------|-------|
| **Expired license overlay** | Full-screen red popup with ⛔ icon; blocks form submission | Poll |
| **Existing response banner** | Yellow banner; explains "כן" is active or "לא" can be updated | Poll |
| **Instructor dropdown** | Multi-select from `getAllInstructors()` | Dashboard |
| **WhatsApp share button** | Green button; opens `wa.me/?text=...` | Dashboard |
| **Access denied pages** | 4 variants (not logged in, not allowed, rate limited, admin only) | All (when REQUIRE_LOGIN=true) |

### 8.4 Dashboard Layout (Admin Only)

```
Header:        Imun Logo + "לוח בקרה - ניהול אימוני ירי"
Instructions:  Workflow steps (1–5) in timeline format
Instructor:    Dropdown to select instructor + "✏️" edit button
Status:        Response count, attending count, last refresh time
Actions:       Three buttons (refresh, reset, print) + WhatsApp share
Links:         Direct URLs to registration, poll, spreadsheets
```

### 8.5 Registration Form Layout

```
ת.ז. Search:   Text field + "חיפוש" button
Form Section:  If found or new:
  - שם מלא (text)
  - ת.ז. (read-only if existing)
  - טלפון (text)
  - כלי 1–4: each has 5 fields (license, expiry, type, serial, caliber)
  - "שמירה" button
```

### 8.6 Poll Form Layout

```
ת.ז. Lookup:   Text field + "לא זכור את הת.ז.?" link
Form Section:  If found:
  - Greeting "שלום [שם]"
  - Tool selector (if multiple)
  - כן / לא radio buttons
  - כמות כדורים (numeric)
  - הערות (textarea)
  - "✏️ עריכת פרטים אישיים" edit link (opens registration with ת.ז. pre-filled)
  - "שלח" button (disabled until existing response check completes)
  - Yellow banner if existing response found
```

---

## 9. Known Limitations (Led to v3)

### 9.1 Single Poll at a Time

- Only one active poll per response spreadsheet ("Form Responses 1")
- Cannot run concurrent training sessions
- Workaround: use separate response spreadsheets per training group (manual)

### 9.2 Manual Refresh/Reset Workflow

- Admin must click "refresh" button after all trainees have submitted
- Admin must click "reset" button before next session
- No automatic polling closure or session boundaries
- Risk of stale attendance sheet if refresh not triggered

### 9.3 No Session Isolation

- Poll responses and attendance are not tied to specific session IDs
- Trainee name + license used as upsert key (fragile if name/license changes)
- No way to run two independent polls for different training groups simultaneously

### 9.4 Single Instructor Hardcoded

- `INSTRUCTOR_TZ` is a constant, not a request parameter (except on print page)
- Instructor data pulled from instructor sheet, but only one "active" instructor at a time
- Multi-instructor support requires multiple deployments or constant toggling

### 9.5 No Admin Audit Trail

- No log of who approved/rejected attendees
- No override capability (admin can only refresh from poll, not manually add/remove)
- Attendance sheet is final output, not editable

### 9.6 Scalability Issues

- All code in one file (3000+ lines) — difficult to maintain
- Column detection via string matching in source sheet (brittle if headers change)
- No database abstraction — direct Sheets API calls throughout

---

## 10. Deployment & Maintenance

### 10.1 Initial Deployment

1. Create new Google Apps Script project
2. Copy `code.gs` entirely
3. Deploy as Web app (Execute as: Me, Who has access: Anyone)
4. Update `WEBAPP_URL` constant
5. Run `setupSpreadsheets()` to create source + response sheets
6. Run `setupInstructorSheet()` to create instructor sheet
7. Update `SOURCE_SHEET_ID`, `RESPONSE_SHEET_ID`, `INSTRUCTOR_SHEET_ID` constants
8. Redeploy with updated constants

### 10.2 Code Updates

1. Edit `code.gs` locally
2. Increment `SCRIPT_VERSION` patch number (Rule 3)
3. Select all and paste into Apps Script editor
4. Save (Ctrl+S)
5. Deploy > Manage deployments > edit active > New version > Deploy
6. Clear browser cache to test

### 10.3 Disaster Recovery

- **Trainee data backup:** Export source sheet to CSV
- **Response data backup:** Keep archive sheets in response spreadsheet
- **Spreadsheet recreation:** Run `setupSpreadsheets()` to recreate with same headers
- **Restore trainee data:** Paste CSV into source sheet starting Row 2, format ת.ז./phone as plain text

---

## 11. Migration Path to v3+

v3 introduced:
- **Session concept** — timestamp-based session IDs for isolation
- **Role-based access control** — Owner, Admin, Instructor, Trainee
- **Multi-instructor support** — multiple instructors per session
- **Modularized code** — separate files for constants, HTML, functions
- **Concurrent polls** — run multiple sessions simultaneously

**Backward compatibility:** v2 databases could be migrated to v3 by adding session columns and reframing the instructor selection as session parameters.

---

## 12. Summary

v2 was a complete, functional single-instructor system that proved the concept of custom HTML polls over Google Forms. It served well for single-location training groups but hit architectural limits:

- **Single poll** forced manual session management
- **Hardcoded instructor** required multiple deployments for multiple groups
- **Single file** made code maintenance difficult
- **No session boundaries** created no isolation for concurrent use

v3 redesigned the system to address these limitations while keeping the proven data schemas and user flows intact. v2's lessons informed v3's architecture: role-based access, session isolation, instructor flexibility, and modular code structure.

---

**Last reconstructed:** 2026-04-18  
**Original final version:** 2.13.8 (March 2026)
