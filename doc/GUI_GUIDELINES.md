# GUI Guidelines — אימוני ירי

**Created: 2026-04-18**  
**Current Version: 5.2.0**

---

## 1. GAS Iframe Environment

Google Apps Script web apps render inside a sandboxed `<iframe>` on `script.google.com`. This has critical implications for GUI:

- The `<meta name="viewport">` tag is **completely ignored** — only the top-level document's viewport meta matters, and Google controls that.
- On mobile, the iframe gets a **980px virtual viewport** regardless of device screen size. A 412px phone screen shows 980px of content scaled down to ~42% — everything appears tiny.
- CSS `@media` queries check the **iframe viewport** (980px), not the device screen. Media queries like `max-width: 600px` never fire on mobile because the iframe is always 980px wide.
- "Request Desktop Site" mode in Chrome/Samsung browsers inflates `window.innerWidth` to 1920px+ and changes the User-Agent string, breaking both UA-based and viewport-based detection.
- Samsung Internet has a firmware bug reporting `hover:hover` and `pointer:fine` on touchscreens — CSS media queries using these are unreliable.

**Bottom line:** Standard responsive web design techniques (viewport meta, @media queries, UA detection) do not work inside GAS iframes.

---

## 2. Mobile/Desktop Detection

The project uses `screen.width` (the actual physical screen width in CSS pixels) compared to `window.innerWidth` (the iframe's virtual viewport width):

```javascript
var vw = window.innerWidth;  // iframe viewport (980px on mobile, ~1900px on desktop)
var sw = screen.width;        // device screen (412px on phone, 1920px on desktop)

if (vw > sw * 1.5) {
  // Mobile: iframe viewport is much wider than screen → zoom needed
} else {
  // Desktop: viewport ≈ screen → normal rendering
}
```

**Why `screen.width` and NOT `Math.min(screen.width, screen.height)`:**
On a landscape desktop monitor (1920x1080), `Math.min` returns 1080 (the height), and `1900 > 1080 × 1.5 = 1620` would incorrectly fire the mobile zoom. Using `screen.width` directly returns 1920, and `1900 > 2880` is correctly false.

**Why NOT `navigator.userAgent`:**
"Request Desktop Site" mode changes the UA string to a desktop UA, making phone detection impossible.

**Why NOT `@media (hover:hover)` or `@media (pointer:fine)`:**
Samsung Internet incorrectly reports `hover:hover` and `pointer:fine` on touchscreens due to a firmware bug.

---

## 3. CSS Zoom Approach

When the mobile condition fires (`vw > sw * 1.5`), the script applies CSS `zoom` to scale content up to fill the phone screen:

```javascript
var z = vw / sw;                          // e.g. 980/412 ≈ 2.38
document.body.style.zoom = z;             // scale everything up
document.body.style.width = (vw/z) + "px"; // set body width to match screen
document.body.style.overflowX = "hidden"; // prevent horizontal scroll
```

This makes content render at the correct physical size on the phone screen.

**On desktop**, the else branch optionally constrains the container width:

```javascript
var c = document.querySelector(".container");
if (c) c.style.maxWidth = "520px";  // or "900px" for dashboard pages
```

Both behaviors are encapsulated in `getZoomScript(desktopMaxWidth, adminFlag)` in `pages.gs`.

---

## 4. Admin Page Special Handling

The admin dashboard has complex tables and grids that break when zoomed. The zoom is applied only during the TZ login/OTP phase and removed when entering the dashboard:

```javascript
// On page load — zoom with flag:
getZoomScript(null, true)  // sets window._adminZoomed = true

// In enterAdminDashboard() — remove zoom:
if (window._adminZoomed) {
  document.body.style.zoom = "";
  document.body.style.width = "";
  document.body.style.overflowX = "";
  window._adminZoomed = false;
}
```

Other pages (register, poll, instructor) keep zoom throughout because their content renders well at the zoomed scale.

---

## 5. CSS Architecture

### 5.1 Shared Base CSS — `getBaseCSS()`

All pages call `getBaseCSS()` which returns the common CSS string. This is the **single source of truth** for:

| Category | What's included |
|----------|----------------|
| Reset | `*{box-sizing:border-box;margin:0;padding:0}` |
| Body | Font family, dark background (`#0f172a`), text color (`#e2e8f0`), min-height |
| Container | `max-width:100%; margin:0 auto` (base only — no padding, no background) |
| Section | Card-like styling: `background:#1e293b`, border, `border-radius:12px`, padding |
| Headings | `h1{color:#f8fafc}` (size/margin are page-specific) |
| Fields | Full `.field` chain: label, input, select, focus, readonly |
| Buttons | `.btn` base (border-radius, font-weight, cursor, transition) + all color variants |
| Toast | Top-center fixed position, show/success/error states |
| Spinner | Display toggle for loading indicators |

**Each page then adds overrides** for layout-specific properties:

```
body{padding:24px}              ← page-specific
.btn{display:block;width:100%}  ← form pages use full-width buttons
.btn{display:inline-block}      ← dashboard pages use inline buttons
h1{font-size:22px}              ← varies per page
```

### 5.2 Page-Specific CSS Rules

| Page | Key CSS differences |
|------|-------------------|
| Landing | `body: display:flex; align-items:flex-start`, container has `max-width:600px`, nav card styling |
| Register | Full-width buttons, `.result` card with background, `.tool-section` for weapon details |
| Poll | `.field{margin-bottom:16px}` (not 14px), container has background/border, radio groups, expired overlay |
| Instructor | `display:inline-block` buttons, `.btn-small{padding:10px 14px;white-space:nowrap}`, session cards, attendance panel |
| Admin | `display:inline-block` buttons, `.section{padding:32px}`, toast at bottom with opacity, tables, trainee management, owner panels |
| Print | Completely unique: white background, A4 landscape, `@media print` rules |
| Print OTP gate | Minimal: centered auth card, no shared base needed but uses it for field/button consistency |

### 5.3 Color Palette

All pages use a consistent dark theme:

| Token | Value | Usage |
|-------|-------|-------|
| Background primary | `#0f172a` | Body, inputs, deep cards |
| Background secondary | `#1e293b` | Sections, containers |
| Background tertiary | `#162033` | Hover states, tool sections |
| Text bright | `#f8fafc` | Headings |
| Text main | `#e2e8f0` | Body text |
| Text muted | `#94a3b8` | Labels, subtitles |
| Text dim | `#64748b` | Hints, disabled |
| Border | `#334155` | Section/card borders |
| Border input | `#475569` | Input field borders |
| Blue (primary) | `#3b82f6` / `#2563eb` | Primary buttons, focus |
| Green (success) | `#16a34a` / `#4ade80` | Success buttons/badges |
| Red (danger) | `#dc2626` / `#f87171` | Danger buttons, errors |
| Purple (secondary) | `#7c3aed` | New/special actions |
| Cyan (info) | `#0ea5e9` | Share button |
| Amber (warning) | `#fbbf24` / `#f59e0b` | Warnings, suspended |

---

## 6. Page Structure Patterns

### 6.1 TZ Entry Pages (Register, Poll, Instructor, Admin)

All TZ entry pages follow the same visual pattern — a centered section card:

```html
<div class="container">
  <div class="section" style="max-width:420px;margin:40px auto">
    <h1>Page Title</h1>
    <div class="field"><label>ת.ז.</label><input ...></div>
    <button class="btn btn-primary">Action</button>
  </div>
</div>
```

After authentication, the page transitions to a different view (form, dashboard, etc.).

### 6.2 Dashboard Pages (Instructor, Admin)

```html
<div class="container">
  <div id="loginArea" class="section" style="max-width:420px;margin:80px auto">
    <!-- TZ entry + OTP -->
  </div>
  <div id="dashboardArea" style="display:none">
    <div class="section"><!-- content --></div>
    <div class="section"><!-- content --></div>
  </div>
</div>
```

### 6.3 Desktop Max-Width via JS

| Page | Desktop max-width | Set by |
|------|------------------|--------|
| Landing | 600px | CSS (in container style) |
| Register | 520px | `getZoomScript('520px')` |
| Poll | 520px | `getZoomScript('520px')` |
| Instructor | 900px | `getZoomScript('900px')` |
| Admin | 900px | CSS (in container style) |

---

## 7. Rules for Future Updates

### DO:
1. **Add new CSS to `getBaseCSS()`** if a rule is shared across 3+ pages
2. **Override base rules** in page-specific CSS when a page needs different values
3. **Use `getZoomScript()`** for any new page — never write zoom detection inline
4. **Test on both mobile and desktop** — the zoom behavior must work in both contexts
5. **Test with "Request Desktop Site" enabled** — the detection must still work
6. **Keep the admin page's conditional zoom** pattern for any future dashboard with complex tables
7. **Increment patch version** in `config.gs` and `pages.gs` header on every edit

### DON'T:
1. **Never use `@media` queries** for mobile/desktop detection inside GAS — they check the iframe viewport, not the device
2. **Never use `navigator.userAgent`** for device detection — "Desktop Site" mode spoofs it
3. **Never use `Math.min(screen.width, screen.height)`** — returns screen height on landscape desktops, incorrectly triggering zoom
4. **Never use `@media (hover:hover)` or `@media (pointer:fine)`** — Samsung browser reports these incorrectly on touchscreens
5. **Never add `<meta name="viewport">`** expecting it to work — GAS iframe ignores it
6. **Never assume GAS iframe width equals device width** — the iframe always uses a ~980px virtual viewport on mobile
7. **Don't modify approved visual formatting/layout** without explicit approval
8. **Don't change print page CSS** — it uses a completely separate styling system optimized for thermal printers and A4 landscape

### Adding a New Page:
```javascript
function getNewPageHtml() {
  return '<!DOCTYPE html><html lang="he" dir="rtl"><head>'
  + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
  + '<title>Page Title</title>'
  + '<style>' + getBaseCSS()
  + 'body{padding:24px}'
  + '.container{padding:0 16px}'
  // ... page-specific CSS ...
  + '</style></head><body>'
  // ... HTML content ...
  + getZoomScript('520px')  // or '900px' for dashboards
  + '</body></html>';
}
```

---

## 8. Version History (GUI-related)

| Version | Change |
|---------|--------|
| v5.1.0 | Landing page top-align, mobile containers, instructor button sizing |
| v5.1.1 | Raised mobile breakpoint from 600px to 1024px |
| v5.1.2 | Replaced CSS @media with JS screen.width detection (wrong approach — later fixed) |
| v5.1.3 | Added `target="_blank"` to admin link in instructor dashboard |
| v5.1.4 | Mobile-first CSS + UA-based desktop detection (still broken by Desktop Site mode) |
| v5.1.5 | Switched to `@media(hover:hover)` detection (broken by Samsung firmware bug) |
| v5.1.6 | Switched to `@media(min-width:1200px)` (broken by Desktop Site viewport inflation) |
| v5.1.7 | Removed all @media desktop overrides (still tiny on mobile) |
| v5.1.8 | **Root cause found:** GAS iframe ignores viewport meta. Implemented CSS zoom fix using `screen.width` vs `window.innerWidth` comparison |
| v5.1.9 | Fixed PC zoom (changed `Math.min` to `screen.width`), admin conditional zoom, register/poll visual match to instructor/admin login style |
| v5.2.0 | Extracted shared CSS into `getBaseCSS()`, zoom script into `getZoomScript()`. Single source of truth for all page styling |
