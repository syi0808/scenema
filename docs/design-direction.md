# Scenema Design Direction

## Identity

Scenema is a **director for product interfaces**. It does not place a tutorial on top of a product; it coordinates real interface states, actions, and navigation into a sequence the user can control.

The visual identity borrows the working language of cinema—scene, cue, frame, cut—but not its nostalgia. The result should feel like a precise production console: editorial, deliberate, and visibly in motion only when the product state changes.

## Mood

- **Editorial, not cinematic decoration.** Large type establishes the premise. Rules, indexes, and aligned columns explain sequence and state.
- **Operational, not theatrical.** Blue marks the current action or primary path. Everything else stays neutral.
- **Human-paced.** The interface clearly separates what the user decides from what Scenema performs.
- **Confidently sparse.** Empty space creates reading order; it is never filled with ornamental graphics.

## Visual System

- **Palette:** near-black, warm paper, cool gray, and one electric blue. Red and green appear only for error and success.
- **Type:** a compact system sans for statements, readable sans for body copy, and monospace only for runtime state and code.
- **Shape:** square edges and thin rules. A small radius is reserved for controls and form fields where it improves affordance.
- **Imagery:** product UI and scenario code are the proof. Stock photography, abstract blobs, and decorative film motifs do not belong.
- **Motion:** only clarifies a changed scene, active step, or performed action. Reduced-motion users receive the same state information without movement.

## Interaction Hierarchy

1. The primary action is always **Run the live scenario**.
2. Secondary navigation explains the model without competing with the demo.
3. Every button names its result. Icon-only controls are avoided.
4. Loading, ready, resumed, success, and failure states are written into an `aria-live` status surface.
5. Theme choice is explicit, keyboard-operable, and persisted.

## Content Rules

- Use **Scene**, **Step**, **Action**, and **Checkpoint** consistently.
- Explain the difference once: the user advances; Scenema performs.
- Prefer evidence over claims: show the protocol, real code, and a working demo.
- Remove metadata that does not change a decision.
- Do not add a label, badge, card, or animation unless it communicates hierarchy, state, or action.
