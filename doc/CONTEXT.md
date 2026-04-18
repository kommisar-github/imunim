# CONTEXT.md — Shooting Training Attendance System (v5.2.0)

## 1. Project Overview

**אימון ירי** (Shooting Training) is a Google Apps Script web application for managing attendance at shooting training sessions with multi-instructor support.

- **Purpose**: Track trainee attendance, weapons/tools, and session management
- **Architecture**: Google Apps Script web app deployed as public URL with Hebrew RTL interface
- **Version**: 5.2.0 (4-tier role system: owner/admin/instructor/trainee, suspension management, simplified auth, unified CSS, GAS iframe mobile zoom fix)
- **Interface**: Dark theme, responsive design, Hebrew right-to-left layout
- **Target Users**: Owners (system config), admins (overview & management), instructors (session management), trainees (registration & attendance poll)

## 2. Rules (CRITICAL)

### Rule 1: Do Not Change Approved Visual Formatting/Layout
The UI design, color scheme, spacing, and card layouts are finalized. Any modifications to visual appearance require explicit approval before implementation.

### Rule 2: Edit Locally, User Copies to Web — Agent Must NOT Inject Code into GAS Editor
- All .gs files must be edited in the local repository (`/sessions/amazing-vibrant-thompson/mnt/ClaudeCowork/Imun/Multi/`)
- The user copies updated files to the Google Apps Script editor manually (or via `clasp push`)
- **DO NOT** attempt to modify code directly in the GAS web editor
- This preserves version control and prevents conflicts

### Rule 3: Increment Patch Version on Every Edit
- **CRITICAL**: Every .gs file contains a version comment header at the top: `// v5.2.0`
- All .gs files share the SAME version number
- The config.gs file contains `var SCRIPT_VERSION = '5.2.0';`
- On every code modification, increment the patch version (5.2.0 → 5.2.1) in:
  1. Comment headers in ALL .gs files (config.gs, routing.gs, data.gs, pages.gs, setup.gs, logo.gs, backup.gs)
  2. The `SCRIPT_VERSION` constant in config.gs
- This ensures version consistency and tracks deployment history

## 3. File Structure

```
Imun/Multi/
├── config.gs           — Constants, sheet IDs, URLs, OTP settings (~34 lines)
├── routing.gs          — doGet(e) router with OTP gate flows (~121 lines)
├── data.gs             — All data functions: sessions, trainees, instructors, poll, OTP auth, admin, suspensions, owner (~1665 lines)
├── pages.gs            — All HTML page generators: shared CSS (getBaseCSS), zoom (getZoomScript), 7 page generators (~1300 lines)
├── setup.gs            — Sheet setup/initialization + trigger management (~305 lines)
├── logo.gs             — LOGO_BASE64 constant (~110KB)
├── backup.gs           — Scheduled daily backup to Google Drive (~144 lines)
├── doc/                — Project documentation
│   ├── CONTEXT.md          — This file
│   ├── MULTI_DESIGN.md     — Design document
│   ├── MULTI_SETUP.md      — Deployment guide
│   ├── PLAN_v5.md          — v5.0 implementation plan
│   ├── ROADMAP_v5.md       — Roadmap and status
│   ├── DOC_GUIDELINES.md   — Manual formatting specs
│   ├── AUDIT_v5011.md      — v5.0.11 audit report
│   └── GUI_GUIDELINES.md   — GAS iframe rendering, mobile detection, CSS zoom, shared CSS architecture
├── manuals/            — User-facing manuals (.docx)
│   ├── מדריך_למדריך_v5012.docx      — Instructor manual (Hebrew)
│   ├── Instructor_Manual_v5012.docx  — Instructor manual (English)
│   ├── מדריך_למנהל_v5012.docx       — Admin manual (Hebrew)
│   └── מדריך_למתאמן_v5012.docx      — Trainee manual (Hebrew)
└── (Other reference files)
   ├── Imun/code.gs           — Original v2.13.8 single-instructor (reference only)
   └── Imun/code_multi.gs     — v3.0.4 pre-split monolithic file (reference only)
```

## 4. Apps Script Project

| Property | Value |
|----------|-------|
| **Script ID** | `1fQfzX3zYecdbL6qkK3PW2txSBI4pKFeRCNOCjRKUKVqsD4OdNh8G1wPS` |
| **Editor URL** | `https://script.google.com/d/1fQfzX3zYecdbL6qkK3PW2txSBI4pKFeRCNOCjRKUKVqsD4OdNh8G1wPS/edit` |
| **Deployed URL** | `https://script.google.com/macros/s/AKfycbygdC5WloMaLUJ8xN3zmRihr8_bUAVus9arG071q5VUIbs_vrAo_kTXwCPF0tGB9ytI/exec` |
| **Deployment Type** | Public web app |

## 5. Spreadsheets

All 4 supporting spreadsheets with complete schema:

### 5.1 Source Sheet (מאגר מתאמנים) — Trainee Registry
- **Sheet ID**: `182Kp5-vTABvRZ8VA3W0rqhAs5933yqe1YNdN61w-ACo`
- **Tab Name**: `Form Responses 1`
- **URL**: `https://docs.google.com/spreadsheets/d/182Kp5-vTABvRZ8VA3W0rqhAs5933yqe1YNdN61w-ACo/edit`
- **Columns** (left to right):
  1. Timestamp (auto-filled by form)
  2. שם מלא (Full Name)
  3. ת.ז. (ID Number)
  4. טלפון (Phone)
  5. **אימייל** (Email — Column E, silently captured from Google session)
  6-9. **Tool Group 1**: מס׳ רישיון, בתוקף עד, סוג כלי, מספר כלי, קוטר
  10-13. **Tool Group 2**: מס׳ רישיון, בתוקף עד, סוג כלי, מספר כלי, קוטר
  14-17. **Tool Group 3**: מס׳ רישיון, בתוקף עד, סוג כלי, מספר כלי, קוטר
  18-21. **Tool Group 4**: מס׳ רישיון, בתוקף עד, סוג כלי, מספר כלי, קוטר
  22. **סטטוס** (Status — Column V): פעיל/מושעה/לא פעיל. Data validation dropdown.
  23. **סיבת השעיה** (Suspension Reason — Column W): Free text, populated when suspended
  24. **תאריך השעיה** (Suspension Date — Column X): Date when suspended
  25. **דא** (Simplified Auth — Column Y): `כן` = bypass OTP for non-Gmail trainees. No dropdown — owner sets manually. Hidden feature.

