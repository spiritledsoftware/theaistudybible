---
name: The AI Study Bible
description: A quiet, Scripture-first study environment with grounded AI assistance.
colors:
  midnight-ink: "#030526"
  reading-white: "#ffffff"
  reading-ink: "#03030d"
  clear-surface: "#fcfcfc"
  quiet-muted: "#dbdee1"
  quiet-muted-foreground: "#53626e"
  hairline-border: "#eeeef1"
  soft-accent: "#e5e7eb"
  insight-cyan: "#71f2f7"
  annotation-magenta: "#ea46dc"
  destructive: "#ff2828"
  night-surface: "#000000"
  night-panel: "#030303"
  night-foreground: "#fcfcfd"
  night-muted: "#1e2124"
  night-muted-foreground: "#919fac"
  night-border: "#17171c"
  night-primary: "#181927"
  night-primary-foreground: "#eaebff"
typography:
  display:
    fontFamily: "Goldman, system-ui"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Goldman, system-ui"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Goldman, system-ui"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
rounded:
  sm: "calc(var(--radius) - 4px)"
  md: "calc(var(--radius) - 2px)"
  lg: "var(--radius)"
  xl: "calc(var(--radius) + 4px)"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.midnight-ink}"
    textColor: "{colors.reading-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.reading-white}"
    textColor: "{colors.reading-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.reading-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.clear-surface}"
    textColor: "{colors.reading-ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: The AI Study Bible

## 1. Overview

**Creative North Star: "The Illuminated Margin"**

The interface behaves like a quiet margin beside Scripture: present when a reader reaches for context, otherwise visually recessive. It is quiet, focused, and unhurried, with familiar controls and measured density that protect long-form reading.

The system is refined and restrained rather than ornamental. Midnight Ink anchors actions and structure; Insight Cyan and Annotation Magenta are scarce semantic signals, never ambient decoration. The product must not feel like a flashy AI demo: glows, gradients, constant motion, and AI theatrics are prohibited when they compete with Scripture.

**Key Characteristics:**
- Scripture owns the largest, calmest surface.
- Study tools appear progressively and remain close to the passage they explain.
- Controls use familiar shapes, compact radii, and explicit focus states.
- Light and dark themes preserve hierarchy rather than changing personality.
- Motion communicates state within 150–250 ms; it never stages the page.

## 2. Colors

A near-monochrome reading field carries the product; saturated colors are rare signals with named responsibilities.

### Primary
- **Midnight Ink** (`{colors.midnight-ink}`): primary actions, selected navigation, focus structure, and the core brand anchor.
- **Reading White** (`{colors.reading-white}`): primary text on Midnight Ink and the light reading canvas.

### Secondary
- **Insight Cyan** (`{colors.insight-cyan}`): a scarce indicator for AI-assisted context or an active insight state.

### Tertiary
- **Annotation Magenta** (`{colors.annotation-magenta}`): annotation and emphasis states when a second semantic signal is necessary.

### Neutral
- **Reading Ink** (`{colors.reading-ink}`): default light-theme text.
- **Clear Surface** (`{colors.clear-surface}`): panels and cards separated from the reading canvas.
- **Quiet Muted / Foreground** (`{colors.quiet-muted}` / `{colors.quiet-muted-foreground}`): secondary surfaces and supporting text.
- **Hairline Border** (`{colors.hairline-border}`): low-contrast dividers and control outlines.
- **Night Surface / Panel** (`{colors.night-surface}` / `{colors.night-panel}`): dark-theme canvas and raised tonal layer.
- **Night Foreground / Muted Foreground** (`{colors.night-foreground}` / `{colors.night-muted-foreground}`): dark-theme primary and supporting text.
- **Destructive** (`{colors.destructive}`): destructive and error states only.

### Named Rules

**The Scarce Signal Rule.** Insight Cyan and Annotation Magenta together occupy no more than 10% of a product screen; they identify state or meaning, never atmosphere.

**The Reading Field Rule.** Scripture sits on the quietest available neutral. Never place long-form passage text over a gradient, glow, image, or translucent surface.

## 3. Typography

**Display Font:** Goldman (with system-ui fallback)

**Body Font:** Inter Variable (with Inter and sans-serif fallbacks)

**Character:** Goldman supplies a compact brand signature for major headings only. Inter carries reading controls, prose, labels, and data so the interface disappears into the task.

