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
- `Header`: contains product identity, Examples and Code landmarks, the source link, and the global demo action.
- `Hero`: states the product benefit and starts a tour that acts on the landing page itself.
- `Examples`: exposes highlight, click, type, and navigation actions as independent controls and guided-tour targets.
- `LandingDemo`: coordinates the five-step sequence without rendering a separate simulated product.
- `CodeShowcase`: keeps the selected example, pathname, and scenario definition aligned.
- `TourCard`: uses the same palette, type, radii, and button hierarchy as the site.

## Page Sequence

1. State the benefit and start the landing-page demo.
2. Let visitors run the same examples independently.
3. Connect each visible action to its scenario definition.
4. Offer installation and source documentation.

Do not add a protocol diagram, giant final banner, decorative browser chrome, theme toggle, card grid, or repeated CTA without a new decision to support.
