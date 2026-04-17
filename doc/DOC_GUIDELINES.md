# Document Design Guidelines — אימוני ירי Manuals

**Reference document:** `manuals/מדריך_למדריך_v5012.docx` (Hebrew instructor manual)  
**Created:** April 2026  
**Purpose:** Ensure all project manuals share identical formatting and visual design.

---

## Golden Rule

**Always clone the instructor manual and modify content. Never create .docx files from scratch.**

The instructor manual was originally authored in Google Docs and contains a complete, Word-compatible style system with correct RTL behavior, font inheritance, spacing, and page layout. Generating documents with `docx-js` (or any programmatic library) produces fundamentally different XML and will not match.

---

## Workflow: Creating a New Manual

1. **Copy** the instructor manual .docx to the new filename
2. **Unpack** using the docx skill's unpack tool:
   ```bash
   python scripts/office/unpack.py source.docx unpacked_dir/
   ```
3. **Edit** `unpacked_dir/word/document.xml` using the Edit tool — replace Hebrew text with new content, add/remove paragraphs following the existing XML patterns
4. **Repack**:
   ```bash
   python scripts/office/pack.py unpacked_dir/ output.docx --original source.docx
   ```
5. **Validate** by opening in Word or Google Docs (NOT by converting to PDF — PDF conversion is not part of the task)

### What NOT to do

- Do NOT use `docx-js` / Node.js to generate manuals from scratch
- Do NOT convert to PDF for verification — the deliverable is .docx only
- Do NOT write Python scripts for bulk text replacement — use the Edit tool directly on XML for precise, reviewable changes
- Do NOT add `xml:space="preserve"` to every `<w:t>` tag — only where the original has it or where leading/trailing spaces exist

### Verified Working Process (April 2026)

This exact process produced מדריך_למדריך, מדריך_למתאמן, מדריך_למנהל, and Instructor_Manual with identical formatting:

1. Clone instructor .docx → unpack → get identical styles.xml, theme, fonts, numbering
2. Write new document.xml body using ONLY the element patterns documented below
3. Every paragraph: `<w:jc w:val="left"/>` — no `<w:bidi/>`, no other overrides
4. Every run: ONLY overrides (bold, color, size) — no `<w:rFonts>`, no `<w:rtl/>`, no `<w:bCs/>`, no `<w:szCs/>`
5. Pack with `--original` pointing to the cloned instructor .docx
6. Verify: `grep -c '<w:bidi/>' document.xml` = 0, `grep -c '<w:rtl/>' document.xml` = 0, `grep -c '<w:rFonts' document.xml` = 0

---

## Style System (from instructor manual)

### Normal Style (inherited by all paragraphs)

```xml
<w:style w:type="paragraph" w:default="1" w:styleId="Normal">
  <w:pPr>
    <w:bidi/>                                          <!-- RTL paragraph direction -->
    <w:spacing w:after="120" w:line="360" w:lineRule="auto"/>  <!-- 6pt after, 1.5x line -->
    <w:jc w:val="right"/>                              <!-- default right-aligned -->
  </w:pPr>
  <w:rPr>
    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>        <!-- Arial font -->
    <w:color w:val="1A1A2E"/>                           <!-- dark body text -->
    <w:sz w:val="24"/>                                  <!-- 12pt -->
    <w:rtl/>                                            <!-- RTL run direction -->
  </w:rPr>
</w:style>
```

Because these properties are in the Normal style, individual paragraphs and runs **inherit them automatically** and only need to specify overrides.

### Paragraph Alignment

All content paragraphs in the instructor manual use:
```xml
<w:jc w:val="left"/>
```
This overrides the Normal style's `right` and produces the correct visual layout in Word/Google Docs for Hebrew RTL text. **Always use `<w:jc w:val="left"/>` on content paragraphs** — this is how the original Google Docs export works.

### Key Difference: Instructor vs docx-js

