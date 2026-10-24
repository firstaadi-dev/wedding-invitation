---
name: "weddinvita CMS — Studio / Studio V2 / Fokus comparison"
description: "Local Studio, Studio V2 and Fokus studies; no production identity approval."
colors:
  studio-background: "#FAFAF7"
  studio-surface: "#FFFFFF"
  studio-text: "#22261F"
  studio-ink: "#252B20"
  studio-muted: "#5C6257"
  studio-citrus: "#E5F078"
  studio-citrus-hover: "#D9E865"
  studio-citrus-active: "#CEDC59"
  studio-citrus-border: "#B5C24A"
  studio-soft: "#F1F4DA"
  studio-border: "#DFE2D8"
  studio-input-border: "#7B8372"
  studio-focus: "#354C24"
  studio-success: "#315B3E"
  studio-success-soft: "#EEF4EB"
  fokus-background: "#F5F5F3"
  fokus-surface: "#FFFFFF"
  fokus-ink: "#171717"
  fokus-muted: "#626262"
  fokus-hover: "#333333"
  fokus-active: "#000000"
  fokus-soft: "#EEEEEB"
  fokus-border: "#DDDDDA"
  fokus-input-border: "#82827B"
  fokus-tag: "#F0F0EE"
  fokus-tag-text: "#4D4D4D"
  fokus-tag-active: "#E7E7E3"
  fokus-inspected: "#EFEFEC"
  studio-warning: "#80551D"
  studio-warning-soft: "#FBF0DE"
  studio-danger: "#A12B3A"
  studio-danger-soft: "#FCEDEF"
  fokus-danger: "#A12B3A"
  fokus-danger-soft: "#FCEDEF"
  studio-v2-primary: "#183D32"
  studio-v2-primary-hover: "#102F26"
  studio-v2-primary-active: "#0B241D"
  studio-v2-soft: "#E7F0EB"
  studio-v2-on-primary: "#FFFFFF"
  studio-v2-on-primary-muted: "#D3E7DC"
  studio-v2-overview-muted: "#466154"
  studio-v2-overview-border: "#C6D8CD"
  studio-v2-disabled: "#E7EDE9"
  studio-v2-disabled-text: "#59665F"
  studio-v2-disabled-border: "#CED8D1"
  studio-event-overview: "#F0F2E3"
  studio-event-overview-text: "#303A24"
  studio-event-overview-muted: "#515B43"
  studio-event-overview-border: "#CCD3B8"
typography:
  studio-headline:
    fontFamily: "Manrope, Inter, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: "54px"
    letterSpacing: "-0.04em"
  studio-body:
    fontFamily: "Manrope, Inter, system-ui, sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
  studio-data:
    fontFamily: "Manrope, Inter, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: "20px"
  studio-label:
    fontFamily: "Manrope, Inter, system-ui, sans-serif"
    fontSize: "12px"
    lineHeight: "18px"
  fokus-headline:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: "40px"
    letterSpacing: "-0.04em"
  fokus-body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
  fokus-data:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: "20px"
  fokus-label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    lineHeight: "18px"
  board-headline:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  studio-content-preview:
    fontFamily: "Manrope, Inter, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: "24px"
  studio-content-title:
    fontFamily: "Manrope, Inter, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "30px"
rounded:
  studio-control: "10px"
  studio-panel: "12px"
  studio-pill: "999px"
  fokus-control: "8px"
  fokus-panel: "12px"
  studio-dialog: "16px"
  fokus-dialog: "16px"
  board-card: "16px"
spacing:
  studio-gap: "24px"
  studio-inset: "40px"
  fokus-gap: "24px"
  fokus-inset: "32px"
  studio-mobile-inset: "16px"
  fokus-mobile-inset: "16px"
  board-gap: "32px"
  studio-event-gap: "32px"
  studio-event-panel-inset: "28px"
  studio-content-gap: "32px"
  studio-gallery-gap: "28px"
  studio-gallery-tile-gap: "16px"
  studio-gallery-compact-gap: "12px"