### 5.2 Response Sheet (תשובות סקר) — Poll Responses
- **Sheet ID**: `1wl4lUd3_XKLGDY58jilUae43xIH8BJtnGOgNmuF-SAQ`
- **Tab Name**: `Form Responses 1`
- **URL**: `https://docs.google.com/spreadsheets/d/1wl4lUd3_XKLGDY58jilUae43xIH8BJtnGOgNmuF-SAQ/edit`
- **Columns**:
  1. Timestamp (auto-filled)
  2. שם - רישיון (Name - License #)
  3. מגיע? (Attending? — Yes/No)
  4. כמות כדורים (Bullet Count)
  5. הערות (Notes)
  6. מזהה אימון (Session ID — injected by server)

### 5.3 Instructor Sheet (מדריכים) — Instructor Registry
- **Sheet ID**: `1jTnZacJEKGiksJJfaIPB3sp29uHjsfrGv1Vic6v4Gls`
- **Tab Name**: `מדריכים`
- **URL**: `https://docs.google.com/spreadsheets/d/1jTnZacJEKGiksJJfaIPB3sp29uHjsfrGv1Vic6v4Gls/edit`
- **Columns**:
  1. ת.ז. (ID Number — Unique Key)
  2. שם מלא (Full Name)
  3. מ"מ (Deputy/Alternate — Yes/No)
  4. טלפון (Phone)
  5. אימייל (Email)
  6. **אדמין** (Admin — Column F): `כן` = instructor has admin access. Data validation dropdown.

### 5.4 Sessions Sheet (לוח אימונים) — Session Log
- **Sheet ID**: `1hrsIxwkckoc_Od4gSinM07XiRVhiSo9pYW2--bbBumI`
- **Tab Name**: `אימונים`
- **URL**: `https://docs.google.com/spreadsheets/d/1hrsIxwkckoc_Od4gSinM07XiRVhiSo9pYW2--bbBumI/edit`
- **Columns**:
  1. מזהה אימון (Session ID — Format: `YYYYMMDD-{tz}`)
  2. תאריך אימון (Session Date — dd/MM/yyyy)
  3. מדריך ת.ז. (Instructor ID — main instructor)
  4. מדריך שם (Instructor Name)
  5. סטטוס (Status — `פעיל` active or `סגור` closed)
  6. הערות (Notes)
  7. נוצר בתאריך (Created Date — timestamp)
  8. **מ"מ 1 ת.ז.** (Deputy 1 ID — optional)
  9. **מ"מ 2 ת.ז.** (Deputy 2 ID — optional)

### 5.5 Suspension Reasons Sheet (סיבות השעיה) — v5.0.5
- **Sheet ID**: `1E3htH5udGPwgnqvOC6cJbtEjG0cva1EdDG_v1SByENQ`
- **Tab Name**: `סיבות השעיה`
- **URL**: `https://docs.google.com/spreadsheets/d/1E3htH5udGPwgnqvOC6cJbtEjG0cva1EdDG_v1SByENQ/edit`
- **Columns**:
  1. סיבה (Reason text)
  2. פעיל (Active — כן/לא)

## 6. Routes (doGet Router)

All navigation controlled by `routing.gs` `doGet(e)` function:

| Route | Handler | Auth | Description |
|-------|---------|------|-------------|
| (none) | `getLandingHtml()` | Public | Landing page with 3 navigation cards |
| ?action=register | `getLookupHtml(prefillTz)` | Public | Trainee registration/update form with ת.ז. lookup |
| ?action=poll | `getPollHtml(sessionId)` | Public | Session picker + attendance form with tool selector |
| ?action=instructor | `getInstructorDashboardHtml()` | Client-side OTP/Google | Instructor dashboard (auth handled by OTP flow) |
| ?action=admin | `getAdminDashboardHtml()` | Client-side TZ + OTP/Google | Admin dashboard (4-tier: admin sees management, owner sees DB links) |
| ?action=print&session=ID | `getPrintHtml(sessionId)` or `getPrintOtpGateHtml(sessionId)` | Google session or OTP gate | Print attendance page |
| ?action=printVerified&session=ID&token=T | `getPrintHtml(sessionId)` | One-time token (60s) | Print page after OTP verification |
| ?action=status&session=ID | `doGetStatus(sessionId)` | Called from authenticated dashboard | Status JSON: `{success, total, attending}` |
| ?action=debug | Debug info page | Owner email (v5.0.12) | Diagnostic: shows email, auth status, config. Gated behind `OWNER_EMAILS` check |

## 7. Function Inventory

Complete list of every function organized by file:

### config.gs
**No functions** — Constants and configuration only.

### routing.gs
- **`doGet(e)`** — Main router dispatcher. Parses `e.parameter.action` and `e.parameter.session`/`e.parameter.tz`, dispatches to appropriate page handler.

### data.gs (~1665 lines)

#### Authentication & Security
- **`isAdminByTz(tz)`** — NEW (v5.0.0). Checks instructor sheet column F (אדמין) for `כן`. Returns true if instructor has admin access.
- **`isOwnerByTz(tz)`** — NEW (v5.0.9). Looks up instructor email by TZ, checks against `OWNER_EMAILS` array. Returns true if instructor is system owner.
- **`isSimplifiedAuth(tz)`** — NEW (v5.1.0). Reads trainee column Y (דא). Returns true if value is `כן` AND trainee email is NOT Gmail. Used to bypass OTP for specific non-Gmail trainees.
- **`isAuthorizedEmail(email)`** — Returns true if email matches any OWNER_EMAILS entry or any instructor's email in instructor sheet.
- **`isSessionAuthorized(email, sessionId)`** — (v4.2.0). Returns true if email belongs to the main instructor of the session, either deputy of the session, or admin.
- **`isSessionAuthorizedByTz(tz, sessionId)`** — (v4.2.3). Like `isSessionAuthorized` but takes ת.ז. instead of email.
- **`checkInstructorAuth(tz)`** — (v4.2.3). Checks if instructor can be authenticated via Google session. Returns `{authenticated: true}` if Google email matches, `{authenticated: false, needsOtp: true}` if no Google session, or error message if email mismatch.
- **`backfillTraineeEmail(traineeName)`** — Updates source sheet email column if empty, using `Session.getActiveUser().getEmail()`.

#### Instructor OTP Authentication (v4.2.3)
- **`requestInstructorOTP(tz)`** — Looks up instructor by ת.ז., sends OTP to their registered email via `MailApp.sendEmail()`. Uses cache keys `otp-inst-{tz}` and `otp-block-inst-{tz}`. Returns `{success, maskedEmail}`.
- **`verifyInstructorOTP(tz, code)`** — Verifies instructor OTP code, issues print token on success. Returns `{success, printToken}` where token is UUID cached for 60 seconds.
- **`issuePrintToken(tz, sessionId)`** — Issues a 60-second one-time token for already-authenticated instructors to access the print page. Called from dashboard's print button.

#### Trainee OTP (One-Time Password) — Hybrid Email Verification
- **`maskEmail(email)`** — Returns masked email format: `a***b@example.com`. Used for privacy in OTP UI.
- **`generateOTP()`** — Returns random 6-digit string code.
- **`requestOTP(tz)`** — Looks up trainee's stored email by ת.ז., generates OTP, stores in `CacheService.getScriptCache()` with TTL, sends via `MailApp.sendEmail()` with styled HTML template. Returns `{success, maskedEmail}`.
- **`requestOTPForEmail(tz, email)`** — For trainees without stored email. Validates email format, generates OTP, sends to provided email. On success, stores email in source sheet. Returns `{success, maskedEmail}`.
- **`verifyOTP(tz, code)`** — Checks OTP code against cache. Handles attempt counting and blocking (max 3 attempts, 15min block). On success, returns full trainee data via `getVerifiedTraineeData()`.
- **`getVerifiedTraineeData(tz)`** — Returns trainee data bypassing auth checks. Called only after successful OTP verification.

#### Session Management
- **`parseSessionRow(data, i)`** — NEW (v4.2.0). Shared helper function that parses a session row from the sheet and returns session object with `deputy1Tz`, `deputy2Tz` fields (columns H and I).
- **`generateSessionId(dateStr, instructorTz)`** — Returns session ID in format `YYYYMMDD-{tz}`. Parses dd/MM/yyyy and validates instructor TZ.
- **`getActiveSessions()`** — Returns all sessions with status=`פעיל`, sorted by date ascending. Reads up to 9 columns (includes deputy fields). Used by poll page. Returns sessions with `role: 'main'`.
- **`getAllSessions()`** — Returns all sessions regardless of status, sorted by date descending. Reads up to 9 columns (includes deputy fields). Used by admin view.
- **`getInstructorSessions(instructorTz)`** — Returns sessions where `instructorTz` is the main instructor or a deputy, sorted by date descending. NEW (v4.2.0): Sets `role: 'main'` for sessions where tz is main instructor, `role: 'deputy'` for sessions where tz is deputy 1 or 2.
- **`createSession(dateStr, instructorTz, notes, deputy1Tz, deputy2Tz)`** — Creates new session row in sessions sheet. NEW (v4.2.0): Accepts 2 optional deputy parameters. Checks for duplicates. Validates date format and instructor existence.
- **`closeSession(sessionId)`** — Sets session status to `סגור`. Validates session exists.
- **`autoClosePastSessions()`** — NEW (v4.2.4). Iterates all active sessions, closes any where session date is before today (Israel timezone). Sends error email to `ADMIN_EMAILS[0]` on failure. Called by daily trigger at ~02:00.
- **`notifyAdminSessionEvent(eventType, dateStr, instructorName, instructorTz, deputy1Tz, deputy2Tz)`** — NEW (v4.2.5). Sends email notification to all `ADMIN_EMAILS` when a session is opened or closed. Includes date, instructor name, and deputy names. Called from `createSession()` and `closeSession()`. Wrapped in try/catch — failures are logged but don't block the session operation.

#### Poll Data
- **`getSessionResponseCount(sessionId)`** — Returns count of poll responses (rows) for a given session.
- **`getExistingPollResponse(traineeName, sessionId)`** — Checks if trainee already submitted response for session. Returns row index or -1.
- **`submitPollResponse(responseData)`** — Saves or updates poll response. ResponseData object includes `traineeName`, `attending`, `bullets`, `notes`, `sessionId`. Appends new row or updates existing. **Calls `backfillTraineeEmail()` to capture email for existing trainees.**
- **`doGetStatus(sessionId)`** — Returns JSON `{success, total, attending}` for session. Used by status endpoint.
- **`getSessionResponses(sessionId)`** — NEW (v4.2.9). Returns all poll responses for a session as array of `{name, trainee, attending, bullets, notes, rowIndex}`. Used by instructor attendance override UI.
- **`updateSessionResponse(sessionId, traineeName, attending, bullets)`** — NEW (v4.2.9). Updates a single trainee's attendance and bullet count in the response sheet. Matches by session ID + trainee name. Used by instructor attendance override.

#### Trainee Data
- **`getTraineeData()`** — Returns all trainees as object: `{name: {num, name, tz, phone, tools[]}}`. Parses source sheet, skips header.
- **`lookupByTZ(tz)`** — Finds trainee by ת.ז., returns `{found, name, tz, phone, tools}`. Tools is array of 4 objects (license, expiry, type, serial, diameter). **Hybrid auth**: if Google session email present + stored email exists → verify match; if no Google session + stored email → return `{needsOTP:true, maskedEmail}`; if no Google session + no stored email → return `{needsEmail:true, name}`.
- **`validateTraineeData(data)`** — Validates trainee object fields. Returns error string or null. Checks: name, tz, phone required; phone is 10 digits; tools have license if populated.
- **`addTraineeData(newData)`** — Appends new trainee row to source sheet. Does NOT check duplicates — caller responsibility. **Silently captures Google session email to אימייל column.**
- **`updateTraineeData(updatedData)`** — Finds and updates existing trainee row by ת.ז. **Updates Google session email on every edit. Preserves status/suspension columns (V-X) on trainee self-edit (v5.0.12).**

#### Trainee Status & Suspension (v5.0.0+)
- **`getTraineeStatus(tz)`** — Returns trainee status from column V (פעיל/מושעה/לא פעיל).
- **`updateTraineeStatus(tz, status, reason, date)`** — Updates trainee status, suspension reason, and date columns (V-X).
- **`getSuspendedTrainees()`** — Returns list of all trainees with status `מושעה`. Used by admin suspension panel.
- **`resolveTraineeSuspension(tz)`** — Changes trainee status from `מושעה` back to `פעיל`, clears suspension reason/date.

#### Suspension Reasons (v5.0.5+)
- **`getSuspensionReasons()`** — Returns all reasons from suspension reasons sheet.
- **`getActiveSuspensionReasons()`** — Returns only active reasons (column B = `כן`).
- **`addSuspensionReason(reason)`** — Adds new reason to suspension reasons sheet.
- **`toggleSuspensionReason(index, active)`** — Toggles reason active/inactive status.

#### Instructor Data
- **`getInstructorData(tz)`** — Returns one instructor's record: `{tz, name, deputy, phone, email}`. Looks up by ת.ז. in instructor sheet.
- **`getAllInstructors()`** — Returns array of all instructors: `[{tz, name, deputy, phone, email}, ...]`.

#### Utilities
- **`normalizeId(val)`** — Normalizes ID number: strips leading zeros, removes `.0` suffix (from numeric cells). Returns string.
- **`normalizePhone(val)`** — Normalizes phone number: removes hyphens/spaces, adds leading `0` if missing. Returns 10-digit string.
- **`parseDate(dateStr)`** — Parses dd/MM/yyyy to JavaScript Date object. Used for date validation.

### pages.gs (~1300 lines)

#### Shared Functions (v5.2.0)
- **`getBaseCSS()`** — Returns shared CSS string used by all pages. Single source of truth for: reset, body, container, section cards, headings, fields (label/input/select/focus/readonly), buttons (all color variants + disabled), toast, spinner. See `doc/GUI_GUIDELINES.md` §5.1 for full contents.
- **`getZoomScript(desktopMaxWidth, adminFlag)`** — Returns `<script>` tag with mobile zoom detection. Compares `window.innerWidth` vs `screen.width` to detect GAS iframe on mobile, applies CSS `zoom`. `desktopMaxWidth` sets container max-width on desktop. `adminFlag` sets `window._adminZoomed` for conditional zoom removal. See `doc/GUI_GUIDELINES.md` §3-4.

#### Navigation & Landing
- **`getLandingHtml()`** — Landing page with 3 navigation cards: "הרשמה" (Register), "סקר נוכחות" (Poll), "הוראה" (Instructor). Uses `getBaseCSS()` + `getZoomScript()`. Top-aligned (not vertically centered).

#### Trainee Pages
- **`getLookupHtml(prefillTz)`** — Registration page. TZ entry in centered `.section` card (matches instructor/admin login style). Includes ת.ז. lookup, edit mode, all trainee fields, OTP flow. **Checks trainee status (v5.0.0)** — blocks suspended trainees. **Supports simplified auth (v5.1.0)** — skips OTP if `דא=כן` for non-Gmail. **Supports admin edit mode** — `?tz=X` from admin dashboard bypasses OTP (v5.0.3). Uses `getBaseCSS()` + `getZoomScript('520px')`.
- **`getPollHtml(sessionId)`** — Attendance poll page. Session picker, attendance form, tool selector, OTP flow. **Checks trainee status** — blocks suspended trainees. **Supports simplified auth**. Uses `getBaseCSS()` + `getZoomScript('520px')`.

#### Instructor & Admin Pages
- **`getInstructorDashboardHtml()`** — Instructor login + session management. Login by TZ with OTP fallback. Session table with create/share/WhatsApp/print/close/attendance buttons. **Includes admin link** (v5.0.0) — if instructor has admin flag, shows "לוח ניהול" button. Uses `getBaseCSS()` + `getZoomScript('900px')`.
- **`getAdminDashboardHtml()`** — Admin dashboard (v5.0.0 rewrite). TZ login with OTP. 4 sections: sessions, instructors, trainees, suspensions. **Owner-only panels** (v5.0.9): spreadsheet links, suspension reasons management — visible only to `isOwnerByTz()`. **Conditional zoom** (v5.1.9): zoom applied during TZ login, removed when entering dashboard (complex tables break with zoom). Uses `getBaseCSS()` + `getZoomScript(null, true)`.

#### Reporting
- **`getPrintHtml(sessionId)`** — A4 landscape attendance printout. Reads poll responses filtered by sessionId, formats as attendance table with instructor, date, trainee names, attending status, bullets. Returns complete HTML page with print CSS.
- **`getPrintOtpGateHtml(sessionId)`** — NEW (v4.2.3). Standalone OTP gate page for print access when no Google session. Two-step: enter ת.ז. → verify against `isSessionAuthorizedByTz` → send OTP → verify → redirect to `printVerified` with one-time token.

### setup.gs (~305 lines)

#### Sheet Initialization
- **`setupSourceSheet()`** — Initializes/formats source spreadsheet. Creates headers incl. status columns (V-X) and דא column (Y). Adds data validation dropdowns for status. `SpreadsheetApp.flush()` for Table compatibility.
- **`setupResponseSheet()`** — Initializes/formats response spreadsheet. Creates headers, formats poll response columns. Data validation dropdowns.
- **`setupInstructorSheet()`** — Initializes/formats instructor spreadsheet. Creates headers incl. אדמין column (F). Data validation dropdowns.
- **`setupSessionsSheet()`** — Initializes/formats sessions spreadsheet. Creates headers, sets column formats. Data validation dropdowns.
- **`setupSuspensionReasonsSheet()`** — NEW (v5.0.5). Creates/formats suspension reasons spreadsheet with headers and validation.
- **`setupAll()`** — Runs all 5 setup functions in sequence. **Installs triggers** (v5.0.9).

#### Auto-Close Trigger Management (v4.2.4)
- **`installAutoCloseTrigger()`** — Creates a daily time-driven trigger running `autoClosePastSessions` at ~02:00 Israel time. Removes any existing auto-close trigger first.
- **`removeAutoCloseTrigger()`** — Removes the auto-close trigger by handler function name.

#### Debugging
- **`debugTraineeData()`** — Debug helper. Logs first 5 trainees and their tool info to browser console.

### logo.gs (~110KB)

- **`LOGO_BASE64`** — Large Base64 encoded image constant. Contains encoded logo image used in HTML pages (typically as base64 data URI in `<img>` tags).

## 8. Data Flow

### Trainee Registration Flow
```
User visits: ?action=register
  ↓
getLookupHtml() renders registration form
  ↓
User enters ת.ז., clicks "חפש" (Search)
  ↓
Client-side: google.script.run.lookupByTZ(tz)
  ↓
Server: lookupByTZ() queries source sheet
  ↓
Returns: {found, name, tz, phone, tools}
  ↓
Client-side: populate form with data (edit mode if found, add mode if not)
  ↓
User updates fields (name, phone, tools)
  ↓
Client-side: google.script.run.submitTraineeData(data)
  ↓
Server: validateTraineeData() → addTraineeData() or updateTraineeData()
  ↓
Source sheet updated
  ↓
Success message displayed
```

### Poll Submission Flow
```
User visits: ?action=poll
  ↓
getPollHtml() renders poll page with session dropdown
  ↓
Client-side: google.script.run.getActiveSessions()
  ↓
Server: getActiveSessions() queries sessions sheet
  ↓
Returns: [{sessionId, date, instructor, status}, ...]
  ↓
Client-side: populate session dropdown
  ↓
User selects session, enters name + attendance + bullets + notes
  ↓
User selects tool (from loadout selector)
  ↓
Client-side: google.script.run.submitPollResponse({...})
  ↓
Server: getExistingPollResponse() → submitPollResponse()
  ↓
Response sheet updated (new row or updated existing)
  ↓
Success message displayed
```

### Session Creation & Management Flow
```
User visits: ?action=instructor
  ↓
getInstructorDashboardHtml() renders login + session table
  ↓
User enters ת.ז. + name, clicks "כניסה" (Login)
  ↓
Client-side: google.script.run.getInstructorSessions(tz)
  ↓
Server: getInstructorSessions() queries sessions sheet
  ↓
Returns: [{sessionId, date, status, notes}, ...]
  ↓
Client-side: populate session table
  ↓
User creates new session: date + notes, clicks "צור אימון" (Create)
  ↓
Client-side: google.script.run.createSession(date, tz, notes)
  ↓
Server: generateSessionId() + createSession() → sessions sheet
  ↓
New session created, table refreshed
  ↓
User clicks share/WhatsApp/print/close buttons on session rows
  ↓
Handlers: buildShareMsg() → clipboard/wa.me or doGetStatus() → print page or closeSession()
```

### Print Flow
```
User clicks "הדפס" (Print) on session
  ↓
Navigation: ?action=print&session=YYYYMMDD-{tz}
  ↓
getPrintHtml(sessionId) executed
  ↓
Server: reads response sheet filtered by sessionId
  ↓
Server: reads source sheet for trainee details
  ↓
Returns: formatted A4 landscape table (instructor, date, attendees, bullets)
  ↓
Browser: user triggers print preview (Ctrl+P)
  ↓
A4 landscape layout printed
```

### Share Flow
```
User clicks "שתף" (Share) on session
  ↓
Client-side: google.script.run.buildShareMsg(sessionId, dateStr)
  ↓
Server: retrieves session details + attendance count
  ↓
Returns: formatted message "אימון ירי ב-{date}..."
  ↓
Client-side: copies to clipboard (or opens wa.me link)
  ↓
User pastes/sends message
```

### Security Flow
```
Any request → doGet(e)
  ↓
Check REQUIRE_LOGIN flag
  ↓
If protected route (instructor, admin, print, status):
  ↓
Session.getActiveUser().getEmail() → get user's Google email
  ↓
isAuthorizedEmail(email) or isAdminEmail(email) → verify access
  ↓
If authorized: render page/data
  ↓
If unauthorized: return "Access denied"
```

### Trainee Email Capture Flow
```
Trainee registration: form submission
  ↓
Client-side: google.script.run.submitTraineeData(data)
  ↓
Server: addTraineeData() called
  ↓
Session.getActiveUser().getEmail() → capture Google email
  ↓
Append to אימייל column (Column E) in source sheet
  ↓
On trainee update: updateTraineeData() updates email
  ↓
On poll submission: backfillTraineeEmail() captures email if empty
```

### Trainee Identity Verification (Hybrid Auth)
```
Trainee attempts lookup: lookupByTZ(tz)
  ↓
Try Session.getActiveUser().getEmail()
  ↓
CASE 1: Google email present + stored email exists
  ↓ Compare emails
  If match → allow lookup, return trainee data
  If mismatch → block (impersonation attempt)
  ↓
CASE 2: Google email present + no stored email
  ↓ Proceed normally (email captured on save)
  ↓
CASE 3: No Google email + stored email exists
  ↓ Return {needsOTP:true, maskedEmail}
  ↓ Client shows OTP input
  ↓ requestOTP(tz) → sends 6-digit code to stored email
  ↓ verifyOTP(tz, code) → on success returns trainee data
  ↓
CASE 4: No Google email + no stored email
  ↓ Return {needsEmail:true, name}
  ↓ Client shows email collection form
  ↓ requestOTPForEmail(tz, email) → sends code to provided email
  ↓ verifyOTP(tz, code) → on success stores email + returns data
```

## 9. UI Design Tokens

Consistent styling across all pages:

### Color Palette
| Element | Color | Hex |
|---------|-------|-----|
| Background | Dark Navy | `#0f172a` |
| Card Background | Slate | `#1e293b` |
| Borders | Gray-500 | `#334155` |
| Text (Primary) | Slate-200 | `#e2e8f0` |
| Text (Secondary) | Slate-400 | `#94a3b8` |
| Accent (Primary Blue) | Blue-500 / Blue-400 | `#3b82f6` / `#60a5fa` |
| Success (Green) | Green-600 / Green-400 | `#16a34a` / `#4ade80` |
| Error (Red) | Red-600 / Red-400 | `#dc2626` / `#f87171` |
| Warning (Yellow) | Amber-400 | `#fbbf24` |

### Typography & Spacing
| Property | Value |
|----------|-------|
| **Font Family** | Segoe UI, Tahoma, Arial, sans-serif |
| **Card Border Radius** | 16px |
| **Input/Button Border Radius** | 10px |
| **Card Padding** | 32px |
| **Input Padding** | 10px 14px |
| **Button Padding** | 14px |
| **Gap (Flex)** | 16px to 24px |

### Layout
| Feature | Value |
|---------|-------|
| **Direction** | RTL (right-to-left) |
| **Language** | Hebrew (`lang="he"`) |
| **Viewport** | `width=device-width, initial-scale=1` (NOTE: ignored by GAS iframe — see GUI_GUIDELINES.md) |
| **Max Width** | 520px (register/poll), 900px (instructor/admin) — set via `getZoomScript()` |
| **Mobile Detection** | CSS `zoom` via `screen.width` vs `window.innerWidth` comparison (NOT @media queries) |
| **Shared CSS** | `getBaseCSS()` — single source of truth for all page styling (v5.2.0) |

### Interactive Elements
- **Buttons**: Hover = brighter blue (`#60a5fa`), active = darker blue (`#3b82f6`)
- **Inputs**: Border on focus = blue accent, background = slate-800
- **Cards**: Subtle border, hover = slight shadow
- **Links**: Blue accent, underline on hover

## 10. Critical Pitfalls & Patterns (MUST READ)

### 10.1 GAS Single-Line JavaScript (CRITICAL)

**ALL GAS string concatenation produces ONE line with NO newlines.**

When concatenating HTML strings in GAS:
```javascript
var html = '<div>' + // Line 1
           '<p>Text</p>' + // Line 2
           '</div>'; // Line 3
```

This produces a SINGLE line of JavaScript in the browser:
```javascript
var html = '<div><p>Text</p></div>';
```

**JavaScript's ASI (Automatic Semicolon Insertion) NEVER applies to GAS string context.**

### CRITICAL: Every expression statement MUST end with explicit `;`

If a statement ends without `;`, it can cause the entire `<script>` block to crash silently:

```javascript
// ❌ WRONG — No semicolon after closing brace
})function myFunc() {

// ❌ SILENT CRASH — Previous line and this line merge:
// })functionmyFunc() { ... (SYNTAX ERROR)
```

```javascript
// ✓ CORRECT — Explicit semicolon
});
function myFunc() {
```

### 10.2 GAS String Escaping Rules

In GAS single-quoted strings:
- `\'` = produces literal `'` in browser output
- `\\n` = produces browser `\n` (actual newline in HTML)
- `\\` = produces literal `\`

Example:
```javascript
// GAS code:
var msg = 'He said \\'hello\\' and then \\nwent away.';

// Output to browser:
// He said 'hello' and then
// went away.
```

### 10.3 GAS HtmlService Iframe Limitations

`window.location.search` **does not work** in GAS sandboxed iframe. URL parameters cannot be read client-side.

**Solution**: Inject parameters server-side into the HTML string:
```javascript
function doGet(e) {
  var sessionId = e.parameter.session || '';
  var html = '<script>var SESSION_ID = "' + sessionId + '";</script>';
  return HtmlService.createHtmlOutput(html);
}
```

Client-side can then use `SESSION_ID` variable.

### 10.4 GAS Load Event Timing

`window.addEventListener("load", ...)` **may not fire** because the iframe's load event has already occurred by the time the script runs.

**Solution**: Use direct function calls or `google.script.run` instead:
```javascript
// ❌ Unreliable
window.addEventListener("load", function() { ... });

// ✓ Reliable
google.script.run.withSuccessHandler(function(data) {
  populateUI(data);
}).myServerFunction();
```

### 10.5 data-sid Pattern (Avoid Quote Escaping Nightmares)

When dynamically building onclick handlers with session IDs, multi-layer quote escaping becomes impossible.

**Solution**: Use `data-sid` attribute and `getAttribute()`:

```javascript
// ❌ WRONG — Quote escaping nightmare
var btn = '<button onclick="doAction(\'' + sessionId + '\')">Click</button>';

// ✓ CORRECT — Use data attribute
var btn = '<button data-sid="' + sessionId + '">Click</button>';
// Later, in event listener:
btn.addEventListener("click", function() {
  var sid = this.getAttribute("data-sid"); // or this.dataset.sid
  doAction(sid);
});
```

### 10.6 DOM createElement Approach for Complex HTML

For dynamic tables or complex nested HTML (like admin sessions table), use `document.createElement()` instead of innerHTML:

```javascript
// ❌ Quote escaping nightmare
var row = '<tr><td>' + name + '</td><td onclick="editSession(\'' + sid + '\')">' + date + '</td></tr>';

// ✓ CORRECT — Use DOM methods
var row = document.createElement("tr");
var nameCell = document.createElement("td");
nameCell.textContent = name;
var dateCell = document.createElement("td");
dateCell.textContent = date;
dateCell.addEventListener("click", function() { editSession(sid); });
row.appendChild(nameCell);
row.appendChild(dateCell);
table.appendChild(row);
```

### 10.7 navigator.clipboard.writeText() with Fallback

Modern clipboard API may not work in older browsers or all GAS contexts.

**Solution**: Use with `prompt()` fallback:
```javascript
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      prompt("Copy this text:", text);
    });
  } else {
    prompt("Copy this text:", text);
  }
}
```

### 10.8 google.script.run Pattern

All server→client and client→server calls follow this pattern:

```javascript
// Call a server function from client-side
google.script.run
  .withSuccessHandler(function(result) {
    console.log("Success:", result);
  })
  .withFailureHandler(function(error) {
    console.error("Error:", error);
  })
  .myServerFunction(arg1, arg2);
