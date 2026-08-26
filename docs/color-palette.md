# Scenema Color Palette

Scenema uses a cool slate foundation around its existing key blue, `#2450e6`. The neutral surfaces are crisp rather than creamy, so the product reads as a focused developer tool while the logo and primary actions remain recognizably Scenema.

The palette follows the `build-color-palette` skill: define complete neutral, primary, and semantic ramps first, then map a small set of semantic tokens onto them. Every text pairing used by the site meets WCAG AA.

## Neutral Scale

| Shade | Value     | Typical use                   |
| ----- | --------- | ----------------------------- |
| `0`   | `#ffffff` | Raised and working surfaces   |
| `50`  | `#f8fafc` | Page canvas                   |
| `100` | `#f1f5f9` | Quiet sections and controls   |
| `200` | `#e2e8f0` | Dividers and default borders  |
| `300` | `#cbd5e1` | Disabled structure            |
| `400` | `#94a3b8` | Emphasized borders            |
| `500` | `#64748b` | Placeholder and tertiary copy |
| `600` | `#475569` | Supporting copy and metadata  |
| `700` | `#334155` | Strong secondary copy         |
| `800` | `#1e293b` | Dark panel structure          |
| `900` | `#0f172a` | Primary copy and overlay      |
| `950` | `#020617` | Code panel background         |

## Key Blue Scale

The `600` shade is the existing key color from the product and symbol. Lighter and darker shades provide intentional state colors instead of opacity-based variants.

| Shade | Value     | Typical use                     |
| ----- | --------- | ------------------------------- |
| `50`  | `#eef3ff` | Selected-region background      |
| `100` | `#dce6ff` | Subtle active background        |
| `200` | `#bfd0ff` | Text selection                  |
| `300` | `#95b1ff` | Syntax on dark surfaces         |
| `400` | `#6688ff` | Decorative or chart highlight   |
| `500` | `#3f61f7` | High-emphasis highlight         |
| `600` | `#2450e6` | Primary action and focus        |
| `700` | `#1d3fc2` | Primary hover and pressed state |
| `800` | `#1f389d` | Emphasis text                   |
| `900` | `#1e347c` | Dark blue structure             |
| `950` | `#151f4b` | Deep blue surface               |

## Semantic Scales

| Role    | 50        | 100       | 200       | 300       | 400       | 500       | 600       | 700       | 800       | 900       | 950       |
| ------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- |
| Success | `#f0fdf4` | `#dcfce7` | `#bbf7d0` | `#86efac` | `#4ade80` | `#22c55e` | `#16a34a` | `#15803d` | `#166534` | `#14532d` | `#052e16` |
| Warning | `#fffbeb` | `#fef3c7` | `#fde68a` | `#fcd34d` | `#fbbf24` | `#f59e0b` | `#d97706` | `#b45309` | `#92400e` | `#78350f` | `#451a03` |
| Danger  | `#fef2f2` | `#fee2e2` | `#fecaca` | `#fca5a5` | `#f87171` | `#ef4444` | `#dc2626` | `#b91c1c` | `#991b1b` | `#7f1d1d` | `#450a0a` |

Use shade `700` for status text on light surfaces. Use the pale shades only when a state needs a tinted surface.

## Semantic Tokens

| Token            | Value     | Use                                     |
| ---------------- | --------- | --------------------------------------- |
| `canvas`         | `#f8fafc` | Page background                         |
| `surface`        | `#f1f5f9` | Demo chrome and quiet sections          |
| `surface-strong` | `#ffffff` | Working product area                    |
| `ink`            | `#0f172a` | Primary copy and strong structure       |
| `muted`          | `#475569` | Supporting copy and metadata            |
| `line`           | `#e2e8f0` | Dividers and control borders            |
| `line-strong`    | `#94a3b8` | Product frame and emphasized borders    |
| `action`         | `#2450e6` | Primary action, focus, active demo step |
| `action-hover`   | `#1d3fc2` | Primary action hover                    |
| `action-text`    | `#ffffff` | Text on action surfaces                 |
| `success`        | `#15803d` | Confirmed completion and ready status   |
| `warning`        | `#b45309` | Caution requiring attention             |
| `danger`         | `#b91c1c` | Errors and recovery guidance            |

## Verified Contrast

| Pair                      |   Ratio |
| ------------------------- | ------: |
| `ink` on `canvas`         | 17.06:1 |
| `muted` on `canvas`       |  7.24:1 |
| `muted` on `surface`      |  6.92:1 |
| `action-text` on `action` |  6.24:1 |
| `action-text` on hover    |  8.26:1 |
| Status text on `canvas`   | 4.79:1+ |

## Usage Rules

- Keep blue to one primary focal point per component or viewport.
- Use status colors only when a state has actually changed.
- Use cool neutral borders for structure instead of shadows or alternating gray cards.
- Keep the default site light until a complete dark palette is designed and tested.
- Confine code syntax colors to the dark code panel.
- Never use opacity to invent a missing palette shade.
