# Scenema

Scenema는 실제 웹 애플리케이션 위에서 선언적 시나리오를 실행하는 guided choreography runtime이다.

> The user controls the pace. Scenema controls the choreography.

현재 구현은 core state machine, DOM scene matching, synchronous `localStorage` checkpoint, 탭별
`sessionStorage` pointer, SPA navigation observation, MPA bootstrap/recovery, Actorble adapter, 기본 tour
presenter를 포함한다.

## Packages

| Package | Responsibility |
| --- | --- |
| `@scenema/core` | DSL types, validation, session codec, guided state machine |
| `@scenema/runtime-web` | DOM matching, conditions, storage, navigation observer |
| `@scenema/actorble` | Actorble-compatible actor adapter |
| `@scenema/presenter` | Shadow DOM 기반 기본 tour presenter |
| `scenema` | Registry, bootstrap, lifecycle을 묶는 public API |

## Usage

```ts
import { createActorbleActor } from "@scenema/actorble";
import { createTourPresenter } from "@scenema/presenter";
import { createScenema, defineScenario } from "scenema";

const onboarding = defineScenario({
  id: "onboarding",
  version: 1,
  scenes: [
    {
      id: "projects",
      match: { pathname: "/projects", visible: "#project-list" },
      steps: [{
        id: "create-project",
        target: "#create-project",
        enter: { cursor: "move" },
        present: { title: "Create a project" },
        transition: { trigger: { click: true }, to: "project-create" },
      }],
    },
    {
      id: "project-create",
      match: { pathname: "/projects/new", visible: "#project-form" },
      steps: [{
        id: "project-name",
        target: "#project-name",
        enter: { cursor: "move" },
        present: { title: "Choose a name" },
        commit: { type: { value: "My Project" } },
        exit: { until: { value: "My Project" } },
      }],
    },
  ],
});

const scenema = createScenema({
  scenarios: [onboarding],
  actor: createActorbleActor(actorble),
  presenter: createTourPresenter(),
  logger: console.debug,
});

if (!(await scenema.bootstrap())) {
  await scenema.start("onboarding");
}
```

각 document는 scenario를 등록한 뒤 `bootstrap()`을 호출해야 한다. 활성 session이 없으면 `false`를
반환한다. SPA에서는 `pushState`, `replaceState`, `popstate`, `hashchange`를 관찰하고, MPA에서는 새
document가 동일한 session checkpoint를 복원한다. Transition trigger는 반드시 `prepared` checkpoint를
동기 저장한 다음 실행된다.

## Commands

```sh
npm install
npm run typecheck
npm test
npm run build
```

## Landing & Demo

`apps/site`에는 반응형 landing과 실제 Scenema scenario를 실행하는 project creation demo가 있다.

```sh
npm run dev
npm run build:site
```

개발 서버에서 `/`는 landing, `/demo/projects`는 guided demo를 제공한다.

## Current Boundaries

- Target은 MVP에서 CSS selector 문자열이다.
- Navigation은 same-origin만 지원한다.
- Session에는 choreography 위치만 저장하며 form value나 token은 저장하지 않는다.
- `@scenema/actorble`은 `moveTo(Element)`, `click(Element)`, `type(Element, value)` 계약을 받는다.
- Multi-tab coordination, cross-origin, iframe, auto mode, visual editor는 아직 포함하지 않는다.