components:
  studio-button-primary:
    backgroundColor: "{colors.studio-citrus}"
    textColor: "{colors.studio-text}"
    rounded: "{rounded.studio-control}"
    padding: "9px 12px"
  studio-button-primary-hover:
    backgroundColor: "{colors.studio-citrus-hover}"
  studio-button-add:
    backgroundColor: "{colors.studio-citrus}"
    textColor: "{colors.studio-text}"
    rounded: "{rounded.studio-pill}"
    padding: "12px 20px"
    height: "48px"
  studio-input:
    backgroundColor: "{colors.studio-surface}"
    textColor: "{colors.studio-text}"
    rounded: "{rounded.studio-control}"
    padding: "11px 12px"
    height: "48px"
  studio-panel:
    backgroundColor: "{colors.studio-surface}"
    rounded: "{rounded.studio-panel}"
    padding: "24px"
  fokus-button-primary:
    backgroundColor: "{colors.fokus-ink}"
    textColor: "{colors.fokus-surface}"
    rounded: "{rounded.fokus-control}"
    padding: "9px 12px"
  fokus-button-primary-hover:
    backgroundColor: "{colors.fokus-hover}"
  fokus-input:
    backgroundColor: "{colors.fokus-surface}"
    textColor: "{colors.fokus-ink}"
    rounded: "{rounded.fokus-control}"
    padding: "11px 12px"
    height: "48px"
  studio-navigation:
    textColor: "{colors.studio-text}"
    rounded: "8px"
    padding: "10px 16px"
  fokus-navigation:
    backgroundColor: "{colors.fokus-ink}"
    textColor: "{colors.fokus-surface}"
    rounded: "8px"
    padding: "10px 16px"
  studio-tag-active:
    backgroundColor: "{colors.studio-success-soft}"
    textColor: "{colors.studio-success}"
    rounded: "6px"
    padding: "3px 8px"
  fokus-tag-active:
    backgroundColor: "{colors.fokus-tag-active}"
    textColor: "{colors.fokus-ink}"
    rounded: "6px"
    padding: "3px 8px"
  fokus-inspector:
    backgroundColor: "{colors.fokus-surface}"
    rounded: "{rounded.fokus-panel}"
    padding: "24px"
    width: "304px"
  studio-v2-button-primary:
    backgroundColor: "{colors.studio-v2-primary}"
    textColor: "{colors.studio-v2-on-primary}"
    rounded: "{rounded.studio-control}"
    padding: "9px 12px"
  studio-v2-button-primary-hover:
    backgroundColor: "{colors.studio-v2-primary-hover}"
  studio-v2-event-section-active:
    backgroundColor: "{colors.studio-v2-primary}"
    textColor: "{colors.studio-v2-on-primary}"
    rounded: "{rounded.studio-control}"
    padding: "14px 12px"
    height: "72px"
  studio-event-section-active:
    backgroundColor: "{colors.studio-citrus}"
    textColor: "{colors.studio-text}"
    rounded: "{rounded.studio-control}"
    padding: "14px 12px"
    height: "72px"
  studio-v2-event-overview:
    backgroundColor: "{colors.studio-v2-soft}"
    textColor: "{colors.studio-v2-primary}"
    rounded: "{rounded.studio-panel}"
    padding: "20px"
    width: "272px"
  studio-event-overview:
    backgroundColor: "{colors.studio-event-overview}"
    textColor: "{colors.studio-event-overview-text}"
    rounded: "{rounded.studio-panel}"
    padding: "20px"
    width: "272px"
  studio-gallery-tile:
    backgroundColor: "{colors.studio-surface}"
    textColor: "{colors.studio-text}"
    rounded: "{rounded.studio-panel}"
    padding: "0"
  studio-v2-gallery-tile:
    backgroundColor: "{colors.studio-surface}"
    textColor: "{colors.studio-text}"
    rounded: "{rounded.studio-panel}"
    padding: "0"
  studio-couple-card:
    backgroundColor: "{colors.studio-surface}"
    textColor: "{colors.studio-text}"
    rounded: "{rounded.studio-panel}"
    padding: "20px"
  studio-message-final-preview:
    backgroundColor: "{colors.studio-soft}"
    textColor: "{colors.studio-text}"
    rounded: "{rounded.studio-panel}"
    padding: "0"
  studio-v2-message-final-preview:
    backgroundColor: "{colors.studio-v2-soft}"
    textColor: "{colors.studio-text}"
    rounded: "{rounded.studio-panel}"
    padding: "0"
---
# Design System: weddinvita comparison study

## Overview

**Creative North Star: "Studio — an open preparation desk; Fokus — a guest review workspace"**

