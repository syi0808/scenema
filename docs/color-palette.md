# Scenema Color Palette

Scenema's symbol already establishes the brand: a vivid blue action moving through a near-black frame. The site extends those two colors into a restrained interface system. Blue communicates action and progress; ink provides structure; cool neutrals keep product content readable.

## Brand Colors

| Token         | Value     | Use                                                      |
| ------------- | --------- | -------------------------------------------------------- |
| `brand`       | `#1e4fff` | Primary actions, decisive emphasis, final call to action |
| `brand-hover` | `#153eea` | Hover state for brand-filled controls                    |
| `ink`         | `#090c13` | Dark canvas, code, and protocol surfaces                 |
| `paper`       | `#f6f7fb` | Light canvas                                             |

Blue is not decoration. It appears only when an element is actionable, focused, or central to the product's identity.

## Light Theme

| Token        | Value     | Use                              |
| ------------ | --------- | -------------------------------- |
| `background` | `#f6f7fb` | Page background                  |
| `surface`    | `#ffffff` | Demo workspace and form surfaces |
| `text`       | `#111522` | Primary content                  |
| `muted`      | `#5f6677` | Supporting content               |
| `line`       | `#d5d9e2` | Structural dividers              |
| `accent`     | `#1e4fff` | Focus and semantic emphasis      |

## Dark Theme

| Token        | Value     | Use                              |
| ------------ | --------- | -------------------------------- |
| `background` | `#090c13` | Page background                  |
| `surface`    | `#121722` | Demo workspace and form surfaces |
| `text`       | `#f5f7ff` | Primary content                  |
| `muted`      | `#a8b0c0` | Supporting content               |
| `line`       | `#2d3442` | Structural dividers              |
| `accent`     | `#7692ff` | Focus and semantic emphasis      |

## Status Colors

| State   | Light     | Dark      | Rule                                   |
| ------- | --------- | --------- | -------------------------------------- |
| Success | `#13744a` | `#61d79b` | Completion and confirmed outcomes only |
| Error   | `#b42318` | `#ff8178` | Errors and recovery guidance only      |

## Contrast

- Primary text exceeds `17:1` against its theme background.
- Muted text exceeds `5.3:1` in light mode and `8.9:1` in dark mode.
- Brand blue with white text exceeds `5.8:1`.
- Dark accent blue against the dark canvas exceeds `6.8:1`.
- Status colors exceed `5.4:1` in light mode and `8:1` in dark mode.

## Usage Rules

- Keep the brand blue at one visual focal point per viewport whenever possible.
- Never use status colors as decoration or as alternate brand colors.
- Use borders for structure, not to create artificial depth.
- Do not introduce additional hues without a new semantic requirement.
- Code syntax colors are confined to code surfaces and are not part of the interface palette.