| Property | Instructor Manual (correct) | docx-js Output (incorrect) |
|----------|---------------------------|---------------------------|
| Paragraph alignment | `<w:jc w:val="left"/>` | `<w:jc w:val="right"/>` |
| `<w:bidi/>` | In Normal style only | Repeated on every paragraph |
| `<w:rtl/>` | In Normal style only | Repeated on every run |
| Font declaration | `w:ascii` + `w:hAnsi` only | All 4 variants on every run |
| Line spacing | `w:line="360"` (1.5x) | None (single-spaced) |
| Default spacing after | `w:after="120"` (6pt) | None |
| Run properties | Only overrides (bold, color, size) | Full specification repeated |

---

## Element Catalog

### Title Block (page 1)

```xml
<!-- Spacer -->
<w:p><w:pPr><w:spacing w:before="1200"/><w:jc w:val="left"/></w:pPr></w:p>

<!-- Title -->
<w:p>
  <w:pPr><w:spacing w:after="40"/><w:jc w:val="left"/></w:pPr>
  <w:r>
    <w:rPr><w:b/><w:color w:val="1E3A5F"/><w:sz w:val="52"/></w:rPr>
    <w:t>מערכת ניהול אימוני ירי</w:t>
  </w:r>
</w:p>

<!-- Subtitle (role) -->
<w:p>
  <w:pPr><w:spacing w:after="80"/><w:jc w:val="left"/></w:pPr>
  <w:r>
    <w:rPr><w:color w:val="475569"/><w:sz w:val="28"/></w:rPr>
    <w:t>מדריך למדריך</w:t>     <!-- change per role -->
  </w:r>
</w:p>

<!-- Version -->
<w:p>
  <w:pPr><w:spacing w:after="400"/><w:jc w:val="left"/></w:pPr>
  <w:r>
    <w:rPr><w:color w:val="94A3B8"/><w:sz w:val="20"/></w:rPr>
    <w:t>גרסה 5.0.12 • אפריל 2026</w:t>
  </w:r>
</w:p>

<!-- Separator line -->
<w:p>
  <w:pPr>
    <w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="1E3A5F"/></w:pBdr>
    <w:spacing w:before="240" w:after="240"/>
    <w:jc w:val="left"/>
  </w:pPr>
</w:p>
```

### Table of Contents

```xml
<!-- TOC heading -->
<w:p>
  <w:pPr><w:jc w:val="left"/></w:pPr>
  <w:r>
    <w:rPr><w:b/><w:color w:val="1E3A5F"/></w:rPr>
    <w:t>תוכן עניינים</w:t>
  </w:r>
</w:p>

<!-- TOC entry -->
<w:p>
  <w:pPr>
    <w:spacing w:after="40"/>
    <w:ind w:left="170"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:sz w:val="22"/></w:rPr>
    <w:t>1. סקירה כללית</w:t>
  </w:r>
</w:p>
```

### Section Header (numbered, blue bottom border)

```xml
<w:p>
  <w:pPr>
    <w:pBdr>
      <w:bottom w:val="single" w:sz="8" w:space="4" w:color="1E3A5F"/>
    </w:pBdr>
    <w:spacing w:before="360" w:after="160"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:color w:val="1E3A5F"/><w:sz w:val="32"/></w:rPr>
    <w:t>1. סקירה כללית</w:t>
  </w:r>
</w:p>
```

Border color is **1E3A5F** (dark navy), not 3B82F6 (bright blue).

### Sub-Header (bold, dark text)

```xml
<w:p>
  <w:pPr>
    <w:spacing w:before="200" w:after="80"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:color w:val="334155"/><w:sz w:val="26"/></w:rPr>
    <w:t>צפייה באימונים:</w:t>
  </w:r>
</w:p>
```

### Body Paragraph

```xml
<w:p>
  <w:pPr><w:jc w:val="left"/></w:pPr>
  <w:r>
    <w:t>Regular body text inherits all formatting from Normal style.</w:t>
  </w:r>
</w:p>
```

