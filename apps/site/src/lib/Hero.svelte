<script lang="ts">
  import { createScenemaActorble } from "scenema";
  import { onMount } from "svelte";

  import Button from "./Button.svelte";

  let {
    assetPath,
    onStart,
  }: { assetPath: string; onStart: (event?: MouseEvent) => void } = $props();

  let cursor: ReturnType<typeof createScenemaActorble> | undefined;
  let ambientActive = false;
  let animation: Promise<void> = Promise.resolve();
  let symbolTarget: HTMLElement | null = null;
  let removeScrollListener = () => {};
  let activeTerm = $state<"actions" | "navigation" | null>(null);
  let actorReady = $state(false);

  onMount(() => {
    if (window.matchMedia("(max-width: 700px), (prefers-reduced-motion: reduce)").matches)
      return destroyActorbleCursor;
    const actionsTerm = document.querySelector<HTMLElement>('[data-hero-term="actions"]');
    const navigationTerm = document.querySelector<HTMLElement>('[data-hero-term="navigation"]');
    const startButton = document.querySelector<HTMLElement>("#start-tour");
    symbolTarget = document.querySelector<HTMLElement>(".hero__symbol");
    if (!actionsTerm || !navigationTerm || !startButton || !symbolTarget)
      return destroyActorbleCursor;

    cursor = createCursor(true);
    ambientActive = true;
    const stopOnScroll = () => {
      if (window.scrollY > 48) destroyActorbleCursor();
    };
    window.addEventListener("scroll", stopOnScroll, { passive: true });
    removeScrollListener = () => window.removeEventListener("scroll", stopOnScroll);
    animation = animateCursor(actionsTerm, navigationTerm, startButton);

    return destroyActorbleCursor;
  });

  export function acquireActorble(): ReturnType<typeof createScenemaActorble> {
    cursor ??= createCursor(false);
    return cursor;
  }

  export function handoffAmbientCursor(): void {
    ambientActive = false;
    removeScrollListener();
    removeScrollListener = () => {};
    activeTerm = null;
    actorReady = false;
  }

  export function destroyActorbleCursor(): void {
    handoffAmbientCursor();
    cursor?.destroy();
    cursor = undefined;
  }

  async function animateCursor(
    actionsTerm: Element,
    navigationTerm: Element,
    startButton: Element,
  ): Promise<void> {
    await pause(700);
    try {
      if (!(await pointTo(actionsTerm, "actions", 1_100))) return;
      if (!(await pointTo(navigationTerm, "navigation", 900))) return;
      if (!ambientActive || !cursor) return;
      activeTerm = null;
      await cursor.moveTo(startButton, { duration: 900 });
      if (!ambientActive) return;
      actorReady = true;
    } catch {
      if (ambientActive) destroyActorbleCursor();
    }
  }

  async function pointTo(
    target: Element,
    term: "actions" | "navigation",
    duration: number,
  ): Promise<boolean> {
    if (!ambientActive || !cursor) return false;
    await cursor.moveTo(target, { duration });
    if (!ambientActive) return false;
    activeTerm = term;
    await pause(650);
    return ambientActive;
  }

  function yieldCursor(): void {
    if (!ambientActive || !cursor || !symbolTarget) return;
    handoffAmbientCursor();
    const currentCursor = cursor;
    void animation.finally(() => currentCursor.moveTo(symbolTarget!, { duration: 520 })).catch(() => {});
  }

  function createCursor(ambient: boolean): ReturnType<typeof createScenemaActorble> {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return createScenemaActorble(document, {
      feedback: "cursor",
      motion: !reduceMotion,
      ...(ambient
        ? {
            pointer: {
              initialPosition: {
                x: window.innerWidth * 0.76,
                y: Math.min(window.innerHeight * 0.56, 520),
              },
            },
          }
        : {}),
      ...(reduceMotion ? { actionDefaults: { typeInto: { delay: 0 } } } : {}),
    });
  }

  function pause(duration: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, duration));
  }
</script>

<section class="hero" id="hero-demo" aria-labelledby="hero-title">
  <div class="container hero__grid">
    <div class="hero__copy" id="hero-copy">
      <h1 id="hero-title">Scenema</h1>
      <p class="hero__lead">Guide people through real product flows.</p>
      <p class="hero__description">
        Connect user-paced guidance, <span
          class="hero__term"
          data-hero-term="actions"
          data-actor-focused={activeTerm === "actions"}>real DOM actions</span
        >, and <span
          class="hero__term"
          data-hero-term="navigation"
          data-actor-focused={activeTerm === "navigation"}>page navigation</span
        > in one declarative scenario.
      </p>
      <div
        class="hero__actions"
        role="group"
        aria-label="Scenema actions"
        data-actor-ready={actorReady}
        onpointerenter={yieldCursor}
        onfocusin={yieldCursor}
      >
        <Button id="start-tour" label="Show demo" href="#examples" onclick={onStart} />
        <Button label="Get started" href="#get-started" variant="secondary" />
      </div>
    </div>

    <img class="hero__symbol" src={assetPath} alt="" width="420" height="420" />
  </div>
</section>