This records Studio and Fokus, plus the explicitly requested Studio V2 color variation, implemented in this folder. Studio combines warm paper, Manrope and citrus with a full-width guest table. Fokus combines Inter, monochrome navigation and a persistent guest inspector. Their names describe local study directions, not approved brand commitments. The original board recommends Studio provisionally. The user praised Studio and authorized a green V2 comparison and a redesigned Detail Acara preview; this is not final product or production approval.

Scope is this comparison study only. Product truth is inherited from [PRODUCT.md](../PRODUCT.md); direction and comparison rationale live in [BRIEF.md](BRIEF.md) and the [comparison report](../../../docs/weddinvita-cms-design-comparison.md). The frontmatter records reused observed values from `concepts.css`, `board.css`, `studio-v2.css`, `event-editor.css`, `event-editor.js`, `content-editors.css`, `content-editors.js`, `section-navigation.js` and inherited `../styles.css`. Prefixes keep alternatives separate even when values coincide. No rule here changes the baseline, application, or invitation theme. Indonesian copy remains warm, clear and calm; all data and interactions are fictional local simulations.

**Key Characteristics:**
- Studio: open table, warm white, Manrope and restrained citrus.
- Fokus: monochrome master/detail with actions beside the selected guest.
- Board: Studio-derived review surface with equally sized concept previews and synchronized page/device controls.
- Studio V2: the same Studio geometry and functionality with the requested reference green.
- Studio / V2 event editor: five freely selectable sections, current-input summary and one save scope.
- Studio / V2 content editors: shared local section navigation, one complete WhatsApp preview and selected media sections preserve mounted draft/file state.
- All studies: five available pages, semantic tables, native fields and explicit action feedback.

## Colors

### Primary

Studio citrus marks primary actions and the people-attending total; its text is dark. Studio ink handles ordinary links and supporting controls. Fokus ink carries primary actions and navigation, with white text; selected navigation reverses that pair. Danger remains semantic red in both directions.

Studio V2 replaces the Studio accent with the requested deep green, white primary text and pale green supporting surfaces. The prefixed primary, hover, active, soft and on-primary-muted values are normative for V2 only. The same palette is used for the attending-total emphasis, selected event section, links and focus. Danger/warning/success retain their semantic roles. V2 keeps Studio warm-white canvas, dark body text, fields, Manrope and dimensions; it is a color-only variation. Disabled primaries use the V2 disabled fill, text and border roles.

### Neutral

Studio uses warm white as canvas, white for fields/forms, muted olive text and distinct control borders. Fokus uses a light neutral ground, white surfaces and gray dividers; inspected rows and status tags use separate observed neutral fills. Status labels retain words rather than relying on color. Studio retains green success and amber warning styling from the prototype; Fokus uses labeled monochrome statuses and an inverse warning tag.

**The Separate Alternatives Rule.** Use one concept's prefixed tokens within its surface; the board's Studio-derived palette does not select or merge the production identity.

## Typography

Studio uses locally bundled Manrope regular, semibold and bold with Inter/system fallbacks. Fokus inherits locally bundled Inter regular, medium, semibold and bold. The Manrope semibold asset also serves declared weight 500; this is a font-file mapping, not a separate face.

Desktop headlines use the prefixed headline roles. Below 600px Studio headlines become 32/40px and Fokus 28/36px. Body is 16/24px; table data 14/20px; helpers 12/18px. Summary figures are Studio 26/34px and Fokus 22/30px, becoming 22/30px on small screens. Numeric totals and counts inherit tabular figures. Inspector names use 24/32px, weight 600 from the inherited heading style. Existing forms retain 20/28px section headings and 16/24px subsection headings.

Studio V2 uses the complete Studio type ramp without a new face or scale. The shared event section heading is 24/32px, becoming 22/30px below 600px; its overview title is 22/30px and labels are 12/18px.

The board has its own 56px headline with 1.1 line height, 44px below 900px and 36/42px below 600px; do not apply its presentation scale to operational screens. Its body uses line height 1.6. Login storytelling uses a separate 56/64px heading, 40/48px below 1200px and 36/44px below 600px.

## Layout

Studio uses top navigation and an open full-width workspace: desktop navigation inset 40px, main padding 24px 40px 40px. A viewport of 1440px leaves 1360px for content. The table is not enclosed in an extra panel; it retains a minimum width of 1164px and horizontal scrolling inside its region. Default table maximum height is 580px.

Fokus uses a dark topbar with 32px horizontal inset. On the guest page at widths of at least 1200px, the split is `minmax(0, 1fr) 304px` with a 24px gap. The white inspector is sticky at 24px from the top. Its table remains 1164px minimum and scrolls within the narrower list area, with maximum height 620px. Other pages use the inherited form/media composition, not this split.