```

**Rules**:
- All server functions must be **global GAS functions** (not inside objects or nested functions)
- Arguments must be **serializable**: strings, numbers, arrays, objects (NO Date objects — convert to strings)
- Return values must also be serializable
- Handlers are **asynchronous** — code continues immediately after the call

### 10.9 Sheets API: Number Format with Table Feature

If Google Sheets "Table" feature is enabled on a sheet, `setNumberFormat()` calls **will fail silently** or throw errors.

**Solution**: Wrap in try/catch (already done in setup.gs):
```javascript
try {
  range.setNumberFormat("dd/mm/yyyy");
} catch(e) {
  // Table feature enabled — formatting not available
  console.log("Formatting skipped (Table enabled)");
}
```

Data is stored as strings via `String()` conversion instead.

### 10.10 Deployment: clasp push vs. Deploy

**`clasp push` alone is NOT sufficient.**

1. `clasp push` uploads .gs files to Apps Script editor
2. BUT the deployed web app still runs the previous version
3. To activate changes: Deploy → Manage deployments → Edit → New version → Deploy

**Workflow**:
```
1. Edit .gs files locally
2. Run: clasp push
3. Go to: https://script.google.com/d/{SCRIPT_ID}/edit
4. Click: Deploy → Manage deployments
5. Click: Edit (on the deployment)
6. Click: New version
7. Click: Deploy
8. Test via public URL
```

### 10.11 Security Model

#### Architecture Overview
The security model uses route-level gating combined with trainee email verification:

**REQUIRE_LOGIN Flag Behavior**:
- When `REQUIRE_LOGIN = true`, protected routes (instructor, admin, print, status) check `Session.getActiveUser().getEmail()`
- When `REQUIRE_LOGIN = false`, all routes are public (legacy mode)

**Route-Level Gating in doGet()**:
```javascript
// doGet(e) dispatcher checks:
if (REQUIRE_LOGIN && isProtectedRoute) {
  var email = Session.getActiveUser().getEmail();
  if (!isAuthorizedEmail(email)) {
    return HtmlService.createHtmlOutput('Access denied');
  }
}
```

**Trainee Email Capture**:
- **Registration**: `addTraineeData()` silently captures Google session email to אימייל column (Column E)
- **Update**: `updateTraineeData()` updates Google session email on every edit
- **Poll**: `submitPollResponse()` calls `backfillTraineeEmail()` to capture email for existing trainees with empty אימייל

**Trainee Identity Verification (Hybrid Auth v4.1.0+)**:
- `lookupByTZ()` implements hybrid authentication:
  - Google session available + stored email → verify match (block on mismatch)
  - No Google session + stored email → OTP verification via email
  - No Google session + no stored email → collect email, then OTP verification
- OTP: 6-digit code via MailApp.sendEmail(), stored in CacheService (5min TTL), max 3 attempts, 15min block
- Both register and poll pages include full OTP UI flow

**Instructor Identity Verification (v4.2.3)**:
- `checkInstructorAuth(tz)` checks Google session first; if unavailable, falls back to OTP
- `requestInstructorOTP(tz)` / `verifyInstructorOTP(tz, code)` — instructor-specific OTP flow
- Print page access via `issuePrintToken()` + `printVerified` route with 60-second one-time token
- OTP gate page (`getPrintOtpGateHtml`) for direct print URL access without Google session

**Deployment Configuration**:
- Execute as: **Me** (script owner's account)
- Who has access: **Anyone** (no Google account required)
- `Session.getActiveUser().getEmail()` returns empty for non-owners — OTP fallback handles this
- All spreadsheets accessible via script owner's permissions

#### Access Control Matrix

| Route | Public | Auth Method | Description |
|-------|--------|-------------|-------------|
| Landing, Register, Poll | Yes | OTP or Google session | Open access, email captured silently |
| Instructor Dashboard | Yes | Client-side: ת.ז. + Google or OTP | Instructor login + session CRUD |
| Admin Dashboard | Yes | Client-side: TZ + `isAdminByTz()` + Google/OTP | Admin management + owner panels |
| Print | Yes | Google session or OTP gate | Session-scoped via `isSessionAuthorized`/`isSessionAuthorizedByTz` |
| PrintVerified | Yes | One-time token (60s) | Print page after OTP verification |
| Status | Yes | Called from authenticated dashboard | JSON response counts |
| Debug | No | `OWNER_EMAILS` email check | Diagnostic info page (v5.0.12: gated) |

## 11. Constants Reference

All constants defined in `config.gs`:

```javascript
// Version (sync across ALL .gs files)
var SCRIPT_VERSION = '5.2.0';