Runs only specify overrides. If a word needs bold:
```xml
<w:r><w:rPr><w:b/></w:rPr><w:t>bold text</w:t></w:r>
```

### Numbered Step

```xml
<w:p>
  <w:pPr>
    <w:spacing w:after="60"/>
    <w:ind w:left="360" w:hanging="360"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:color w:val="3B82F6"/><w:sz w:val="22"/></w:rPr>
    <w:t xml:space="preserve">1  </w:t>
  </w:r>
  <w:r>
    <w:t>Step description text.</w:t>
  </w:r>
</w:p>
```

Step number is **3B82F6** (blue), bold, 11pt. Description inherits Normal.

### Bullet Item

```xml
<w:p>
  <w:pPr>
    <w:spacing w:after="40"/>
    <w:ind w:left="500" w:hanging="220"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:color w:val="3B82F6"/></w:rPr>
    <w:t xml:space="preserve">• </w:t>
  </w:r>
  <w:r>
    <w:t>Bullet text here.</w:t>
  </w:r>
</w:p>
```

Bullet character is **3B82F6** (blue). Text inherits Normal.

### Tip Box (blue, ℹ icon)

```xml
<w:p>
  <w:pPr>
    <w:pBdr>
      <w:top w:val="single" w:sz="4" w:space="4" w:color="BFDBFE"/>
      <w:left w:val="single" w:sz="4" w:space="6" w:color="BFDBFE"/>
      <w:bottom w:val="single" w:sz="4" w:space="4" w:color="BFDBFE"/>
      <w:right w:val="single" w:sz="4" w:space="6" w:color="BFDBFE"/>
    </w:pBdr>
    <w:shd w:val="clear" w:color="auto" w:fill="DBEAFE"/>
    <w:spacing w:before="120" w:after="120"/>
    <w:ind w:left="170" w:right="170"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:color w:val="1E40AF"/><w:sz w:val="22"/></w:rPr>
    <w:t>ℹ Tip text here.</w:t>
  </w:r>
</w:p>
```

**OOXML border order must be: top, left, bottom, right** — not top, bottom, left, right.

| Part | Color |
|------|-------|
| Border | BFDBFE |
| Background | DBEAFE |
| Text | 1E40AF |

### Warning Box (yellow, ⚠ icon)

```xml
<w:p>
  <w:pPr>
    <w:pBdr>
      <w:top w:val="single" w:sz="4" w:space="4" w:color="FDE68A"/>
      <w:left w:val="single" w:sz="4" w:space="6" w:color="FDE68A"/>
      <w:bottom w:val="single" w:sz="4" w:space="4" w:color="FDE68A"/>
      <w:right w:val="single" w:sz="4" w:space="6" w:color="FDE68A"/>
    </w:pBdr>
    <w:shd w:val="clear" w:color="auto" w:fill="FEF3C7"/>
    <w:spacing w:before="120" w:after="120"/>
    <w:ind w:left="170" w:right="170"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:color w:val="92400E"/><w:sz w:val="22"/></w:rPr>
    <w:t>⚠ Warning text here.</w:t>
  </w:r>
</w:p>
```

| Part | Color |
|------|-------|
| Border | FDE68A |
| Background | FEF3C7 |
| Text | 92400E |

### Footer

```xml
<w:p>
  <w:pPr>
    <w:pBdr>
      <w:top w:val="single" w:sz="6" w:space="8" w:color="CBD5E1"/>
    </w:pBdr>
    <w:spacing w:before="600"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:color w:val="94A3B8"/><w:sz w:val="18"/></w:rPr>
    <w:t>מערכת ניהול אימוני ירי — גרסה 5.0.12 — אפריל 2026</w:t>
  </w:r>
</w:p>
```

---

## Color Palette