At widths below 1200px Fokus hides the inspector and opening a guest name shows a detail dialog. Below 900px both concepts replace top navigation with Menu and a 72px account header. Below 600px main padding is 24px 16px 32px; summary becomes two columns, search spans the toolbar, status and confirmation share a row, and table scrolling remains contained. At widths of at least 1600px main is capped at 1600px. Inputs remain at least 48px high; principal controls remain at least 44px high.

The board caps content at 1600px, uses two equal columns with a 32px gap, and stacks concepts below 600px. Both previews switch together between five pages and 1440/1000 or 390/844 screenshot proportions. Mobile preview mode is an image review mode, not a second running application.

Studio and Studio V2 now share the implemented Detail Acara editor in [EVENT-REDESIGN.md](EVENT-REDESIGN.md). Desktop columns are a 192px section index, flexible editor and 272px current-input overview, with 32px gaps. Index and overview are sticky at top 24px. At 900–1199px the overview sits below the index, the editor occupies the second track, gap is 24px and both side areas become static. Below 900px the index becomes a labeled native select; native details/summary precedes the editor and starts closed (the overview starts open only at 1200px and above). Below 600px fields and overview facts use one column. Event panels use 28px padding, then 24px below 1200px and 20px below 600px. V2 uses exactly this Studio layout.

The new [Studio / Studio V2 board](studio-compare.html) reuses board.css and the same equal card/preview geometry. Its surrounding canvas remains Studio-derived; the V2 swatch and Coba action show the new green. The original Studio/Fokus board remains available.

Studio and V2 share the implemented [content editors](CONTENT-REDESIGN.md) and the same sectionNavigation helper/classes as Detail Acara. Pesan & Preview and Foto & Lagu use a 192px local menu plus flexible content, with 32px gap; below 1200px gap is 24px, and below 900px the menu becomes the same labeled native select. At widths of at least 1200px the message content uses `minmax(0,1.12fr) minmax(0,1fr)` editor/preview tracks with a 24px gap and a preview sticky at top 24px. At 900–1199px the preview stacks below the editor while the left menu remains. Below 900px mobile Edit/Pratinjau final shows one pane at a time. Message panels use 24px padding, then 20px below 600px. Final-message body text uses 14/24px. Selecting an editor section never fragments the final preview.

The media workbench keeps nine gallery thumbnails in a three-column grid, with a 360px editor track and 28px gap at desktop widths of at least 1200px. At 900–1199px the editor is 300px and the gap 24px. Below 900px the gallery editor becomes a native modal dialog; thumbnail columns remain three until below 600px, where they become two. Tile spacing is 16px desktop and 12px below 1200px. Couple cards use a 120px preview column and 132px-tall image; below 1200px the column/image width becomes 100px, and below 600px preview height becomes 124px with one card per row. The music card caps at 800px and uses the native audio player after upload. These changes are scoped to Studio/V2; Fokus and the event editor retain their prior layouts.

## Elevation & Depth

Workspaces use flat surfaces, horizontal rules and tonal grouping. Form/media panels keep subtle borders; the Fokus inspector uses a white tonal surface without a shadow. Inherited dialogs and notices use `0 16px 48px #202B3D29`; dialog backdrop remains `#202B3D66`. These inherited blue-tinted overlay materials are implementation carryovers, not a new palette decision. Buttons inherit a 120ms background transition. Reduced-motion media rules remove transitions/animations; no entrance choreography is implemented.

## Shapes

Studio fields and ordinary controls use 10px corners, with 12px form/media panels. The page-heading primary action and the shared event save action use the pill silhouette; ordinary primary buttons remain control-shaped. Fokus controls use 8px corners, panels/inspector 12px. Dialogs use 16px corners. Tags use the inherited 6px corners. The board uses 16px comparison cards and pill-shaped Coba links; those are review-surface components.

## Components

### Buttons and fields

Studio primary controls use citrus with dark text and darker citrus hover/active fills. Fokus primary controls use ink with white text and gray hover/black active fills. Destructive primaries use red with white text in both directions. Ordinary buttons use 9px 12px padding, 14px type, and at least 44px height. Inputs use white, explicit control borders, 11px 12px padding, and 16/24px text. Disabled and error states remain inherited prototype states; the study does not establish new server validation behavior.