// Sheet limits
var MAX_TOOLS = 4;

// Spreadsheet IDs
var SOURCE_SHEET_ID = '182Kp5-vTABvRZ8VA3W0rqhAs5933yqe1YNdN61w-ACo';
var RESPONSE_SHEET_ID = '1wl4lUd3_XKLGDY58jilUae43xIH8BJtnGOgNmuF-SAQ';
var INSTRUCTOR_SHEET_ID = '1jTnZacJEKGiksJJfaIPB3sp29uHjsfrGv1Vic6v4Gls';
var SESSIONS_SHEET_ID = '1hrsIxwkckoc_Od4gSinM07XiRVhiSo9pYW2--bbBumI';
var SUSPENSION_REASONS_SHEET_ID = '1E3htH5udGPwgnqvOC6cJbtEjG0cva1EdDG_v1SByENQ';

// Instructor IDs (for direct login bypass or default instructor)
var INSTRUCTOR_TZ = '319253233';

// Deployed web app URL (used for share links)
var WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbygdC5WloMaLUJ8xN3zmRihr8_bUAVus9arG071q5VUIbs_vrAo_kTXwCPF0tGB9ytI/exec';

// Owner emails — system owners with full access (renamed from ADMIN_EMAILS in v5.0.0)
var OWNER_EMAILS = ['kommisar@gmail.com'];

