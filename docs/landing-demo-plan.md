# Scenema 랜딩·데모 재설계 계획

## 1. 재설계 이유

현재 페이지는 “랜딩 자체가 데모”라는 형식은 갖췄지만, 데모를 위해 만든 인터페이스를 다시 데모하는 구조다.

- 히어로의 `Live sequence`는 실제 제품 정보가 아니라 투어 순서를 미리 설명하는 장식이다.
- `Ready…`, `Demo complete…` 상태 문구는 사용자의 다음 판단에 필요하지 않다.
- 기능 스트립은 실제 근거 없이 짧은 표현을 반복한다.
- Examples의 카운터, 임시 입력 필드, 가상 경로는 랜딩 방문자가 데모 외 목적으로 사용할 이유가 없다.
- Examples와 Code가 동일한 네 개 탭을 반복해 페이지의 구조와 상태를 불필요하게 늘린다.
- 마지막 CTA는 히어로와 설치 영역의 행동을 다시 반복한다.

Driver.js 랜딩의 장점은 데모 UI가 정교해서가 아니라, **원래 존재하는 랜딩 콘텐츠를 투어가 그대로 소개한다는 점**이다. Examples도 별도 가상 제품 화면이 아니라 짧은 실행 버튼으로 제공하고, 실제 사용 코드는 별도의 핵심 콘텐츠로 둔다.

이번 개편은 Driver.js의 콘텐츠 우선 구조와 자기소개형 데모만 채택한다. 컬러, 캐릭터, 신뢰 수치, 사용 사례, 라이선스 프로모션 섹션은 복제하지 않는다.

## 2. 설계 원칙

1. 데모를 중지해도 모든 화면 요소에 독립적인 목적이 있어야 한다.
2. 데모는 기능 체크리스트를 모두 소진하지 않고 Scenema의 동작 방식을 짧게 증명한다.
3. 실제 페이지에 자연스러운 대상이 없는 기능은 억지로 입력 필드나 가상 경로를 만들지 않는다.
4. 설명은 제목 한 줄과 필요한 보조 문장까지만 사용한다.
5. 동일한 CTA, 탭, 상태를 두 위치에 반복하지 않는다.
6. 아직 배포되지 않은 패키지나 존재하지 않는 문서를 사용할 수 있는 것처럼 표현하지 않는다.
7. 이번 범위에서는 기존 컬러 팔레트와 디자인 토큰을 변경하지 않는다.

## 3. 새 페이지 구조

### 3.1 Header

- Scenema 심볼과 이름
- `Documentation`, `GitHub` 링크
- 히어로에 이미 있는 데모 버튼은 헤더에서 반복하지 않는다.
- sticky 여부는 유지하되 랜딩 콘텐츠를 가리는 강한 배경 효과는 추가하지 않는다.

### 3.2 Hero

히어로는 제품 이름과 제품 범주만 설명한다.

- H1: `Scenema`
- 핵심 문장: `Guide people through real product flows.`
- 보조 문장: 사용자 진행, 실제 DOM 동작, 페이지 전환을 하나의 선언적 시나리오로 연결한다는 사실만 설명
- 기본 CTA: `Show demo`
- 보조 CTA: `Get started`
- 우측에는 기존 Scenema 심볼을 브랜드 이미지로 사용

제거 대상:

- `Programmable product guidance` eyebrow
- `Live sequence` 5단계 미리보기
- 상시 노출되는 데모 상태 문구
- 완료 후 `Run the demo again`으로 바뀌는 상태성 레이블

### 3.3 Examples

Driver.js처럼 독립 실행 가능한 예제를 짧은 버튼 묶음으로 제공한다. 별도의 탭 패널이나 가상 제품 UI는 만들지 않는다.

| 예제               | 실제 대상                                | 동작                                    |
| ------------------ | ---------------------------------------- | --------------------------------------- |
| `Page tour`        | 랜딩의 Hero, Examples, Code, Get started | 메인 자기소개형 투어 실행               |
| `Single highlight` | 실제 시작 명령 블록                      | 한 개 요소를 포커스하고 설명            |
| `DOM action`       | Code 영역의 실제 탭                      | 사용자가 진행하면 해당 탭을 실제로 클릭 |

