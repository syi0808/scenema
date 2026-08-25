<p align="center">
  <img alt="Scenema film-strip S symbol" src="./apps/site/public/assets/scenema-symbol.png" width="220">
</p>

<h1 align="center">Scenema</h1>

<p align="center">
  <strong>Declarative choreography for real web applications.</strong>
  <br>
  Guide people through your product with real DOM interactions that survive SPA and MPA navigation.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="./docs/architecture.md">Architecture</a> ·
  <a href="#landing--live-demo">Live demo</a>
</p>

> **Early MVP:** Scenema is under active development. The runtime protocol is implemented; the public API may still change.

## Why Scenema?

Most product tours explain an interface from the outside. Scenema acts on the real interface.

- **The user controls the pace.** A step pauses until `proceed()` is called.
- **Scenema controls the choreography.** Actors move, click, and type against real DOM targets.
- **Navigation is scenario state.** Transitions explicitly name their destination Scene.
- **Progress outlives the runtime.** Synchronous checkpoints restore a scenario after reloads and full document navigation.
- **SPA and MPA share one DSL.** Router and document lifetime differences stay inside the web runtime.

## Quick Start

Scenema is currently developed as an npm workspace. Clone the repository and run it locally:

```sh
git clone https://github.com/syi0808/scenema.git
cd scenema
npm install
npm run dev
```

Open `http://localhost:5173` for the landing page or `http://localhost:5173/demo/projects` to run the guided scenario.

## Define a Scenario

```ts
import { createTourPresenter } from "@scenema/presenter";
import { createScenema, defineScenario } from "scenema";

const onboarding = defineScenario({
  id: "onboarding",
  version: 1,
  scenes: [
    {
      id: "projects",
      match: {
        pathname: "/projects",
        visible: "#project-list",
      },
      steps: [
        {
          id: "create-project",
          target: "#create-project",
          enter: { cursor: "move" },
          present: { title: "Create a project" },
          transition: {
            trigger: { click: true },
            to: "project-create",
          },
        },
      ],
    },
    {
      id: "project-create",
      match: {
        pathname: "/projects/new",
        visible: "#project-form",
      },
      steps: [
        {
          id: "project-name",
          target: "#project-name",
          enter: { cursor: "move" },
          present: { title: "Choose a name" },
          commit: { type: { value: "My Project" } },
          exit: { until: { value: "My Project" } },
        },
      ],
    },
  ],
});

const scenema = createScenema({
  scenarios: [onboarding],
  presenter: createTourPresenter(),
});

if (!(await scenema.bootstrap())) {
  await scenema.start("onboarding");
}
```

Every document registers the same scenario and calls `bootstrap()`. If the current tab has an active session, Scenema restores it. Otherwise, `bootstrap()` returns `false` and the application can start a new session explicitly.

Scenema creates an `@actorble/browser` instance by default and runs every interaction through its internal actor adapter. Actorble can be configured with the `actorble` option. Advanced integrations can still replace the internal boundary with a custom `Actor` through the `actor` option.

The built-in choreography uses perceptible pacing by default: pointer movement follows an `ease-in-out` curve for `800ms`, clicks approach over `1000ms` and hold for `240ms`, and typing waits `100ms` between characters. The Actorble cursor is rendered at `2x` its standard size for visibility. Override individual action values through `actorble.actionDefaults`, provide a custom `actorble.visualLayer` for different cursor rendering, or set `actorble.motion` to `false` when pointer motion should be disabled.

The tour presenter highlights the current target with a dimmed overlay. Because the runtime dismisses the presenter before Actorble moves and presents the next step only after the cursor arrives, the overlay fades away while the cursor is in motion and returns smoothly around the target when it stops:

```ts
createTourPresenter({
  overlay: {
    duration: 320,
    opacity: 0.72,
    padding: 8,
    borderRadius: 10,
  },
});
```

Set `overlay: false` to keep the card without dimming or highlighting.

While a step has a `commit` or `transition`, the tour presenter makes the application inert until
the user proceeds. This prevents pointer, keyboard, and focus interactions from racing ahead of the
runtime. Informational steps without an automated action remain interactive.

## How It Works

```text
ENTER → PRESENT → user proceeds → CHECKPOINT → PERFORM → RECONCILE
                                                    │
                          ┌─────────────────────────┴─────────────────────────┐
                          │                                                   │
                     SPA runtime lives                               MPA runtime restarts
                          │                                                   │
                          └──────────────────── same session ─────────────────┘
```

Before an action that may navigate, Scenema synchronously writes a prepared transition checkpoint. The current runtime can then disappear without losing the logical scenario state.

```text
sessionStorage                         localStorage
active session id ───────────────────→ __scenema__:v1:session:<id>
                                      scene · step · phase · transition
```

The runtime never relies on `beforeunload` for critical persistence. SPA route changes, MPA bootstrap, reload, browser history, and BFCache restoration all converge on `reconcile()`. Cursor recovery stores the last semantic target rather than viewport coordinates, so a reload resolves the cursor against the current layout and restores it without replaying the enter animation.

## Packages

| Package                | Responsibility                                                |
| ---------------------- | ------------------------------------------------------------- |
| `@scenema/core`        | Scenario DSL, validation, session codec, guided state machine |
| `@scenema/runtime-web` | DOM matching, conditions, storage, navigation observation     |
| `@scenema/presenter`   | Accessible Shadow DOM tour presenter                          |
| `scenema`              | Actorble-backed runtime, registry, bootstrap, and public API  |

## Landing & Live Demo

The app in `apps/site` serves two purposes:

- `/` explains the runtime and its SPA/MPA model.
- `/demo/projects` runs a complete project-creation scenario with cursor movement, typing, clicks, route transitions, progress feedback, and recovery.

The UI supports keyboard navigation, responsive layouts, light and dark themes, and reduced motion.

## Development

```sh
npm run typecheck   # TypeScript project references
npm test            # Core, web runtime, persistence, and demo flow
npm run build       # Build all library packages
npm run build:site  # Build packages and the landing/demo site
```

## Current Scope

Supported:

- Guided execution with `proceed()`, `previous()`, and `stop()`
- CSS selector targets and real DOM interactions
- Same-origin SPA and MPA navigation
- URL and visible-element Scene matching
- Reload, history, redirect, and BFCache reconciliation
- Per-tab active sessions backed by synchronous `localStorage` checkpoints

Not yet included:

- Cross-origin navigation and cross-origin iframes
- Multi-tab coordination and session handoff
- Auto and interactive execution modes
- Visual scenario editor and AI-generated scenarios
- Published npm packages and framework-specific router adapters

## Design Principle

> **Persist → Perform → Reconcile**

Scenema treats browser navigation as part of the scenario—not an implementation detail.