// Security — When true, enforces server-side auth on protected routes and trainee email verification
var REQUIRE_LOGIN = true;

// Sheet tab name (consistent across response sheets)
var POLL_SHEET_NAME = 'Form Responses 1';

// OTP configuration (used by both instructor and trainee OTP flows)
var OTP_FROM_EMAIL = 'kommisar@gmail.com';   // Sender email (MailApp, no alias needed)
var OTP_FROM_NAME = 'מערכת אימוני ירי';      // Sender display name
var OTP_TTL_SECONDS = 300;                   // OTP validity: 5 minutes
var OTP_MAX_ATTEMPTS = 3;                    // Max verification attempts
var OTP_BLOCK_SECONDS = 900;                 // Block duration after max attempts: 15 minutes
```

## 12. Development Workflow

### Step 1: Edit Locally
Edit .gs files in `/sessions/amazing-vibrant-thompson/mnt/ClaudeCowork/Imun/Multi/`

### Step 2: Increment Version
1. Update comment header in ALL .gs files: `// v4.0.1` (example)
2. Update `SCRIPT_VERSION` in config.gs: `var SCRIPT_VERSION = '4.0.1';`

### Step 3: Push to Apps Script
```bash
clasp push
```

### Step 4: Deploy New Version
1. Navigate to: https://script.google.com/d/1fQfzX3zYecdbL6qkK3PW2txSBI4pKFeRCNOCjRKUKVqsD4OdNh8G1wPS/edit
2. Click: **Deploy** → **Manage deployments**
3. Click: **Edit** (on the existing deployment)
4. Click: **New version** (dropdown)
5. Click: **Deploy**
6. Test via: https://script.google.com/macros/s/AKfycbygdC5WloMaLUJ8xN3zmRihr8_bUAVus9arG071q5VUIbs_vrAo_kTXwCPF0tGB9ytI/exec

