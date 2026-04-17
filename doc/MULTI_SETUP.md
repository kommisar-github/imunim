# Multi-Instructor Deployment — Setup Guide

This guide walks through deploying the multi-instructor system (v5.0.9 — 4-Tier Role System + Suspension Management + Deputy Support + OTP Auth + Backups + Auto-Close) as a **new, independent** Apps Script web app. Your existing single-instructor deployment (`code.gs`) remains untouched.

---

## Prerequisites

- Google account with access to Google Apps Script and Google Sheets
- The split `.gs` files from the `Imun/Multi` folder (config, routing, data, pages, setup, backup, logo)
- Existing trainee database spreadsheet (מאגר מתאמנים) — can be reused or created fresh
- Existing instructor spreadsheet (מדריכים) — can be reused or created fresh

---

## Step 1: Open the Apps Script Project

The project already exists:

- **Script ID:** `1fQfzX3zYecdbL6qkK3PW2txSBI4pKFeRCNOCjRKUKVqsD4OdNh8G1wPS`
- **Editor URL:** [https://script.google.com/d/1fQfzX3zYecdbL6qkK3PW2txSBI4pKFeRCNOCjRKUKVqsD4OdNh8G1wPS/edit](https://script.google.com/d/1fQfzX3zYecdbL6qkK3PW2txSBI4pKFeRCNOCjRKUKVqsD4OdNh8G1wPS/edit)

The project contains 7 files (create one per `.gs` file from the Multi folder): `config.gs`, `routing.gs`, `data.gs`, `pages.gs`, `setup.gs`, `logo.gs`, `backup.gs`.

**Do not deploy yet** — you need to set up spreadsheets and update constants first.

---

## Step 2: Set Up All Spreadsheets

There are 4 spreadsheets in total. Each has its own setup function, or you can run **`setupAll`** to initialize all four at once.

### Option A: Run All At Once

1. Run the function: **`setupAll`**
   - Menu: Run → select `setupAll` → click Run
   - Authorize when prompted (first-time only)
2. Open **View → Logs** (or Execution log). For any newly created spreadsheets, copy the IDs and update `config.gs`.
3. `setupAll` also installs both scheduled triggers (backup at ~01:00, auto-close at ~02:00).

> Each setup function uses "open-if-exists" logic — if the ID in `config.gs` is already set, it opens and re-formats the existing sheet instead of creating a new one.

### Option B: Run Individually

Each spreadsheet can be initialized separately:

| Function | Spreadsheet | Config constant |
|----------|-------------|-----------------|
| `setupSourceSheet` | מאגר מתאמנים (trainee database) | `SOURCE_SHEET_ID` |
| `setupResponseSheet` | תשובות סקר (poll responses) | `RESPONSE_SHEET_ID` |
| `setupInstructorSheet` | מדריכים (instructors) | `INSTRUCTOR_SHEET_ID` |
| `setupSessionsSheet` | לוח אימונים (training sessions) | `SESSIONS_SHEET_ID` |
| `setupSuspensionReasonsSheet` | סיבות השעיה (suspension reasons) | `SUSPENSION_REASONS_SHEET_ID` |

For each: run the function, check the logs for the ID, and update the corresponding constant in `config.gs`.

### Reusing Existing Spreadsheets

If you want to share data with the old single-instructor deployment:

- **Source sheet:** Keep `SOURCE_SHEET_ID` as-is (`182Kp5-vTABvRZ8VA3W0rqhAs5933yqe1YNdN61w-ACo`). Running `setupSourceSheet` will re-apply formatting without losing data. Column headers should be: A=שם, B=ת.ז., C=טלפון, D=אימייל, E onwards=tool columns. **v5.0.0:** Columns V-X added (סטטוס, סיבת השעיה, תאריך עדכון סטטוס) with data validation on status column (פעיל/לא פעיל/מושעה).
- **Response sheet:** If reusing an existing sheet, **manually add column F** with header `מזהה אימון` to the `Form Responses 1` tab. Old responses (without a session ID in column F) will be ignored by the new system. **v5.0.2:** Data validation on "מגיע?" column (כן/לא dropdown).
- **Instructor sheet:** Keep `INSTRUCTOR_SHEET_ID` as-is (`1jTnZacJEKGiksJJfaIPB3sp29uHjsfrGv1Vic6v4Gls`). Running `setupInstructorSheet` will re-apply formatting and add a default instructor row if empty. **v5.0.0:** Column F "אדמין" added with כן/לא data validation.
- **Sessions sheet:** Already set to `1hrsIxwkckoc_Od4gSinM07XiRVhiSo9pYW2--bbBumI`. Columns H and I for deputy instructors (מ"מ 1 ת.ז., מ"מ 2 ת.ז.). **v5.0.2:** Data validation on status column (פעיל/סגור/ארכיון dropdown).
- **Suspension reasons sheet:** NEW in v5.0.0. Set to `1E3htH5udGPwgnqvOC6cJbtEjG0cva1EdDG_v1SByENQ`. Running `setupSuspensionReasonsSheet` creates the sheet with headers and 4 default reasons. Data validation on active column (כן/לא).

---

## Step 5: Update Remaining Constants

Review and update these constants in `config.gs`:

| Constant | What to set | Notes |
|----------|-------------|-------|
| `INSTRUCTOR_TZ` | Default instructor ת.ז. | Used as fallback; set to your primary instructor |
| `OWNER_EMAILS` | Array of owner Google emails | Controls access to owner dashboard (system developer). Renamed from `ADMIN_EMAILS` in v5.0.0 |
| `SUSPENSION_REASONS_SHEET_ID` | Suspension reasons spreadsheet ID | Created by `setupSuspensionReasonsSheet()` |
| `REQUIRE_LOGIN` | `false` or `true` | If `true`, owner dashboard requires Google email match |
| `WEBAPP_URL` | Leave as placeholder | Will be updated after deployment (Step 7) |

---

## Step 6: Save and First Deploy

1. Save the project (Ctrl+S).
2. Click **Deploy → New deployment**.
3. Click the gear icon next to "Select type" → choose **Web app**.
4. Settings:
   - **Description:** `v5.0.9 Multi-instructor + 4-tier roles + suspension + OTP auth`
   - **Execute as:** `Me` (your Google account)
   - **Who has access:** `Anyone` (no Google account required — OTP fallback handles authentication)
5. Click **Deploy**.
6. **Copy the Web app URL** from the deployment dialog.

---

## Step 7: Update WEBAPP_URL and Redeploy

1. In `config.gs`, find:
   ```javascript
   var WEBAPP_URL = 'https://script.google.com/macros/s/.../exec';
   ```
   Replace with the URL you copied in Step 6.
2. Save the project.
3. Click **Deploy → Manage deployments**.
4. Click the pencil (edit) icon on your deployment.
5. Set **Version** to **New version**, click **Deploy**.

> You must create a new version every time you update the code for changes to take effect.

---

## Step 8: Verify the Deployment

Open the web app URL in a browser. You should see the **landing page** (דף נחיתה) with three navigation cards:

1. **סקר נוכחות** — Poll page (for trainees)
2. **רישום מתאמנים** — Registration page (for new trainees)
3. **ניהול אימונים** — Instructor dashboard

### Test the complete flow:

1. **Instructor Dashboard** (`?action=instructor`):
   - Enter an instructor ת.ז. → click כניסה
   - Create a new training session → choose a date, add optional notes → click צור אימון
   - Verify the session appears in the sessions list
   - Click הדפסה on the session (will show empty attendance)

2. **Registration Page** (`?action=register`):
   - Register a test trainee with all fields
   - Verify the trainee appears in the source spreadsheet

3. **Poll Page** (`?action=poll`):
   - Select the active training session
   - Submit a poll response as the test trainee
   - Verify the response appears in the response spreadsheet with the session ID in column F

4. **Print Page** (`?action=print&session=SESSIONID`):
   - Go back to instructor dashboard → click הדפסה on the session
   - Verify the attending trainee appears with full details (name, ת.ז., tools)
   - Test WhatsApp share button (share entire page)
   - Test direct WhatsApp button (send to specific person)

5. **Admin Dashboard** (`?action=admin`):
   - Log in with admin instructor ת.ז. (must have "כן" in admin column)
   - Test OTP login flow for admin authentication
   - Section A: verify active sessions list with close/print buttons
   - Section B: test instructor list, add instructor with admin checkbox, edit instructor
   - Section C: search trainees, view detail card, change status (פעיל/מושעה/לא פעיל)
   - Test suspension: select "מושעה", choose reason from dropdown, click update
   - Test suspension management: view suspended trainees list, resolve suspension, toggle reasons
   - Section D: verify system links
   - **Owner panels**: if logged in as owner email, verify extra sections appear: DB spreadsheet links (4 sheets) and "אימונים לפי מדריך" with instructor dropdown and filterable sessions table. These should NOT appear for regular admins.

6. **Close Session**:
   - In instructor dashboard, click סגור אימון on the test session
   - Verify the session status changes to סגור
   - Verify the poll page no longer shows this session as available
   - Test closed session printing from instructor dashboard

7. **Deputy Instructor Tests (v4.2.0)**:
   - Create a session with a main instructor and 2 deputies
   - Verify both deputies appear in their "האימונים שלי" list with a "מ"מ" badge
   - Verify deputy-role sessions show only the "הדפסה" button (no create/share/close options)
   - Log in as a deputy, click "הדפסה" on the session
   - Verify the print page header shows: "מ"מ 1: {name} | מ"מ 2: {name}"
   - Test that a deputy can print the session
   - Verify that deputies cannot create sessions or modify existing sessions
   - Test that a non-deputy instructor cannot print a session where they're not assigned
   - Verify admin can print any session (isSessionAuthorized returns true for all sessions to admin)

8. **Security & Authorization Tests**:
   - Test that unauthorized users get blocked from instructor/admin/print/status routes
   - Test that trainee email is captured on registration and backfilled on poll
   - Test that a different Google account cannot look up another trainee's ת.ז.

9. **OTP Hybrid Auth Tests (v4.1.0 trainees, v4.2.3 instructors)**:
   - Test trainee OTP flow in incognito/non-Google browser for register page
   - Test trainee OTP flow in incognito/non-Google browser for poll page
   - Test email collection step for trainees without stored email
   - Test instructor OTP flow: login to dashboard without Google session
   - Test instructor print access via OTP gate (direct print URL without Google session)
   - Test print token flow: dashboard print button → printVerified route
   - Test OTP rate limiting (3 failed attempts → 15min block)
   - Test OTP expiry (code invalid after 5 minutes)
   - Verify MailApp.sendEmail() scope is authorized (run any function manually from editor)

---

## Summary: Constants Checklist

After setup, your `config.gs` constants should look like this:

```javascript
var SCRIPT_VERSION = '5.0.9';
var SOURCE_SHEET_ID = '182Kp5-vTABvRZ8VA3W0rqhAs5933yqe1YNdN61w-ACo';
var RESPONSE_SHEET_ID = '1wl4lUd3_XKLGDY58jilUae43xIH8BJtnGOgNmuF-SAQ';
var INSTRUCTOR_SHEET_ID = '1jTnZacJEKGiksJJfaIPB3sp29uHjsfrGv1Vic6v4Gls';
var INSTRUCTOR_TZ = '319253233';
var SESSIONS_SHEET_ID = '1hrsIxwkckoc_Od4gSinM07XiRVhiSo9pYW2--bbBumI';
var WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbygdC5WloMaLUJ8xN3zmRihr8_bUAVus9arG071q5VUIbs_vrAo_kTXwCPF0tGB9ytI/exec';
var OWNER_EMAILS = ['kommisar@gmail.com'];
var SUSPENSION_REASONS_SHEET_ID = '1E3htH5udGPwgnqvOC6cJbtEjG0cva1EdDG_v1SByENQ';
var SUSPENSION_REASONS_TAB = 'סיבות השעיה';
var REQUIRE_LOGIN = true;

// OTP (hybrid auth for trainees without Google session)
var OTP_FROM_EMAIL = 'kommisar@gmail.com';
var OTP_FROM_NAME = 'מערכת אימוני ירי';
var OTP_TTL_SECONDS = 300;
var OTP_MAX_ATTEMPTS = 3;
var OTP_BLOCK_SECONDS = 900;
```

---

## Troubleshooting

**"You do not have permission" error when running setup functions:**
Grant authorization when prompted. The script needs permission to create spreadsheets.

**Sessions sheet not loading / "Invalid session" errors:**
Verify `SESSIONS_SHEET_ID` is correct and the sheet tab is named `אימונים`.

**Trainees not appearing in print page:**
Verify `SOURCE_SHEET_ID` points to a sheet with trainee data in the expected column layout.

**Poll responses missing session ID:**
Ensure the response sheet has 6 columns with `מזהה אימון` as the header in column F.

**`lookupByTZ` returns 'ת.ז. זו משויכת לחשבון אחר':**
The trainee's stored email doesn't match the current Google session email. This happens when someone tries to access another trainee's data. If a trainee legitimately changed accounts, an admin must clear or update the email in the source sheet manually.

**`Session.getActiveUser().getEmail()` returns empty:**
This is expected when deployed with 'Execute as: Me' for non-owner users. The OTP authentication fallback (v4.2.3) handles this case for both instructors and trainees.

**Changes not reflecting after code update:**
You must create a **new version** in Manage Deployments for code changes to take effect. Simply saving the script file is not enough.

**setNumberFormat error on typed columns:**
If your sheets have the Google Sheets "Table" feature enabled, number format calls will fail. The setup functions wrap these in try/catch, so they can be safely ignored. Data is stored as strings via `String()` conversion.

**OTP email not arriving:**
OTP emails are sent via `MailApp.sendEmail()` (not GmailApp). Verify the script owner has authorized the `script.send_mail` scope (run any function manually from the editor to trigger re-authorization). Check spam folder. MailApp quota is 100 emails/day for consumer accounts.

**OTP verification fails even with correct code:**
OTP expires after `OTP_TTL_SECONDS` (default 300 = 5 minutes). After `OTP_MAX_ATTEMPTS` (default 3) failed tries, the ת.ז. is blocked for `OTP_BLOCK_SECONDS` (default 900 = 15 minutes). Wait for block to expire or clear the cache entry manually.

**OTP step shown to Google-authenticated users:**
With 'Execute as: Me' deployment, `Session.getActiveUser().getEmail()` returns empty for all non-owner users. This means OTP will be required for everyone except the script owner. This is by design — the script owner (admin) gets automatic Google auth, all other users authenticate via OTP.

**JavaScript syntax errors / features not working:**
All GAS string-concatenated HTML produces ONE line of JS with no newlines. ASI (Automatic Semicolon Insertion) NEVER applies. Every expression statement MUST end with an explicit semicolon (`;`). Missing semicolons cause the entire `<script>` block to crash silently.

---

## Optional: clasp Setup (CLI sync)

Instead of copy-pasting files into the editor, you can use [clasp](https://github.com/google/clasp) to push files directly from the Multi folder.

```
npm install -g @google/clasp
clasp login
clasp clone 1fQfzX3zYecdbL6qkK3PW2txSBI4pKFeRCNOCjRKUKVqsD4OdNh8G1wPS --rootDir .
clasp push
```

After initial setup, `clasp push` syncs all local `.gs` files to the project.

---

## Automated Backups (v4.2.1)

The `backup.gs` file provides scheduled daily backups of all 4 spreadsheets into a single `.xlsx` file stored in a Google Drive folder.

### Setup

1. Copy `backup.gs` to the Apps Script project (alongside the other `.gs` files).
2. In the Apps Script editor, run **`installBackupTrigger`** (or run `setupAll` which installs all triggers).
   - This creates a daily trigger that runs at ~01:00 (Israel time).
   - Authorize when prompted (requires Drive access).

### How It Works

- A folder named **"Backups"** is created inside the same Google Drive folder as the project spreadsheets (next to מאגר מתאמנים, etc.).
- Daily at ~01:00, all 4 sheets (מאגר מתאמנים, תשובות סקר, מדריכים, אימונים) are exported as a single `.xlsx` file named `backup_YYYY-MM-DD_HH-mm.xlsx`.
- Backups older than 30 days are automatically deleted.
- If the backup fails, an email notification is sent to the first admin in `ADMIN_EMAILS`.

### Manual Backup

Run **`runBackupNow`** from the script editor to create an immediate backup.

### Stop Backups

Run **`removeBackupTrigger`** to disable the scheduled backup.

### Configuration

In `backup.gs`, you can adjust:

| Constant | Default | Description |
|----------|---------|-------------|
| `BACKUP_FOLDER_NAME` | `Backups` | Subfolder name for backups (created next to project spreadsheets) |
| `BACKUP_RETENTION_DAYS` | `30` | Days to keep old backups before auto-delete |

---

## Auto-Close Past Sessions (v4.2.4)

Sessions whose date has passed are automatically closed the next day, so stale sessions don't linger as "פעיל".

### Setup

In the Apps Script editor, run **`installAutoCloseTrigger`** (or run `setupAll` which installs all triggers).
- This creates a daily trigger that runs at ~02:00 (Israel time), after the backup trigger.
- Authorize when prompted (if not already authorized).

### How It Works

- Daily at ~02:00, `autoClosePastSessions()` fetches all active sessions.
- For each session where the session date is strictly before today (Israel timezone), it calls `closeSession()` to set the status to `סגור`.
- Sessions on their actual day remain open — only past sessions are closed.
- If the auto-close fails, an email notification is sent to the first admin in `ADMIN_EMAILS`.

### Stop Auto-Close

Run **`removeAutoCloseTrigger`** from the script editor to disable the scheduled auto-close.

---

## Admin Close Button (v4.2.4)

The admin dashboard (`?action=admin`) now includes a **"סגור"** button next to each active session in the "אימונים לפי מדריך" table. This allows admins to close any instructor's training session directly from the dashboard.

- Only shown for sessions with status `פעיל`
- Includes a confirmation dialog before closing
- After closing, the session table and stats refresh automatically
