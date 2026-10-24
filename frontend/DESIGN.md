---
name: "weddinvita CMS — Studio V2"
description: "An open preparation desk for managing an invitation."
colors:
  primary: "#183D32"
  primary-hover: "#102F26"
  paper: "#FAFAF7"
  surface: "#FFFFFF"
  soft: "#E7F0EB"
  ink: "#22261F"
  muted: "#5C6257"
  line: "#DFE2D8"
  input-border: "#7B8372"
  soft-text: "#466154"
  on-primary-muted: "#D3E7DC"
  success: "#315B3E"
  danger: "#A12B3A"
  disabled: "#E7EDE9"
  disabled-text: "#59665F"
  disabled-border: "#CED8D1"
typography:
  headline:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: "54px"
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "16px"
    lineHeight: 1.6
  field:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  helper:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "12px"
    lineHeight: "18px"
rounded:
  tag: "5px"
  navigation: "8px"
  control: "10px"
  panel: "12px"
  pill: "999px"
spacing:
  compact: "12px"
  small: "16px"
  mobile-inset: "20px"
  panel-inset: "24px"
  event-inset: "28px"
  workspace-gap: "32px"
  desktop-inset: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.control}"
    padding: "11px 14px"
  section-navigation-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "14px 12px"
  tag-attending:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.tag}"
    padding: "3px 8px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "24px"
  message-preview:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.panel}"
    padding: "0"
---
# Design System: weddinvita CMS — Studio V2

## Overview

**Creative North Star: "Studio — an open preparation desk"**

Studio V2 is the approved production extension of Studio: an open preparation desk with warm-white ground, white work surfaces, Manrope and restrained forest green. It keeps guest comparison spacious and gives each settings task a clear local work area. Indonesian copy is warm, calm and direct.

This records the CMS implementation in `src/main.tsx`, `admin.css` and `studio.css`; the latter overrides the former only through the admin entry. It does not redefine the public invitation theme. The inherited direction seed is `0903cca35435964f`; no new visual-world roll is implied. Comparison studies remain separate historical alternatives.

**Key Characteristics:**
- Open guest table and five metrics, with people attending distinguished from invitations.
- One shared section-navigation pattern across event, message and media settings.
- Flat work surfaces, clear borders, labeled states and visible keyboard focus.
- One complete WhatsApp preview and persistent mounted text/file controls.

## Colors

### Primary

Forest green marks primary actions, the people-attending total, selected settings sections and keyboard focus. White text and pale helper text support green surfaces. The darker forest token supplies primary-button hover. Soft green groups supporting context and the message bubble; soft text handles its quieter metadata. Success and danger remain semantic, with written status labels.

### Neutral

Warm paper is the workspace ground; white supports fields, panels and table rows. Ink carries main text, muted olive carries help, light lines divide content and the stronger input-border token makes controls explicit. Disabled controls use their dedicated fill, text and border.

## Typography

Manrope is self-hosted in regular, semibold and bold TTF assets; the semibold file serves declared weights 500–600. System sans-serif is the fallback. The frontmatter records the desktop headline, event title, base body, field, label and helper roles. Content-panel headings use 22/30px; event headings use the title role. Body/help paragraphs are bounded at 75ch where the existing panel rules apply; event descriptions use 65ch.

At widths below 900px the page heading becomes 32/40px; below 600px it becomes 30/38px. Event titles become 22/30px below 600px. Guest totals use 26/34px. Login retains its larger 56/64px statement, becoming 40/48px below 600px.

## Layout

The desktop CMS has a horizontal wordmark, route navigation and account actions above a full-width workspace. Desktop page gutters are 40px, becoming 24px below 1200px and 20px below 600px. Below 900px a Menu control opens the route dialog. The guest page uses five metrics and a contained, horizontally scrollable semantic table; on mobile metrics form two columns with the people total spanning both.

Settings share a 192px left section menu. Below 900px the same choices become a labeled native select. Event settings add a flexible editor and 272px draft overview with 32px gaps. Below 1200px the overview moves under the menu; below 900px it sits above the editor as a disclosure. Event panels use 28px padding, reducing to 24px and then 20px at the two smaller breakpoints.

Message settings place editor and preview side by side from 1200px, with the preview beneath the editor at intermediate widths. Below 900px Edit / Pratinjau final switches visible panes. Media uses a three-column gallery plus a 360px inspector, reducing the inspector to 300px below 1200px. Below 900px it opens as a native modal; below 600px the gallery has two columns. Nine slots remain available. Couple cards use compact previews and local disclosure; music is capped at 800px.

