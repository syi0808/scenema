# Scenema Design Direction

## Identity

Scenema is a **director for product interfaces**. It does not place a tutorial on top of a product; it coordinates real interface states, actions, and navigation into a sequence the user can control.

The visual identity uses the product's own language—Scene, Step, action, and navigation—without adding cinematic decoration. The result should feel precise, deliberate, and visibly in motion only when the product state changes.

## Mood

- **Direct, not cinematic decoration.** Clear type establishes the premise. Alignment and dividers explain sequence and state.
- **Operational, not theatrical.** Blue marks the current action or primary path. Everything else stays neutral.
- **Human-paced.** The interface clearly separates what the user decides from what Scenema performs.
- **Confidently sparse.** Empty space creates reading order; it is never filled with ornamental graphics.

## Visual System

- **Palette:** use the semantic tokens and contrast rules in [`color-palette.md`](./color-palette.md). Brand blue marks action and progress; red and green appear only for error and success.
- **Type:** a compact system sans for statements, readable sans for body copy, and monospace only for code. Interface copy is never set in all caps.
- **Shape:** square edges and thin rules. A small radius is reserved for controls and form fields where it improves affordance.
- **Brand asset:** `apps/site/public/assets/scenema-symbol.png` is the only symbol. Do not redraw, reinterpret, or substitute it.
- **Imagery:** product UI and scenario code are the proof. Stock photography, abstract blobs, and decorative film motifs do not belong.
- **Motion:** only clarifies a changed scene, active step, or performed action. Reduced-motion users receive the same state information without movement.

## Interaction Hierarchy

1. The primary action is always **Run the live scenario**.
2. Secondary navigation explains the model without competing with the demo.
3. Every button names its result. Icon-only controls are avoided.
4. Loading, ready, resumed, success, and failure states are written into an `aria-live` status surface.
5. Theme choice uses a familiar sun or moon icon, remains keyboard-operable, and is persisted.

## Content Rules

- Use **Scene**, **Step**, **Action**, and **Checkpoint** consistently.
- Explain the difference once: the user advances; Scenema performs.
- Prefer evidence over claims: show the protocol, real code, and a working demo.
- Remove metadata that does not change a decision.
- Do not add an eyebrow, index, badge, card, or animation unless it communicates hierarchy, state, or action.
