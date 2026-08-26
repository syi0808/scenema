# Scenema Design System

## Product Idea

Scenema is a **quiet instrument for rehearsing product flows**. The interface should prove the product by letting visitors run a real scenario, not by surrounding it with cinematic language or abstract diagrams.

## Mood

- **Operational and calm.** Cool slate surfaces, clear rules, and compact labels create the order of a working tool.
- **Evidence first.** The live product, current pathname, and scenario code carry more weight than marketing claims.
- **Human-paced.** The guide clearly separates the moment a person chooses to continue from the action Scenema performs.
- **Sparse, not oversized.** Space establishes reading order. Display type never becomes the product itself.

## Foundations

### Color

Use the semantic tokens in [`color-palette.md`](./color-palette.md). The default site has one canonical light appearance. Blue is reserved for the primary action, focus, and the active demo step.

### Type

The site uses one dependable system sans stack: `Helvetica Neue`, Helvetica, Arial, sans-serif. Monospace is limited to code, paths, step numbers, and compact metadata.

| Role            | Desktop |  Mobile |  Weight | Line height |
| --------------- | ------: | ------: | ------: | ----------: |
| Display         | 52–72px | 48–68px |     680 |        0.98 |
| Section heading | 38–58px | 38–52px |     660 |        1.06 |
| Body lead       | 18–21px |    18px |     400 |        1.55 |
| Body            |    17px |    16px |     400 |        1.65 |
| UI              | 12–14px | 12–14px | 600–650 |         1.4 |

Do not switch typefaces, styles, or colors for a single word inside a heading.

### Spacing and Shape

- Spacing follows a 4px scale: `4, 8, 12, 16, 24, 32, 48, 64, 96`.
- The content container is 1200px with a 64px desktop and 32px mobile gutter.
- Controls use a 6px radius; product and code frames use 10px.
- Shadows belong only to the tour card. Borders define every other surface.

## Components

- `Button`: primary, secondary, and quiet variants share height, radius, type, and focus treatment.
- `Header`: contains only product identity, two in-page landmarks, source link, and demo action.
- `DemoStage`: combines route evidence, the working product surface, progress rail, and live status.
- `TourCard`: uses the same palette, type, radii, and button hierarchy as the site and may be scoped to a container.
- `EvidenceList`: replaces abstract framework language with three observable outcomes from the demo.
- `CodePanel`: connects the visible route and target to the scenario definition.

## Page Sequence

1. State the benefit in plain language.
2. Run the 30-second scenario inside the landing page.
3. Explain what the visitor just observed.
4. Show the scenario definition behind that interaction.
5. Offer installation and source documentation.

Do not add a protocol diagram, giant final banner, decorative browser chrome, theme toggle, card grid, or repeated CTA without a new decision to support.
