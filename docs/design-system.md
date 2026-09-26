# FitnessApp Design System

FitnessApp uses a calm, precise product language ("Precision"): cool graphite neutrals, one signal-orange accent, and monospaced numbers. The interface should feel like a well-made training instrument, not a game or a marketing page. Hierarchy comes from type weight, spacing, and restrained surfaces; the data (weights, reps, records, trends) is the visual interest.

## Design principles

- **Mobile-first and thumb-friendly:** Design and verify the narrowest layout first, with 375px as the primary quality bar.
- **Data first:** Weights, reps, records, and trends are the focus. Show recent sets, current performance, and progress wherever real data supports it.
- **Fast to scan:** Numbers use the monospaced face with tabular digits so columns align and values compare at a glance.
- **Quiet surfaces, one accent:** Neutral cards on a neutral canvas. Orange marks the primary action, active navigation, records, positive change, chart series, and the highlighted muscle. Nothing else.
- **Both themes are first-class:** Every screen must work in light and dark with the same hierarchy.
- **Accessible interaction:** Visible labels, large touch targets, focus rings, sufficient contrast, and reduced-motion support.

## Design skills

Three agent skills live in `.claude/skills/` and are the reference for UI work, alongside this document:

- `ui-ux-pro-max`: searchable UX, typography, color, and stack guidance. Run its search from the repository root, for example `python .claude/skills/ui-ux-pro-max/scripts/search.py "form validation error" --domain ux`.
- `redesign-existing-projects`: audit checklist for improving existing screens without breaking them.
- `design-taste-frontend`: anti-generic design rules. It targets landing pages and portfolios, so apply its typography, color, motion, and state rules here and skip its landing-page layout rules.

When a skill conflicts with this document, this document wins. Skill search results are recommendations, not requirements.

## Themes

Light and dark palettes are semantic CSS variables in `apps/web/src/index.css`. Light is the base (`:root`); dark overrides it under `:root[data-theme='dark']`.

- The preference (`system`, `light`, `dark`) is stored in `localStorage` under `fitness-theme`. `system` follows `prefers-color-scheme`, including live changes.
- An inline script in `apps/web/index.html` applies the theme before first paint to avoid a flash. `apps/web/src/lib/theme.ts` holds the same rules for the profile page's theme selector; keep both in sync, including the `theme-color` meta values.
- Components never branch on the theme. They consume tokens only.

## Color tokens

| Token                | Light     | Dark       | Usage                                                   |
| -------------------- | --------- | ---------- | ------------------------------------------------------- |
| `background`         | `#f3f4f6` | `#0e0f11`  | App canvas                                              |
| `surface-soft`       | `#eceef1` | `#121316`  | Desktop navigation rail                                 |
| `surface`            | `#ffffff` | `#16181b`  | Cards, inputs, navigation bars                          |
| `surface-elevated`   | `#f5f6f8` | `#1d2024`  | Hover state of surfaces                                 |
| `surface-strong`     | `#e8eaee` | `#25282d`  | Segmented-control tracks, set chips, icon tiles, badges |
| `border`             | ink 9%    | white 7.5% | Default separation                                      |
| `border-strong`      | ink 16%   | white 14%  | Inputs, secondary buttons, hover borders                |
| `text-primary`       | `#0f1115` | `#edeef0`  | Headings, values, important copy                        |
| `text-secondary`     | `#5d636d` | `#8b909a`  | Supporting copy, labels, units                          |
| `primary`            | `#cf4510` | `#ff6a2b`  | The single accent (fill and text)                       |
| `primary-foreground` | `#ffffff` | `#1a0a03`  | Content on the accent                                   |
| `success`            | `#15803d` | `#3fb950`  | Save confirmation                                       |
| `warning`            | `#b45309` | `#e3a008`  | Caution                                                 |
| `destructive`        | `#dc2626` | `#f25555`  | Destructive actions and validation errors               |

The light accent is darker than the dark accent so that orange text on white and white text on orange both pass WCAG AA. Do not add colors without updating this table and the token layer.

### Surfaces and depth

- Cards: `surface`, `border`, `radius-lg`. No gradients, glows, grain, or grid patterns.
- Shadows are small and tinted with `--shadow-tint` (a 1-2px lift on buttons and selected segments; a soft 12-28px shadow on hover for interactive cards). Never use large generic drop shadows.
- Nested information inside a card uses dividers or `surface-strong` chips, not another bordered card.

## Typography

Two self-hosted variable families from `@fontsource-variable`, imported in `main.tsx`:

- **Geist** (`font-sans`) for all text, including headings.
- **Geist Mono** (`font-mono`) for numbers: weights, reps, dates in metadata, counts. `.metric-number` applies the mono face with tabular digits and tight tracking.

| Role            | Guidance                                                          |
| --------------- | ----------------------------------------------------------------- |
| Page title      | 30-36px, semibold (600), -0.025em tracking, sentence case         |
| Section heading | 16-18px, semibold                                                 |
| Card title      | 15-16px, semibold                                                 |
| Body            | 14-15px, regular, 1.5 line height, max about 60 characters        |
| Label / meta    | 12-13px, regular, `text-secondary`                                |
| Metric          | 20-36px `.metric-number`, semibold; the unit is smaller and muted |