Visible focus uses a 3px outline with 3px offset, green for Studio and ink for Fokus. Fokus dark navigation/header and both dark notices/study notes override focus to white; study-note/notice outlines use 2px offset. Keep native field labels and semantic button elements.

### Navigation and table

Studio active navigation uses a 2px underline with 12px offset; Fokus active navigation uses a white rounded tab in the dark bar. Both use aria-current. The Menu dialog provides the same routes on narrow screens. Table rows retain separate name, phone, status, confirmation, attendance count, wishes, browser and action cells plus selection. Sort, pagination and page-level mass selection are inherited behaviors.

### Guest inspector

Fokus guest names are buttons with an explicit detail label and aria-pressed. Inspection and checkbox selection are different states. The detail panel presents existing guest values only, then WhatsApp, copy, edit and access/delete actions. Missing phone or inactive access disables WhatsApp. A filter/page/sort/delete that removes the inspected guest falls back to the first visible guest or an empty detail state. Desktop selection focuses the inspector heading. Narrow layouts open a labeled dialog, focus its heading and return focus to the connected name trigger when closed. WhatsApp and copying show simulation feedback; no messages are sent.

**The Selection Has One Job Rule.** Checkbox selection drives mass actions; inspecting a name drives guest details.

### Detail Acara editor — Studio and Studio V2

The five sections are Pasangan & keluarga, Acara & waktu, Lokasi acara, Hadiah, and Akses undangan. Existing field nodes and inherited gift/save handlers are reused; Fokus retains its original event layout. Desktop section buttons are ordinary buttons with aria-current=step, not tabs or completed-step indicators. They have a minimum height of 72px, 14px/20px labels, 12px/18px descriptions and 14px 12px padding. Active Studio is citrus/dark text; active V2 is green/white with pale-green helper text. Sections can be entered directly or through Sebelumnya/Lanjut; navigation focuses the selected section heading.

The overview reflects current unsaved inputs: couple, date, schedule, venue, countdown in WIB, gift visibility/item count, and browser limit. It does not claim a server save. Studio uses the prefixed event-overview colors; V2 uses its soft surface and primary text with separate muted/border tokens. Switching sections or internal CMS routes retains the in-memory draft; reload resets it. There is no localStorage or server persistence.

One external submit button associated with event-form saves every section. The save bar is initially in normal flow; a changed state adds the sticky treatment, retained after simulated saving. Desktop bottom inset is 16px, compact inset 8px. Desktop bar padding is 16px 20px; compact padding is 12px 16px and the action spans its width. Input focus checks scroll the active field above the bar. The visible state distinguishes unsaved, saving and saved. During the inherited simulated save, form fields, associated submit action and section navigation are disabled and restored afterward; no backend concurrency guarantee is implied.

Validation checks all validatable fields, reveals a hidden invalid field's section, then focuses it and invokes the browser validation message. The existing Google Maps embed-origin/path validation remains. Gift OFF disables item validation while preserving values. This is still one form and one existing simulation handler, not separate persistence per section.

**The One Event Save Rule.** Section navigation preserves the draft; Simpan detail acara applies to all five sections together.

### Pesan & Preview — Studio and Studio V2

Two editor sections, Pesan WhatsApp and Pratinjau tautan, use the same local menu as Detail Acara and media: ordinary buttons with aria-current=step on desktop, and the native select labeled Bagian yang diatur below 900px. Section buttons retain 72px minimum height, 14px 12px padding, 14/20px title and 12/18px helper from the shared component. Only Detail Acara's Akses undangan gets the advanced-setting separator. Selecting a section focuses its editor heading. A separate mobile Edit/Pratinjau final group uses aria-pressed and changes the visible editor/preview pane. Hidden editor sections remain mounted in the same form, preserving draft text and insertion behavior.

The WhatsApp final preview always combines thumbnail, metadata title/description/domain and the complete message body including its link in one bubble. Changing the editor section never hides part of that bubble. Metadata sits first with its installed-image area; the body follows below. The bubble has 12px corners, no outer padding, and overflow clipping; body padding is 20px. The metadata card has no border or corner radius inside the bubble and uses a subtle rgba(0,0,0,.035) overlay. Content remains fictional, and the preview explicitly says actual WhatsApp rendering/cache can differ.

