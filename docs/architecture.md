# Operation Runtime Protocol

Scenema의 public execution hierarchy는 application topology와 분리된 flat sequence다.

```text
Scenario → Step → Operation
```

`Step.ready`만 선택적으로 application state를 관찰한다. Page, route, modal 같은 grouping은
runtime reconciliation state가 아니라 metadata로 취급한다.

## Definition Boundary

`step(id, options?, build)`의 builder callback은 definition 생성 시 한 번 동기 실행된다.
Builder method는 action을 수행하지 않고 ordered `Operation[]`를 기록한다. Raw
`StepDefinition`도 같은 canonical operation model을 사용한다.

이 제약으로 runtime execution은 다음 성질을 유지한다.

1. deterministic ordering
2. static inspection과 visualization
3. semantic position 기반 resume
4. effect replay 제어
5. plugin operation composition

## Session

```ts
interface ScenarioSession {
  schemaVersion: 1;
  id: string;
  scenarioId: string;
  scenarioVersion: number;
  position: {
    stepId: string;
    operationIndex: number;
  };
  completedOperations: string[];
  pendingOperation?: PendingOperation;
  revision: number;
  updatedAt: number;
}
```

Operation address는 `<stepId>/<operationIndex>`다. Scenario version이 바뀌면 session은
호환되지 않는 것으로 처리한다. Session에는 Node, resolver function, condition predicate 같은 runtime
definition value를 저장하지 않는다.

## Execution Loop

```text
Step ready
   ↓
Operation 0 ─→ checkpoint if required ─→ execute ─→ complete
   ↓
Operation 1
   ↓
user presentation ─→ pause ─→ proceed/back
   ↓
next Step
```

User-advanced presentation은 현재 position을 유지하고 presenter control을 기다린다.
`advance: "auto"` presentation은 표시 후 자동 완료된다. Presenter progress는 모든 Step의 user
presentation만 flatten하여 계산한다.

`back()`은 이전 user presentation position을 표시한다. 완료된 operation address는 제거하지 않는다.
따라서 다시 proceed하면 이미 수행한 effect를 skip하고 다음 미완료 checkpoint까지 이동한다.

## Durability

| Category       | 기본 동작                                                  |
| -------------- | ---------------------------------------------------------- |
| `replay-safe`  | 완료 checkpoint 전 crash 시 operation을 다시 실행한다      |
| `at-most-once` | perform 전에 prepared를 저장하고 resume 시 skip한다        |
| `reconcile`    | prepared 상태와 외부 state를 이용해 다음 position을 찾는다 |

Built-in 기본값:

- `cursor.move`, `wait`: replay-safe
- `present`: reconstructable checkpoint
- `type`: idempotent execution을 기대하는 replay-safe effect
- `click`, `press`: at-most-once
- `navigate`: reconcile

Custom operation은 plugin handler의 `durability`로 category를 선언한다.

## Navigation Boundary

```text
persist prepared navigate
        ↓
perform click/press
        ↓
  ┌─────┴─────┐
 SPA          MPA
 observer     runtime destroyed
  │            │
  │         bootstrap
  └─────┬──────┘
        ↓
complete navigation address
        ↓
next Step ready
        ↓
clear pending operation and continue
```

Critical persistence는 `beforeunload`, `unload`, `pagehide`에 의존하지 않는다. SPA History
observation과 MPA bootstrap은 동일한 internal reconciliation path를 호출한다. Navigation timeout은
persisted `startedAt + timeout`을 기준으로 계산한다.

## Web Runtime

`@scenema/runtime-web`은 다음 environment-specific port를 구현한다.

- selector, Node, async resolver target resolution
- `exists`, `visible`, `value`, `pathname`, `all`, `any`, predicate evaluation
- `localStorage` session store와 per-tab `sessionStorage` active pointer
- History API, `popstate`, `hashchange`, `pageshow` observation

`exists`는 Node presence만 확인한다. `visible`은 element style과 geometry를 함께 확인한다.

## Actor Boundary

Core runtime은 `Actor` port만 사용한다. Public facade는 기본적으로 `@actorble/browser` adapter를 lazy
생성한다. Scenario 완료, stop, dispose 시 visual cursor와 actor instance를 정리한다. Application은
필요한 경우 custom `Actor`를 주입할 수 있다.

## Persistence Invariants

1. At-most-once와 navigation perform보다 prepared checkpoint가 먼저 저장된다.
2. `sessionStorage`에는 현재 tab의 session ID만 저장된다.
3. Session key는 `__scenema__:v1:session:<id>`다.
4. Position은 Step ID와 operation index로 구성된다.
5. Completed effect는 back navigation으로 제거되거나 replay되지 않는다.
6. Runtime-only target과 predicate는 session에 serialize하지 않는다.
7. Scenario ID/version mismatch는 resume error다.
