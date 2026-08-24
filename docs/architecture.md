# Runtime Protocol

Scenema runtime과 scenario session은 별개의 lifetime을 가진다. 모든 navigation은 다음 protocol을
공유한다.

```text
checkpoint() -> perform() -> reconcile()
```

Transition trigger 직전 session은 `phase: "transition"`, `status: "prepared"` 상태로
`localStorage`에 동기 저장된다. SPA에서는 기존 runtime이 URL/DOM을 다시 검사한다. MPA에서는 다음
document의 runtime이 `sessionStorage` pointer로 같은 session을 찾아 재개한다.

## Persistence Invariants

1. Trigger action보다 prepared checkpoint가 항상 먼저 저장된다.
2. `sessionStorage`에는 현재 탭의 session ID만 저장된다.
3. `localStorage` key는 `__scenema__:v1:session:<id>` 형식이다.
4. Persisted timer 대신 transition의 `startedAt + timeout`을 사용한다.
5. `beforeunload`, `unload`, `pagehide`에는 의존하지 않는다.

## Resume Rules

- `present`: enter action을 재실행하지 않고 presenter만 복원한다.
- `commit`: action을 중복 실행하지 않고 exit condition부터 검증한다.
- `transition`: destination scene이 맞으면 `arrived`를 저장하고 첫 step으로 진입한다.
- intermediate redirect: destination이 아니면 pending checkpoint를 유지한다.
- invalid version/session/scene: session을 중지하고 명시적 error를 반환한다.