The template retains four token actions, required link, counter and 4000-character limit; link metadata retains title 120 and description 300 limits with fallback values. Thumbnail controls sit beside metadata but outside the text form. One save scope covers template, title and description across both sections. The save bar explicitly says the image uploads separately, starts inline and becomes sticky after a changed state (16px bottom, 8px below 600px). It retains state feedback and scrolls focused inputs above the bar. Inherited save handling disables form controls and associated submit; the content extension disables the local-menu buttons and select during aria-busy. Validation reveals the hidden invalid field's section, switches mobile to Edit, then focuses and reports the browser error. Upload completion does not clear text dirty state.

Studio `--content-accent`, `--content-on-accent`, `--content-soft` resolve respectively to the existing citrus, dark-text and soft tokens; V2 resolves them to its existing primary, white and soft tokens. These are scoped aliases, not a new visual identity. Metadata/image preview shows the installed media only after a successful simulated upload. Choosing a file and uploading it remain separate actions. Thumbnail is public in the described product contract, max 12MiB, with production crop 1200×630; this local study performs no server crop or WhatsApp cache refresh.

**The Complete Message Rule.** Keep thumbnail, link metadata/domain and the entire message body together in one final preview, whichever editor section is active.

**The Text And Media Save Rule.** Saving message text covers template, title and description; thumbnail upload remains a separate action and cannot mark text saved.

### Foto & Lagu — Studio and Studio V2

Only the selected media section is visible: Foto pasangan, Galeri undangan or Lagu undangan. The shared left menu/mobile select changes the work area and focuses its heading without changing the CMS hash route. Hidden section nodes retain files and state.

Two couple-photo cards show a compact thumbnail, title/status and Kelola foto button. The disclosure hides controls in place, retaining the selected file. Its aria-expanded reflects visibility; upload busy state disables disclosure and deletion. No filename, dimensions or other metadata is invented for installed media.

Nine numbered gallery buttons retain visible textual states: empty, selected file, processing, installed or failed upload. Tile images have a 4:3 area; selected tiles use aria-pressed and a 2px primary outline with 2px offset. Keyboard focus uses a 3px focus outline with 4px offset. Tile captions use 14/20px names and 12/18px states. Slot selection changes which existing MediaCard is shown, preserving File objects, errors and retry actions. Installed count derives from installed images, not chosen files; a selected replacement does not replace the old thumbnail until upload succeeds.

At narrow widths, the same MediaCard moves into a labeled native dialog inside the gallery subtree. Close/Escape returns focus to its visible thumbnail trigger; closing is blocked during upload. A viewport change restores the card to the desktop host without recreating its input. Nested delete confirmation remains inherited. Hapus requires confirmation and stays disabled during upload. No reorder, bulk upload, crop editor or extra slots are introduced.

The single music card hides the large image placeholder. An empty note is replaced by a native audio player after successful upload, with no autoplay or invented artwork/artist/duration. Existing MP3/M4A/AAC/WAV/OGG/Opus/FLAC/WebM acceptance and 25MiB maximum remain. Photo capacity is two couple images plus nine gallery images; photo maximum is 12MiB. Music pauses when its section is hidden or the media route is left. A gallery dialog closes when the route changes; focus returns to its connected visible thumbnail or the current page heading. Existing retry keeps file/media state, and all outcomes remain memory-only simulations.

**The Same Media Node Rule.** Switching slots, disclosure or viewport moves or hides the existing MediaCard; it does not recreate file inputs or treat a selected file as installed media.

### Review board

The two cards occupy equal grid tracks and expose the same route in both preview and Coba links. A page selector and Desktop/Mobile buttons update both preview images and links. The Studio recommendation is editorial text, not user approval or a selection control. Inline SVG arrows are decorative and hidden from assistive technology.

## Do's and Don'ts

### Do:
- **Do** keep Studio, Studio V2 and Fokus tokens distinct; V2 inherits Studio geometry, not Fokus topology.
- **Do** preserve table comparison, labeled states and the distinction between invitations and people attending.
- **Do** retain visible keyboard focus, native fields, contained table scrolling and reduced motion.
- **Do** describe save, upload, copy and WhatsApp outcomes as prototype simulations.
- **Do** preserve mounted text/file inputs and distinguish text save, chosen files and installed media.

### Don't:
- **Don't** treat the board recommendation or requested V2 preview as production brand approval.
- **Don't** turn inspector selection into mass checkbox selection.
- **Don't** propagate study-specific layouts or inherited palette residue into the production system.
- **Don't** infer new backend fields, publishing, analytics, automated messaging or measured usability gains from these screens.
