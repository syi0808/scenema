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
- `Header`: contains product identity, documentation, and source links.
- `Hero`: uses one Actorble cursor to connect the capability copy to the demo action, then hands that cursor to the running scenario.
- `Examples`: launches the page tour, a single highlight, and a DOM action against existing page elements.
- `LandingDemo`: opens the four-step page tour with consecutive Actorble clicks and coordinates two focused examples without rendering UI.
- `CodeShowcase`: presents product tour, DOM action, and navigation recipes in one tabbed panel.
- `GettingStarted`: shows the repository setup that is available during the early MVP.
- `TourCard`: uses the same palette, type, radii, and button hierarchy as the site.

## Page Sequence

1. Name the product and start the landing-page demo.
2. Offer focused examples against useful page elements.
3. Explain the public API through one code panel.
4. Link to the current repository setup and documentation.

Do not add a protocol diagram, giant final banner, decorative browser chrome, theme toggle, card grid, or repeated CTA without a new decision to support.