Use sentence case everywhere, including buttons ("Giriş yap", "Set ekle"). Avoid uppercase labels and eyebrow text above headings. Do not use em or en dashes in interface text; write ranges as `0 ile 9999` or with a hyphen.

## Spacing and radius

Use the 4px rhythm: 4, 8, 12, 16, 24, 32, and 48px. Mobile page gutters are 16px; larger screens use 32-48px. Content is constrained to `max-w-5xl`.

- `radius-sm` (8px): badges, chips, icon tiles, segmented-control items.
- `radius-md` (10px): buttons, inputs, list rows inside cards.
- `radius-lg` (14px): cards and grouped regions.

## Page composition

- Every page starts with `PageHeader`: a title, a one-sentence description, and an optional action on the right.
- One visual anchor near the top: the latest-progress card with a sparkline on the home page, the stat pair on an exercise page, the progress chart on reports.
- Section headings are plain text with an optional mono count on the right. No icons or accent rules in headings.
- One column on mobile; grids only where comparison benefits.

## Component guidance

### Muscle-group cards

- Two columns at 375px, four on desktop.
- A low-opacity anatomical figure (front or back view, cropped to the region) with only the relevant region filled with the accent. Artwork lives in `apps/web/src/assets/muscles` (CC BY-SA 3.0, see `ATTRIBUTION.md`) and regions in `apps/web/src/data/muscle-regions.ts`.
- Group name (semibold), mono exercise count, and a small arrow affordance.

### Exercise rows

- Name, optional `Özel` badge, muscle group and equipment, and the last-logged date in mono on the right.
- Without history say `Henüz kayıt yok`; never invent a value.

### Workout entry

- Set number, weight, and reps fit at 375px without horizontal scrolling.
- Inputs use the mono face with persistent `kg` and `tekrar` suffixes.
- `Set ekle` is secondary and dashed; `Antrenmanı kaydet` is the full-width primary action.
- Validation appears directly under the affected set.

### Reports and charts

- The progression chart uses the accent line (2px) with a faint area fill, hollow points, dashed horizontal gridlines, and mono tick labels in `text-secondary`.
- Summary metrics sit in a 2x2 (mobile) or 4-column (desktop) grid; only the personal record uses the accent.
- The exercise select and the range segmented control share one row on wide screens.

### Buttons and inputs

- Minimum interactive height 44-48px; major actions 56px.
- Primary: solid accent. Secondary: `surface` with `border-strong`. Ghost: text only. Destructive: solid `destructive`.
- Inputs: `surface`, `border-strong`, accent border and ring on focus, `destructive` border when invalid.
- Segmented controls: `surface-strong` track with a raised `surface` pill that slides between options.

## Motion

Motion uses the `motion` library (`motion/react`, rendered through `m` components inside `MotionProvider`) plus two CSS utilities. Every animation must communicate entry order, a state change, or feedback.

- **Screen entry:** `AppShell` fades each route in with a 10px rise over 0.35s.
- **Cascades:** `.animate-rise` with `style={{ '--i': index }}` on list and grid items; the delay caps after 12 items.
- **Shared indicators:** navigation, segmented controls, and the theme selector move their active marker with `layoutId` springs.
- **Set rows:** rows enter from above and exit to the left; remaining rows reflow with `layout`.
- **Feedback:** the save confirmation springs in with a check mark and a short vibration where supported.
- **Loading:** `.skeleton` shapes that match the final layout.
- Animate only `transform` and `opacity`. No infinite decorative loops.
- `MotionConfig reducedMotion="user"` and the CSS reduced-motion block remove movement for users who ask for it.

## Navigation

- Mobile: sticky top bar (brand and account initials linking to the profile) and a fixed bottom bar with Ana sayfa, Antrenmanlar, Raporlar, and Profil. The active item is accent-colored with a sliding top indicator.
- Desktop: a 240px left rail with the brand, the same destinations (active item on a raised surface pill), and the signed-in account at the bottom.
- Preserve safe-area padding and page bottom padding so fixed navigation never covers content.

## Responsive and accessibility checks

At 375px: two-column muscle cards stay legible, set rows fit without horizontal scrolling, metric cards keep readable values, chart labels do not collide, and fixed navigation never covers the final action.

At all sizes: targets are at least 44px, focus is visible, selection is not communicated by color alone, nothing depends on hover, both themes keep WCAG AA contrast, and `prefers-reduced-motion` removes nonessential movement.

## Consistency rules

- Reuse semantic tokens and shared components (`PageHeader`, `SectionHeading`, `FeedbackPanel`, `Button`, `Input`, `Sparkline`, `UserBadge`) before adding variants.
- Do not add visual information unsupported by real product data.
- Preserve mobile behavior whenever enhancing tablet or desktop layouts.