### Hierarchy
- **Display** (700, 3rem, 1.1): rare route-level titles and public-facing display moments; never routine product labels.
- **Headline** (600, 1.875rem, 1.2): major product section headings.
- **Title** (600, 1.5rem, 1.25): panel and content-group titles.
- **Body** (400, 1rem, 1.75): explanatory prose, with long-form lines held between 65–75 characters. Scripture reading size remains user-adjustable.
- **Label** (500, 0.875rem, 1.25): buttons, fields, navigation, metadata, and compact controls.

### Named Rules

**The One Reading Voice Rule.** Inter carries every task-oriented surface. Goldman is forbidden in buttons, form labels, navigation labels, tables, and dense study controls.

**The Adjustable Text Rule.** User-selected Scripture size changes content typography without scaling surrounding controls or destabilizing layout.

## 4. Elevation

The system is flat by default. Tonal surface changes and hairline borders establish structure at rest; shadows are reserved for overlays, menus, dialogs, and a temporary active lift. Existing `shadow-xs` and `shadow-sm` utilities are implementation debt on static controls and cards, not a pattern to copy into new work.

### Shadow Vocabulary
- **Control Lift** (`var(--shadow-xs)`): temporary hover or pressed-state feedback only.
- **Panel Lift** (`var(--shadow-sm)`): floating menus, popovers, and compact transient panels.

### Named Rules

**The Flat-at-Rest Rule.** Static cards, fields, and buttons do not combine a border with a persistent shadow. Choose tonal separation or a border; elevation appears only when behavior requires it.

## 5. Components

Components are refined and restrained: familiar silhouettes, compact radii, strong keyboard focus, and no decorative effects.

### Buttons
- **Shape:** gently compact corners (`{rounded.md}`), 36px default height, 8px × 16px internal padding.
- **Primary:** Midnight Ink with Reading White; reserve it for the dominant action in a local region.
- **Hover / Focus:** small tonal shift, a three-pixel focus ring, and 150–250 ms state transitions. No scale-up, glow, gradient, or bouncing response.
- **Secondary / Ghost:** outline uses the reading surface and Hairline Border; ghost stays transparent until hover. Destructive is reserved for destructive confirmation.

### Cards / Containers
- **Corner Style:** softly bounded (`{rounded.xl}`), never pill-shaped.
- **Background:** Clear Surface in light mode and Night Panel in dark mode.
- **Shadow Strategy:** flat at rest; transient lift follows the Elevation section.
- **Border:** Hairline Border when the container needs an explicit edge.
- **Internal Padding:** 24px default, reduced only for dense study controls.

### Inputs / Fields
- **Style:** transparent field, one-pixel input border, compact corners (`{rounded.md}`), and 36px default height.
- **Focus:** border shifts to the ring color with a three-pixel translucent ring.
- **Error / Disabled:** destructive border and ring for invalid state; disabled fields retain legibility while clearly removing interaction.

### Navigation
- **Style:** Inter labels on a restrained surface with clear active state. Desktop navigation stays horizontal; mobile navigation collapses behind a conventional menu control. Sticky headers may recede on downward scroll and return immediately on upward scroll.

### Scripture Reader
- Scripture content remains selectable only when interaction requires it, supports adjustable sizes from 0.75rem through 2.25rem, and keeps annotations, notes, references, sharing, and AI context in an adjacent activity panel rather than inside the reading text.

## 6. Do's and Don'ts

### Do:
- **Do** keep Scripture on Reading White or Night Surface with WCAG 2.2 AA contrast.
- **Do** use Midnight Ink for the dominant local action and reserve saturated accents for semantic state.
- **Do** keep task controls in Inter at 0.875rem–1rem with visible keyboard focus.
- **Do** expose deeper study tools progressively beside the passage that gives them context.
- **Do** preserve scalable Scripture type, comfortable line length, spacing, and theme controls.

### Don't:
- **Don't** make the product feel like a flashy AI demo; glows, gradients, constant motion, and AI theatrics that compete with Scripture are prohibited.
- **Don't** use gradient text, animated gradient buttons, pulsing decoration, bouncing controls, or orchestrated page-load sequences.
- **Don't** combine a one-pixel border with a persistent wide shadow on the same static element.
- **Don't** use Goldman for navigation, form labels, buttons, data, or repeated product headings.
- **Don't** rely on Insight Cyan or Annotation Magenta as decoration or as the only carrier of meaning.
- **Don't** hide common reading and navigation actions behind unfamiliar custom affordances.