Type과 route continuation은 API 코드에서 설명한다. 랜딩에 자연스러운 입력 또는 목적지가 생기기 전까지 실행 예제로 만들지 않는다.

Examples에는 다음 정보만 둔다.

- H2 `Examples`
- “이 페이지의 실제 요소를 대상으로 실행된다”는 한 문장
- 세 개의 실행 버튼
- 상세 기능 설명 카드, 카운터, 초기화 버튼, 경로 표시를 두지 않는다.

### 3.4 Code

코드가 Scenema의 핵심 설명 수단이 되도록 Examples보다 더 큰 비중으로 배치한다.

- H2 `Your first scenario`
- `Product tour`, `DOM action`, `Navigation` 세 개의 코드 탭
- 하나의 코드 패널
- 현재 탭과 코드 패널만 상태로 관리
- 각 코드는 실제 공개 API와 README의 예제에 맞춘다.
- Examples의 `DOM action`은 이 영역의 실제 탭을 클릭해 화면 변화를 만든다.

Type은 별도 탭으로 늘리지 않고 `DOM action` 코드 안에서 `click`과 `type`을 함께 보여준다. Navigation은 Scenema의 차별점이므로 독립 탭을 유지한다.

### 3.5 Get started

아직 npm 패키지가 공개되지 않았으므로 `pnpm add scenema`를 설치 가능한 명령처럼 노출하지 않는다.

- H2 `Get started`
- 현재 MVP를 실행하는 최소 저장소 명령
- `Read the README`, `View on GitHub` 링크
- 별도의 대형 최종 CTA 섹션을 만들지 않는다.

예시:

```sh
git clone https://github.com/syi0808/scenema.git
cd scenema && pnpm install
```

### 3.6 Footer

- 프로젝트 이름
- `Documentation`, `GitHub`
- 필요한 라이선스 표기만 유지
- 새로운 슬로건이나 CTA를 추가하지 않는다.

## 4. 메인 데모 시나리오

메인 데모는 현재 랜딩을 소개하는 네 단계로 제한한다.

### Step 1. 제품 정의

- 대상: Hero의 제목과 핵심 설명
- 행동: 없음
- 목적: Scenema가 무엇인지 설명

### Step 2. 실행 가능한 예제

- 대상: Examples 실행 버튼 그룹
- 행동: 없음
- 목적: 별도 샌드박스가 아니라 현재 페이지 요소를 사용한다는 점을 보여줌

### Step 3. 실제 DOM 동작

- 대상: Code의 `Navigation` 탭
- 행동: 사용자가 진행하면 실제 탭 클릭
- 결과: 코드 패널이 Navigation 시나리오로 변경
- 목적: Scenema가 설명만 띄우는 것이 아니라 현재 DOM을 조작한다는 점을 증명

### Step 4. 시작점

- 대상: Get started 명령과 문서 링크
- 행동: 없음
- 목적: 데모가 끝난 뒤 사용자가 실제로 확인할 다음 위치를 제공

완료 후에는 별도 성공 문구, 완료 배너, 결과 요약을 표시하지 않는다. 오버레이를 닫고 `Show demo`로 포커스만 복귀한다.

## 5. 독립 예제 동작

### Page tour

- Hero의 `Show demo`와 같은 네 단계 시나리오를 시작한다.
- 실행 중 다시 시작하면 기존 세션을 정리하고 첫 단계부터 시작한다.

### Single highlight

- Get started 명령 블록을 한 번 강조한다.
- 한 개 팝오버와 종료 버튼만 제공한다.

### DOM action

- Code의 `DOM action` 탭을 타깃으로 한다.
- 사용자가 진행하면 Actor가 실제 탭을 클릭한다.
- 클릭 후 변경된 코드를 보여주고 종료한다.

오류, 복원, 잘못된 타깃, 타임아웃은 랜딩의 예제 목록에 포함하지 않는다.

## 6. 상태와 경로

페이지 상태를 다음 두 가지로 줄인다.

- 선택된 코드 예제
- 실행 중인 데모 인스턴스