### Step 5: Verify
- Test all routes: landing, register, poll, instructor, admin, print
- Check console for errors (F12 → Console)
- Verify sheets are updated correctly

## 13. Related Files & Documentation

### Project Documentation (in `doc/`)
- **doc/MULTI_DESIGN.md** — Detailed design document with mockups, user flows, and component specifications
- **doc/MULTI_SETUP.md** — Complete deployment and setup guide, including spreadsheet creation and GAS project configuration
- **doc/PLAN_v5.md** — v5.0 implementation plan with detailed design decisions
- **doc/ROADMAP_v5.md** — Roadmap: what's done, what remains, future considerations
- **doc/DOC_GUIDELINES.md** — Manual formatting specs and creation workflow
- **doc/AUDIT_v5011.md** — v5.0.11 audit report
- **doc/GUI_GUIDELINES.md** — GAS iframe rendering, mobile/desktop detection, CSS zoom, shared CSS architecture, rules for future updates

### User Manuals (in `manuals/`)
- **manuals/מדריך_למדריך_v5012.docx** — Hebrew instructor manual (v5.0.12, reference template for all manuals)
- **manuals/Instructor_Manual_v5012.docx** — English instructor manual (v5.0.12)
- **manuals/מדריך_למנהל_v5012.docx** — Hebrew admin manual (v5.0.12)
- **manuals/מדריך_למתאמן_v5012.docx** — Hebrew trainee manual (v5.0.12)
- See `doc/DOC_GUIDELINES.md` for formatting specs and manual creation workflow (§14 below)

