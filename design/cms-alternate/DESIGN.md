---
name: "weddinvita — Buku Persiapan (local CMS study)"
description: "An implemented five-page local design alternative; not a production design approval."
colors:
  background: "#F8F7F3"
  surface: "#FFFFFF"
  sidebar: "#E9EDF7"
  text: "#202B3D"
  muted: "#596477"
  border: "#D8DDE6"
  input-border: "#7C879A"
  primary: "#2949A0"
  primary-hover: "#203B82"
  primary-active: "#172E6C"
  primary-soft: "#EDF1FC"
  focus: "#2949A0"
  success: "#256044"
  success-soft: "#EAF4ED"
  warning: "#80551D"
  warning-soft: "#FBF0DE"
  danger: "#A12B3A"
  danger-soft: "#FCEDEF"
  sidebar-text: "#3D4E74"
  sidebar-muted: "#4A5878"
  nav-hover: "#DDE4F5"
  table-header: "#F0F3FA"
  row-hover: "#F7F9FE"
  secondary-active: "#DDE5FA"
  disabled-background: "#EDF0F4"
  disabled-field: "#F0F2F6"
  scrim: "#202B3D66"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "48px"
    fontWeight: 500
    lineHeight: "56px"
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: "36px"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-0.015em"
  subsection:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
  body:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  body-compact:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22px"
  table:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  helper:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
  metric:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: "36px"
  wordmark:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "-0.02em"
rounded:
  control: "8px"
  panel: "12px"
  dialog: "16px"
  status: "6px"
spacing:
  step-1: "4px"
  step-2: "8px"
  step-3: "12px"
  step-4: "16px"
  step-5: "20px"
  step-6: "24px"
  step-7: "28px"
  step-8: "32px"
  step-9: "36px"
  step-10: "40px"
  step-11: "48px"
  step-12: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
    height: "44px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
    height: "48px"
  navigation-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px"
    height: "48px"
  status-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.status}"
    padding: "3px 8px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "24px"
---
# Design System: weddinvita — Buku Persiapan

## Overview

**Creative North Star: "Buku Persiapan"**

Buku Persiapan gives wedding preparation the clarity of a well-kept planning book: warm white working space, pale blue navigation, blue actions, and comparable rows. The metaphor lives in orderly information and calm Indonesian copy, without simulated paper or book ornament.

This records the implemented local study only: login, Tamu Undangan, Pesan & Preview, Foto & Lagu, and Detail Acara. The direction is an agent recommendation selected under the brief, not user approval for production. All example data and changes are synthetic and in memory; reload resets the study. No production CMS or invitation styling is governed by this file.

**Key Characteristics:**
- One local Inter family across login and CMS.
- Flat, bordered working surfaces with restrained blue emphasis.
- Familiar labeled navigation and explicit invitation-versus-person counts.
- Mobile access through Menu and a contained scrolling guest table.

Source of truth: [styles.css](styles.css), with component markup in [index.html](index.html) and local interactions in [prototype.js](prototype.js). Frontmatter extracts real values, including reused literals; it does not claim that every type or spacing value is already a CSS custom property. The [brand recommendation](../../docs/weddinvita-brand-identity.md), [CMS specification](../../docs/weddinvita-cms-design-spec.md), and [handoff tokens](../../docs/weddinvita-cms-design-tokens.md) describe the broader target; unimplemented target behavior is not evidence for this record.

## Colors

### Primary

Preparation blue identifies actions, links, the wordmark, active desktop navigation, and the people total. Its darker variants express hover and pressed state. The soft blue supports row selection, template tokens, and the mobile people group.

### Neutral

Warm white holds the workspace and login form area; white holds panels, controls, header, and dialogs. Pale blue anchors navigation and the login introduction. Ink and muted slate form the text hierarchy. The panel border separates surfaces; the stronger input border identifies editable controls. Sidebar text has its own darker blue-gray literals.

### Status

Success green labels active/attending states, amber identifies a browser limit or warning, and red identifies errors or risky actions. Neutral tags cover other attendance answers. Status always has written text; a lack of confirmation does not become a red error.

## Typography

Inter is self-hosted in four weights (400, 500, 600, 700), with system sans fallbacks and `font-display: swap`. The frontmatter records the reused desktop roles; there is no separate decorative display family. Display is the login introduction, headline is the page heading, and title is a section heading. Compact body text serves instructions and message previews; helper text serves counters and metadata. Table and metric numbers use tabular figures where applied.

At widths up to 899px, login display becomes 36/44px; up to 599px it becomes 32/40px and page headings become 24/32px. Other mobile summary metrics become 24/32px while the people figure stays 28px. Panel prose is limited to 72ch. The 24/32px wordmark becomes 22px in the compact sidebar and 20px in the mobile header; its inherited line-height remains 32px in the implementation.