## Elevation & Depth

The workspace, form panels, gallery inspector and message bubble are flat, using borders and pale surfaces for grouping. Standard dialogs retain the inherited overlay shadow and blurred dark backdrop; notices and some inherited controls retain their existing small shadows. The gallery inspector explicitly has no shadow, including its mobile presentation. The sidecar records the standard dialog material rather than treating it as a new accent.

Buttons and links transition background and border color over 150ms only when reduced motion is not requested. No additional motion grammar is introduced.

## Shapes

Controls have gently rounded control corners; white panels, gallery tiles and the preview bubble use panel corners. The page-heading action and settings-save action use a pill silhouette. Tags use the tighter tag radius. Standard dialogs retain control corners; the mobile gallery dialog uses panel corners. Keep corners subordinate to content and retain explicit field borders.

## Components

### Buttons and fields

Ordinary buttons retain a 44px minimum height and the frontmatter padding; primary buttons use green/white with darker hover. Page-heading and save actions are 48px tall on desktop. Fields use a 46px minimum height, white background, strong control border and 16px text. Disabled controls remain opaque with dedicated muted colors. Destructive text uses danger. Keyboard focus is a 3px forest outline offset by 3px; file pickers also expose focus within.

### Navigation and guest table

The active top-level route has a 2px underline offset by 12px. Settings buttons are ordinary buttons with `aria-current="step"`, 72px minimum height, 14/20px title and 12/18px helper. Active sections use green/white with pale helper text. Akses undangan has the advanced-setting separator. These controls select sections freely, rather than claiming completion. The native mobile select and section buttons share state and heading focus behavior.

The guest table keeps search, filters, sorting, pagination, page selection and row actions. Selected rows use soft green. Five metrics separate total invitations, confirmation states and people attending; color is always accompanied by labels.

### Detail Acara

Five sections cover Pasangan & keluarga, Acara & waktu, Lokasi acara, Hadiah and Akses undangan. Section selection and the previous/next pager preserve mounted fields. The overview describes current draft inputs rather than a successful save. One save applies all event fields; validation reveals the correct hidden section before focusing the invalid field.

### Pesan & Preview

Two editor sections cover the WhatsApp template and link preview. The preview always shows one complete bubble: installed image or empty image state, title, description, domain and the entire message including its link. The bubble is clipped at its corners; body padding is 20px and metadata padding is 16px. Mobile Edit / Pratinjau final changes the visible pane without discarding its draft.

One text save covers template, title and description. Thumbnail upload remains an independent action. The settings save bar starts inline and becomes sticky for changed content; it uses a 16px bottom inset, reducing to 8px below 600px. Field-focus handling keeps inputs above it. In the mobile message-preview view the changed save bar remains in normal flow.

### Foto & Lagu

Only the selected couple, gallery or music section is visible; hidden sections and all gallery MediaCards stay mounted. Couple-photo controls disclose inside compact cards. Nine numbered gallery tiles report written states and installed count; one selected card is visible in the desktop inspector or mobile native dialog. File selection, retry and upload remain separate. Closing the mobile dialog returns focus to its visible trigger; upload busy state prevents closing and conflicting actions. Viewport changes reuse the mounted controls.

Music uses the native audio player without autoplay and pauses when the section or route is left. Existing upload/delete/API behavior is retained. No cropping editor, reordering or bulk-media workflow is added.

The production UI check in `../tests/studio-ui.cjs` uses callback fixtures; screenshots and results live in `../design/cms-alternate/comparison/production-screenshots` and `production-verification.txt`. These are local UI evidence, not live-backend, WhatsApp-rendering, physical-device, screen-reader or completed WCAG-audit claims.

## Do's and Don'ts

### Do:
- **Do** preserve the distinction between invitations and people attending.
- **Do** retain native controls, visible focus, labeled states and contained table scrolling.
- **Do** preserve mounted fields and distinguish text saving, file selection and successful upload.
- **Do** apply this system through the admin entry and keep comparison studies separate.

### Don't:
- **Don't** introduce citrus or Fokus monochrome styling into Studio V2.
- **Don't** split the final WhatsApp preview into section-dependent fragments.
- **Don't** treat a selected file as installed media or a thumbnail upload as a text save.
- **Don't** infer publishing, automated WhatsApp delivery, extra media slots or backend changes from the layout.