### Reference Files (Archive — Do Not Edit)
- **Imun/code.gs** — Original v2.13.8 single-instructor version (reference only)
- **Imun/code_multi.gs** — v3.0.4 pre-split monolithic version (reference only, useful for understanding initial multi-instructor refactoring)
- Previous versions: v3.0.15 (last pre-security release)

---

## 14. Instructor Manual — Creation & Editing Guide

The instructor manual (`manuals/מדריך_למדריך_vXXX.docx`) is a Hebrew RTL Word document and serves as the reference template for all manuals. It is edited by unpacking the `.docx` into XML, editing the XML directly, and repacking. **Do NOT use docx-js to recreate from scratch** — always clone the instructor manual and edit to preserve exact formatting, fonts, and styles. See `doc/DOC_GUIDELINES.md` for the complete formatting spec and workflow.

### 14.1 Workflow

```bash
# Step 1: Unpack (from the docx skill directory)
cd /path/to/.claude/skills/docx
python scripts/office/unpack.py "source_manual.docx" unpacked_dir/

# Step 2: Edit unpacked_dir/word/document.xml using the Edit tool
# (see XML patterns below)

# Step 3: Repack + validate
python scripts/office/pack.py unpacked_dir/ "output_manual.docx" --original "source_manual.docx"

# Step 4: Validate separately (optional, pack.py also validates)
python scripts/office/validate.py "output_manual.docx"

# Step 5: Verify content via text extraction
pandoc "output_manual.docx" -o verify.md
```

**CRITICAL:** The `--original` flag on `pack.py` preserves styles.xml, numbering.xml, fonts, theme, and relationships from the source file. Without it, the output will have broken formatting.

### 14.2 Document Structure (v4.2.9)

The manual has this section layout (12 sections as of v4.2.9):

```
Title page:     "מערכת ניהול אימוני ירי" + subtitle + version
TOC:            Numbered list of all sections
Section 1–12:   Each separated by divider + page break
Footer:         Version line at bottom
```

**When adding a new section:** You must update THREE places:
1. **TOC entries** — add entry AND renumber all subsequent entries
2. **Section headers** — renumber all subsequent `N. section_title` in section heading elements
3. **Footer version** — update version string

### 14.3 XML Formatting Patterns

All paragraphs use `<w:jc w:val="left"/>` (renders as right-aligned in RTL). The boilerplate attributes on `<w:p>` are: `w14:paraId="XXXXXXXX" w14:textId="77777777" w:rsidR="00384C10" w:rsidRDefault="00000000" w:rsidP="000565DA"`. When adding new paragraphs, use unique `paraId` values (8 hex chars).

#### Title page

```xml
<!-- Main title -->
<w:r><w:rPr><w:b/><w:color w:val="1E3A5F"/><w:sz w:val="52"/></w:rPr>
  <w:t>מערכת ניהול אימוני ירי</w:t></w:r>

<!-- Subtitle -->
<w:r><w:rPr><w:color w:val="475569"/><w:sz w:val="28"/></w:rPr>
  <w:t>מדריך למדריך</w:t></w:r>

<!-- Version line -->
<w:r><w:rPr><w:color w:val="94A3B8"/><w:sz w:val="20"/></w:rPr>
  <w:t>גרסה X.Y.Z • חודש שנה</w:t></w:r>
```

#### TOC entry

```xml
<w:p ...>
  <w:pPr>
    <w:spacing w:after="40"/>
    <w:ind w:left="170"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r><w:rPr><w:sz w:val="22"/></w:rPr>
    <w:t>N. כותרת הסעיף</w:t></w:r>
</w:p>
```

#### Section heading (with blue underline)

```xml
<w:p ...>
  <w:pPr>
    <w:pBdr>
      <w:bottom w:val="single" w:sz="8" w:space="4" w:color="3B82F6"/>
    </w:pBdr>
    <w:spacing w:before="360" w:after="160"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r><w:rPr><w:b/><w:color w:val="1E3A5F"/><w:sz w:val="32"/></w:rPr>
    <w:t>N. כותרת הסעיף</w:t></w:r>
</w:p>
```

#### Sub-heading (bold, dark gray)

```xml
<w:p ...>
  <w:pPr>
    <w:spacing w:before="240"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r><w:rPr><w:b/><w:color w:val="334155"/><w:sz w:val="26"/></w:rPr>
    <w:t>כותרת משנה:</w:t></w:r>
</w:p>
```

