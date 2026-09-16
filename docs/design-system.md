# FitnessApp Design System

This document defines the initial visual and interaction rules for FitnessApp. It is intentionally small and should grow only when a real product need appears.

## Design principles

- **Mobile-first:** Start with the narrowest supported screen and progressively enhance the layout.
- **Clean:** Reduce visual noise and keep every element purposeful.
- **Athletic:** Use strong typography, decisive hierarchy, and restrained energy.
- **Fast to scan:** Make labels, values, and actions easy to distinguish at a glance.
- **Thumb-friendly:** Keep primary controls within easy reach and use generous touch targets.
- **Data should be visually clear:** Prioritize legible metrics and comparisons over decoration.
- **Important actions should stand out:** Reserve the primary accent for high-value actions and states.

## Colors

Colors are exposed as semantic CSS variables in `apps/web/src/index.css`. Components must consume the semantic name instead of a raw color value.

| Token                | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `background`         | App canvas and page background                    |
| `surface`            | Primary cards and grouped regions                 |
| `surface-elevated`   | Nested or emphasized content areas                |
| `border`             | Subtle separation between surfaces                |
| `text-primary`       | Main headings, values, and body copy              |
| `text-secondary`     | Supporting labels and low-emphasis copy           |
| `primary`            | Main action, active state, or selective highlight |
| `primary-foreground` | Content placed on the primary color               |
| `success`            | Positive and completed states                     |
| `warning`            | Caution and attention states                      |
| `destructive`        | Destructive actions and critical errors           |

The primary color is an accent, not a general background. Most of the interface should remain neutral and dark.

## Typography

The initial type stack uses a system sans-serif for speed and dependable rendering.

| Role              | Guidance                                                           |
| ----------------- | ------------------------------------------------------------------ |
| Page title        | 40–92px responsive, 800–900 weight, tight line height and tracking |
| Section heading   | 20–28px, 700–800 weight, tight tracking                            |
| Body              | 16–18px, 400–500 weight, comfortable 1.5–1.75 line height          |
| Secondary text    | 12–14px, 500–600 weight, muted color                               |
| Metric/value text | 24–48px, 700–900 weight, tabular numerals where comparison matters |

Use sentence case for copy. Uppercase may be used sparingly for short eyebrow labels with increased letter spacing.

## Spacing

Use the shared spacing rhythm rather than isolated values:

| Step | Value |
| ---- | ----- |
| 1    | 4px   |
| 2    | 8px   |
| 3    | 12px  |
| 4    | 16px  |
| 6    | 24px  |
| 8    | 32px  |
| 12   | 48px  |

Larger responsive gaps may use multiples of this scale. Prefer padding and gap utilities over one-off margins.

## Radius

- **Small (`8px`):** Compact indicators and small controls.
- **Medium (`12px`):** Buttons, inputs, and nested surfaces.
- **Large (`16px`):** Cards and major grouped regions.

Do not add a new radius unless these options cannot express a product requirement.

## Buttons

- **Primary:** Solid primary fill for the main action on a screen or section.
- **Secondary:** Neutral elevated surface with a border for alternative actions.
- **Ghost:** No default fill; use for low-emphasis or toolbar actions.
- **Destructive:** Destructive color for irreversible or dangerous actions.

Buttons use a minimum height of 48px. Labels should be short, direct, and action-oriented. A page should rarely need more than one primary action in the same visual region.

## Cards

- Use 16px padding on mobile and 20–24px when space permits.
- Use the `surface` background with a subtle `border`.
- Use `surface-elevated` for nested content, not arbitrary lighter shades.
- Do not use large shadows. Separation should come from surface color, border, and spacing.
- On pointer-based desktop layouts, interactive cards may receive a small border or background change on hover. Static cards should not animate.

## Forms

- Inputs should be at least 48px high, use the elevated surface, and retain a visible border.
- Labels sit above fields and remain visible after a value is entered.
- Errors appear close to the related field using the destructive token and plain language.
- Focus uses a clearly visible primary-colored ring, never color alone if another cue is practical.
- Placeholder text is supporting content and must not replace a label.

## Responsive behavior

### Mobile

- Mobile is the primary target and the starting point for every screen.
- Prefer single-column layouts and full-width primary actions where useful.
- Keep horizontal page padding at 16–20px.
- A bottom navigation pattern may be introduced later when real navigation exists.

### Tablet

- Add breathing room with 24–32px page padding.
- Use multi-column cards only when the content remains easily scannable.
- Preserve touch-friendly targets and spacing.

### Desktop

- Center content in a constrained container rather than stretching it edge to edge.
- Use multiple columns when they improve comparison or task completion.
- Future desktop navigation may differ from mobile navigation, while retaining the same information architecture.

## UI consistency rules

- Never introduce arbitrary colors without updating the design system.
- Never create a new button style if an existing one works.
- Avoid duplicate components.
- Prefer reusable components.
- All screens must support mobile.
- Do not use desktop-first layouts.
- Keep touch targets large enough for mobile.
- Prefer semantic design tokens over hardcoded colors.