| Usage | Hex | Description |
|-------|-----|-------------|
| Title, section headers | 1E3A5F | Dark navy |
| Sub-headers | 334155 | Dark slate |
| Body text | 1A1A2E | Near-black (Normal style) |
| Subtitle (role) | 475569 | Medium slate |
| Version, footer | 94A3B8 | Light gray |
| Step numbers, bullets | 3B82F6 | Blue accent |
| Section header border | 1E3A5F | Dark navy (same as title) |
| Tip box border | BFDBFE | Light blue |
| Tip box background | DBEAFE | Pale blue |
| Tip box text | 1E40AF | Dark blue |
| Warning box border | FDE68A | Light yellow |
| Warning box background | FEF3C7 | Pale yellow |
| Warning box text | 92400E | Dark amber |
| Footer separator | CBD5E1 | Light gray |

---

## Font Sizes

| Element | Size (half-points) | Size (points) |
|---------|-------------------|---------------|
| Title | 52 | 26pt |
| Subtitle (role) | 28 | 14pt |
| Section header | 32 | 16pt |
| Sub-header | 26 | 13pt |
| Body text (Normal) | 24 | 12pt |
| Step number | 22 | 11pt |
| TOC entry | 22 | 11pt |
| Tip/warning text | 22 | 11pt |
| Version line | 20 | 10pt |
| Footer | 18 | 9pt |

---

## Spacing Reference

| Element | Before | After | Line |
|---------|--------|-------|------|
| Normal (default) | — | 120 | 360 (1.5x) |
| Title spacer | 1200 | — | — |
| Title text | — | 40 | — |
| Subtitle (role) | — | 80 | — |
| Version | — | 400 | — |
| Separator line | 240 | 240 | — |
| TOC entry | — | 40 | — |
| Section header | 360 | 160 | — |
| Sub-header | 200 | 80 | — |
| Step item | — | 60 | — |
| Bullet item | — | 40 | — |
| Tip/warning box | 120 | 120 | — |
| Footer | 600 | — | — |

All values in DXA (twentieths of a point). Spacing not listed inherits from Normal.

---

## RTL Handling

The instructor manual's RTL setup relies entirely on the Normal style:

- `<w:bidi/>` in `<w:pPr>` — sets paragraph direction to RTL
- `<w:rtl/>` in `<w:rPr>` — sets run direction to RTL
- `<w:jc w:val="right"/>` in `<w:pPr>` — default alignment

Individual paragraphs then override with `<w:jc w:val="left"/>`. This is how the original Google Docs export works and produces correct rendering in Word, Google Docs, and LibreOffice.

**Never add `<w:bidi/>` or `<w:rtl/>` to individual paragraphs/runs** — they inherit from Normal.

---

## English Translation Workflow

When creating an English (LTR) version from the Hebrew manual:

1. Clone the Hebrew manual, unpack
2. In `styles.xml`, remove from the Normal style:
   - `<w:bidi/>` from `<w:pPr>`
   - `<w:rtl/>` from `<w:rPr>`
   - Change `<w:jc w:val="right"/>` to `<w:jc w:val="left"/>`
3. In `document.xml`, translate all Hebrew text to English
4. Remove any per-paragraph `<w:jc w:val="left"/>` overrides (now redundant since Normal is LTR left-aligned)
5. Repack

---

## Checklist Before Delivery

- [ ] Document was created by cloning the instructor manual (not from scratch)
- [ ] styles.xml is identical to instructor manual (unless LTR conversion)
- [ ] All paragraphs use `<w:jc w:val="left"/>` (inheriting bidi/rtl from Normal)
- [ ] Runs specify only overrides — no repeated font/rtl/size declarations
- [ ] Section header border color is 1E3A5F (not 3B82F6)
- [ ] OOXML border order is top, left, bottom, right
- [ ] Line spacing is 1.5x (inherited from Normal: `w:line="360"`)
- [ ] Paragraph after-spacing is 6pt (inherited from Normal: `w:after="120"`)
- [ ] No PDF conversion was performed — deliverable is .docx only
- [ ] Validated with `pack.py --original`
- [ ] Smart quotes used for apostrophes and quotation marks (`&#x2019;`, `&#x201C;`, `&#x201D;`)