#### Body text (plain paragraph)

```xml
<w:p ...>
  <w:pPr><w:jc w:val="left"/></w:pPr>
  <w:r><w:t>טקסט רגיל כאן.</w:t></w:r>
</w:p>
```

#### Numbered step (blue number + indented text)

```xml
<w:p ...>
  <w:pPr>
    <w:spacing w:after="80"/>
    <w:ind w:left="283"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r><w:rPr><w:b/><w:color w:val="3B82F6"/><w:sz w:val="22"/></w:rPr>
    <w:t xml:space="preserve">  1  </w:t></w:r>
  <w:r><w:t xml:space="preserve">  </w:t></w:r>
  <w:r><w:rPr><w:sz w:val="22"/></w:rPr>
    <w:t>תוכן השלב כאן.</w:t></w:r>
</w:p>
```

Note: The step number is padded with spaces: `"  1  "`, `"  2  "`, etc. The spacer run between number and text is `"  "`.

#### Bullet point (• character with indent)

```xml
<w:p ...>
  <w:pPr>
    <w:spacing w:after="80"/>
    <w:ind w:left="567" w:hanging="283"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r><w:t xml:space="preserve">• </w:t></w:r>
  <w:r><w:rPr><w:b/></w:rPr><w:t>מונח מודגש</w:t></w:r>
  <w:r><w:t xml:space="preserve"> — הסבר רגיל</w:t></w:r>
</w:p>
```

#### Tip box (💡 — blue background)

```xml
<w:p ...>
  <w:pPr>
    <w:pBdr>
      <w:top w:val="single" w:sz="4" w:space="4" w:color="BFDBFE"/>
      <w:left w:val="single" w:sz="4" w:space="4" w:color="BFDBFE"/>
      <w:bottom w:val="single" w:sz="4" w:space="4" w:color="BFDBFE"/>
      <w:right w:val="single" w:sz="4" w:space="4" w:color="BFDBFE"/>
    </w:pBdr>
    <w:shd w:val="clear" w:color="auto" w:fill="EFF6FF"/>
    <w:spacing w:before="160" w:after="160"/>
    <w:ind w:left="283" w:right="283"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r><w:rPr><w:color w:val="1E40AF"/><w:sz w:val="22"/></w:rPr>
    <w:t>💡 טקסט הטיפ כאן.</w:t></w:r>
</w:p>
```

#### Warning box (⚠️ — yellow background)

```xml
<w:p ...>
  <w:pPr>
    <w:pBdr>
      <w:top w:val="single" w:sz="4" w:space="4" w:color="FDE68A"/>
      <w:left w:val="single" w:sz="4" w:space="4" w:color="FDE68A"/>
      <w:bottom w:val="single" w:sz="4" w:space="4" w:color="FDE68A"/>
      <w:right w:val="single" w:sz="4" w:space="4" w:color="FDE68A"/>
    </w:pBdr>
    <w:shd w:val="clear" w:color="auto" w:fill="FEF3C7"/>
    <w:spacing w:before="160" w:after="160"/>
    <w:ind w:left="283" w:right="283"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r><w:rPr><w:color w:val="92400E"/><w:sz w:val="22"/></w:rPr>
    <w:t>⚠️ טקסט האזהרה כאן.</w:t></w:r>
</w:p>
```

#### Section divider (thin gray line)

```xml
<w:p ...>
  <w:pPr>
    <w:pBdr>
      <w:bottom w:val="single" w:sz="4" w:space="1" w:color="CBD5E1"/>
    </w:pBdr>
    <w:spacing w:before="240" w:after="240"/>
    <w:jc w:val="left"/>
  </w:pPr>
</w:p>
```

#### Page break

```xml
<w:p ...>
  <w:pPr><w:jc w:val="left"/></w:pPr>
  <w:r><w:br w:type="page"/></w:r>
</w:p>
```

#### FAQ question + answer

```xml
<!-- Question (bold, spaced) -->
<w:p ...>
  <w:pPr>
    <w:spacing w:before="200" w:after="40"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r><w:rPr><w:b/></w:rPr>
    <w:t>שאלה כאן?</w:t></w:r>
</w:p>
<!-- Answer (plain text) -->
<w:p ...>
  <w:pPr><w:jc w:val="left"/></w:pPr>
  <w:r><w:t>תשובה כאן.</w:t></w:r>
</w:p>
```

#### Footer version line

```xml
<w:p ...>
  <w:pPr>
    <w:spacing w:before="400"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r><w:rPr><w:color w:val="94A3B8"/><w:sz w:val="18"/></w:rPr>
    <w:t>מערכת ניהול אימוני ירי — גרסה X.Y.Z — חודש שנה</w:t></w:r>
</w:p>
```

### 14.4 Typical Section Layout

A complete section follows this pattern:
```
[divider]              ← thin gray line (CBD5E1)
[page break]           ← <w:br w:type="page"/>
[section heading]      ← "N. title" with blue underline (3B82F6)
[body paragraph(s)]    ← plain text
[sub-heading]          ← "שלבים:" / "יכולות:" etc.
[numbered steps]       ← blue numbers 1-N with indent
[body paragraph(s)]    ← additional explanation
[tip/warning box(es)]  ← optional 💡 or ⚠️ boxes
```

### 14.5 Version Update Checklist

When updating the manual for a new version:
1. Update `גרסה X.Y.Z • חודש שנה` in title page
2. Update `מערכת ניהול אימוני ירי — גרסה X.Y.Z — חודש שנה` in footer
3. If adding sections: update ALL TOC entries + ALL section header numbers
4. Save output to `manuals/מדריך_למדריך_vXYZ.docx` (e.g., `v5012` for 5.0.12)

### 14.6 Smart Quotes

Use XML entities for Hebrew-compatible quotes and apostrophes:
- `&#x201C;` → " (left double quote)
- `&#x201D;` → " (right double quote)  
- `&#x2019;` → ' (apostrophe)
- `&#x2018;` → ' (left single quote)

### 14.7 Current Manual Sections (v4.2.9)

| # | Title | Content |
|---|-------|---------|
| 1 | סקירה כללית | System overview, page list |
| 2 | כניסה למערכת | Login flow: Google auto + OTP fallback |
| 3 | יצירת אימון חדש | Create session: date, notes, deputy selection |
| 4 | שיתוף קישור לסקר נוכחות | Share poll link: clipboard + WhatsApp |
| 5 | מעקב אחר תגובות | Response tracking: badge counts |
| 6 | עריכת רשימת מגיעים | **v4.2.9**: Attendance override: edit attending/bullets |
| 7 | הדפסת יומן רישום מתאמנים | Print attendance log: A4 landscape |
| 8 | סגירת אימון | Close session + auto-close info |
| 9 | רישום מתאמנים חדשים | Trainee registration guidance |
| 10 | אבטחה ואימות זהות | Security: access levels, OTP, email protection |
| 11 | מ״מ מדריך (סגן) | Deputy: assignment, capabilities (print + attendance) |
| 12 | שאלות נפוצות | FAQ: 12 Q&A pairs |

---

**Last Updated**: 2026-04-18 | **Version**: 5.2.0 | **Agent Ready**: Yes