**The Unit Clarity Rule.** Keep invitation counts distinct from people attending; never remove their unit labels.

## Layout

The desktop app has a 208px sidebar and a flexible workspace, with an 80px account header. Main content uses 36px top, 32px horizontal, and 48px bottom padding. At 1600px and above, main content has a 1440px maximum width. At 1199px and below the sidebar becomes 184px and main inset becomes 24px. At 899px and below the sidebar yields to a labeled Menu button and native navigation dialog; the header becomes 72px. At 599px and below main inset becomes 16px, form/media grids become one column, and save actions fill available width.

Spacing follows the extracted mostly 4px rhythm, with local 6px/10px gaps and 9px/11px control padding where the CSS uses them. The standard form column is at most 760px; login fields at most 400px. Guest data stays a table, with a minimum width of 1164px inside its own scroll region, sticky column headers, and naturally growing rows whose declared height is 76px. The scroll region caps at 580px desktop and 600px mobile. The five desktop summary groups become three columns and then two; the people group occupies a full pale blue row on narrow phones.

## Elevation & Depth

**The Flat Working Surface Rule.** Use borders and tonal grouping for working panels; reserve the implemented shadow for dialogs and notices.

Panels and tables have no shadow. Native dialogs and fixed notices share `0 16px 48px #202B3D29`; the modal backdrop uses ink at 40% alpha. Native dialog top-layer behavior handles modal stacking. Hover backgrounds transition in 120ms; reduced-motion removes transitions and animation. The declared drawer duration and easing variables do not correspond to an implemented drawer entrance animation.

## Shapes

Controls and small previews use the control radius, working panels and media cards the panel radius, and dialogs the dialog radius. Status tags use the smaller status radius. Borders are 1px. Circles belong to the avatar and switch dot. The message preview bubble has one square bottom corner. Action hit areas are at least 44px; standard inputs are at least 48px, with 44px pagination fields. The 18px checkbox is inside a 44px wrapper; its artwork is not the hit area.

## Components

### Buttons

Clear, compact, and labeled. Primary uses blue with white semibold text, darkens on hover, and darkens again when pressed. Secondary uses white with an input-strength border; quiet removes the border/background at rest. All retain a visible 3px focus outline with a 3px offset. Disabled buttons use readable muted text and an opaque pale background. Destructive confirmation uses danger red; the study inherits the general primary hover/active rules for this variant, rather than establishing a separate red state ramp.

### Inputs / Fields

Real labels sit above white bordered fields with an 8px gap. Placeholders are supporting copy. Field errors appear in text; the message template also sets `aria-invalid` and associates counter/error text. Native select, date, time, and file controls remain recognizable. Field loading temporarily disables controls and shows written save status. The local save timer is a simulation, not server persistence.

### Navigation

Four labeled destinations remain in the same order. Desktop selection uses a solid primary background and white text with `aria-current`; mobile selection uses a soft primary background. SVG icons use currentColor, a 24-unit viewBox, and 1.75px strokes; desktop navigation artwork is 18px, row action artwork 16px, inside larger targets. A keyboard skip link precedes navigation.

### Chips / Tags

Noninteractive status tags have a compact rounded silhouette and text plus semantic color. Template token buttons use soft blue and remain actionable 44px controls. Do not treat status tags as filter buttons.

### Cards / Containers

White bordered panels use 24px desktop padding and 20px narrow-phone padding; media cards use 20px. Empty media slots use a neutral placeholder rather than fabricated photography. Local file selection and upload feedback do not imply server conversion or durable storage.

### Guest Summary and Table

The signature is a comparison-friendly summary with explicit unit labels, followed by searchable, filterable guest rows. Selection uses both checkboxes and a soft blue row. Row actions remain available through the scroll region. Written browser counts distinguish access from attendance. Local filtering, sorting, selection, pagination, and guest editing only mutate mock state.

### Dialogs and Feedback

Native dialogs cap at 520px and viewport width minus 32px, with scroll for long content. Risk confirmation focuses Batal first; editor opening focuses the first input. The modal returns focus to its opener or the current page heading. Notices remain until dismissed and use status/alert semantics. Login deliberately demonstrates a delayed failure; no authentication is performed.

## Do's and Don'ts

### Do:
- Do preserve the lowercase weddinvita wordmark and local Inter family.
- Do keep visible labels, written status, and focus outlines alongside color.
- Do preserve a minimum 44px action target and 48px standard field height; pagination fields are 44px.
- Do keep invitation and person totals distinct, including the pale blue people group on mobile.
- Do treat all saves, uploads, login, and guest changes here as local simulations.

### Don't:
- Don't apply this study stylesheet or its root variables to the production invitation.
- Don't replace comparable guest rows with decorative cards.
- Don't turn the book metaphor into paper textures, page flips, or ornamental tabs.
- Don't claim a passing accessibility audit or production behavior from this local prototype.