제거 대상:

- Click 카운터
- Type 입력값
- 선택된 플레이그라운드 예제
- 데모 완료 여부
- `/examples/highlight`, `/examples/click`, `/examples/type`, `/examples/navigation` 경로 동기화
- 완료·준비·복원 상태를 위한 시각적 상태 문구

접근성 알림이 필요한 런타임 오류는 시각적으로 숨긴 `aria-live` 영역에만 전달하고, 정상 진행 상태는 출력하지 않는다.

## 7. 컴포넌트 변경

### 유지 및 단순화

- `Header.svelte`: 데모 CTA와 Examples/Code 앵커 제거
- `Hero.svelte`: 제목, 두 문장, CTA, 심볼만 렌더링
- `LandingDemo.svelte`: 메인 투어와 독립 예제의 실행만 담당하고 DOM을 출력하지 않음
- `CodeShowcase.svelte`: 세 개 코드 탭과 단일 코드 패널로 축소
- `examples.ts`: 플레이그라운드 정의 대신 코드 예제와 실행 예제 메타데이터만 관리

### 교체 또는 제거

- `Examples.svelte`: 탭 패널을 세 개의 실행 버튼 그룹으로 교체
- feature strip 제거
- sequence preview 제거
- visible demo status 제거
- final callout 제거
- 예제용 카운터, 입력, 가상 경로 UI와 관련 CSS 제거

### 새로 추가

- `GettingStarted.svelte`: 현재 실제로 가능한 실행 명령과 문서 링크
- `Footer.svelte`: 최소 프로젝트 링크와 라이선스

## 8. 반응형과 접근성

- 모바일에서도 Hero CTA와 Examples 버튼은 공간이 허용되는 만큼 자연스럽게 줄바꿈한다.
- 코드 탭은 가로 스크롤을 허용하고 페이지 전체 가로 스크롤은 막는다.
- 각 투어 단계 전 대상이 보이도록 스크롤하되, 대상 위치 계산은 완료된 스크롤 뒤에 수행한다.
- `prefers-reduced-motion`에서는 smooth scroll과 Actor motion을 제거한다.
- 코드 탭은 `tablist`, `tab`, `tabpanel` 관계와 방향키 탐색을 유지한다.
- 완료 후 Hero의 `Show demo` 버튼으로 포커스를 복귀한다.

## 9. 테스트 기준

1. 데모를 실행하지 않아도 Hero → Examples → Code → Get started 순서로 제품을 이해할 수 있다.
2. 메인 데모가 랜딩의 실제 네 영역만 대상으로 실행된다.
3. DOM action 단계에서 실제 코드 탭이 클릭되고 패널 내용이 바뀐다.
4. Single highlight가 실제 시작 명령을 대상으로 동작한다.
5. 페이지에 카운터, 임시 입력, 가상 경로, sequence preview, 상태 스트립이 남지 않는다.
6. 완료 후 별도 성공 문구 없이 오버레이가 제거되고 시작 버튼으로 포커스가 돌아온다.
7. 390px와 1440px에서 팝오버가 타깃과 주요 CTA를 가리지 않는다.
8. 키보드 탐색, reduced motion, 타입 검사, 린트, 테스트, 프로덕션 빌드를 통과한다.

## 10. 구현 순서

### Phase 1. 콘텐츠 구조 축소

- Header와 Hero 단순화
- feature strip, sequence preview, final callout 제거
- 실제 공개 상태에 맞는 Get started와 Footer 추가

### Phase 2. Examples와 Code 재구성

- 가상 플레이그라운드를 실행 버튼 그룹으로 교체
- 코드 예제를 세 개로 정리
- 중복 탭과 예제 경로 상태 제거

### Phase 3. 데모 시나리오 교체

- 네 단계 자기소개형 투어 연결
- Single highlight와 DOM action 독립 예제 연결
- visible status와 완료 상태 제거

### Phase 4. 검증과 정리

- 기존 경로·플레이그라운드 테스트 제거
- 새 랜딩과 데모 통합 테스트 작성
- 반응형, 접근성, 빌드 검증
- README의 Landing & Live Demo 설명 갱신
