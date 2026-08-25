import type { Presenter, PresenterContext, StepPresentation } from "@scenema/core";

export type OverlayAnimation = "fade" | "iris";

export interface TourOverlayOptions {
  animation?: OverlayAnimation;
  color?: string;
  opacity?: number;
  padding?: number;
  borderRadius?: number;
  duration?: number;
}

export interface TourPresenterOptions {
  document?: Document;
  nextLabel?: string;
  backLabel?: string;
  overlay?: boolean | TourOverlayOptions;
}

interface ResolvedOverlayOptions {
  animation: OverlayAnimation;
  color: string;
  opacity: number;
  padding: number;
  borderRadius: number;
  duration: number;
}

const DEFAULT_OVERLAY: ResolvedOverlayOptions = {
  animation: "fade",
  color: "#020617",
  opacity: 0.72,
  padding: 8,
  borderRadius: 10,
  duration: 320,
};

export function createTourPresenter(options: TourPresenterOptions = {}): Presenter {
  const document = options.document ?? window.document;
  const overlay = resolveOverlayOptions(options.overlay);
  let host: HTMLElement | null = null;
  let removePositionListeners = () => {};

  const dismiss = () => {
    removePositionListeners();
    removePositionListeners = () => {};
    const exitingHost = host;
    host = null;
    if (!exitingHost) return;

    exitingHost.dataset.scenemaPresenter = "tour-exiting";
    exitingHost.setAttribute("aria-hidden", "true");
    exitingHost.shadowRoot
      ?.querySelector<HTMLElement>(".scene")
      ?.setAttribute("data-phase", "exit");
    const remove = () => exitingHost.remove();
    const view = document.defaultView;
    if (!view || !overlay || overlay.duration === 0) remove();
    else view.setTimeout(remove, overlay.duration);
  };

  return {
    present(presentation: StepPresentation, context: PresenterContext) {
      dismiss();
      host = document.createElement("div");
      host.dataset.scenemaPresenter = "tour";
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>
          :host { all: initial; position: fixed; z-index: 2147483647; inset: 0; pointer-events: none; }
          .scene { position: fixed; inset: 0; font: 14px/1.45 ui-sans-serif, system-ui, sans-serif; }
          .shade { position: fixed; z-index: 0; background: var(--overlay-color); opacity: var(--overlay-opacity); }
          .shade--full { inset: 0; opacity: 0; transition: opacity var(--overlay-duration) ease; }
          .scene[data-phase="active"] .shade--full { opacity: var(--overlay-opacity); }
          .scene[data-animation="fade"] .shade { opacity: 0; transition: opacity var(--overlay-duration) ease; }
          .scene[data-animation="fade"][data-phase="active"] .shade { opacity: var(--overlay-opacity); }
          .scene[data-animation="iris"] .shade:not(.shade--full) { transition: transform var(--overlay-duration) cubic-bezier(.22, 1, .36, 1); }
          .scene[data-animation="iris"] .shade--top { transform: translateY(-100%); }
          .scene[data-animation="iris"] .shade--bottom { transform: translateY(100%); }
          .scene[data-animation="iris"] .shade--left { transform: translateX(-100%); }
          .scene[data-animation="iris"] .shade--right { transform: translateX(100%); }
          .scene[data-animation="iris"][data-phase="active"] .shade { transform: translate(0); }
          .focus-ring { position: fixed; z-index: 1; box-sizing: border-box; border: 2px solid #fff;
            border-radius: var(--highlight-radius); box-shadow: 0 0 0 1px #0f172a66, 0 0 24px #fff3;
            opacity: 0; transform: scale(.96); transition: opacity var(--overlay-duration) ease,
            transform var(--overlay-duration) cubic-bezier(.22, 1, .36, 1); }
          .scene[data-phase="active"] .focus-ring { opacity: 1; transform: scale(1); }
          .scene[data-animation="fade"][data-phase="exit"] .shade,
          .scene[data-phase="exit"] .shade--full, .scene[data-phase="exit"] .focus-ring,
          .scene[data-phase="exit"] .card { opacity: 0; }
          .card { position: fixed; z-index: 2; width: min(320px, calc(100vw - 32px)); padding: 18px;
            box-sizing: border-box; color: #f8fafc; background: #111827; border: 1px solid #374151;
            border-radius: 14px; box-shadow: 0 18px 48px #0005; pointer-events: auto; opacity: 0;
            transition: opacity var(--overlay-duration) ease; }
          .scene[data-phase="active"] .card { opacity: 1; }
          h2 { margin: 0 0 6px; font-size: 16px; } p { margin: 0 0 14px; color: #cbd5e1; }
          footer { display: flex; align-items: center; gap: 8px; } .progress { margin-right: auto; color: #94a3b8; font-size: 12px; }
          button { border: 0; border-radius: 8px; padding: 8px 12px; font: inherit; cursor: pointer; }
          .back { color: #e2e8f0; background: #334155; } .next { color: #111827; background: #f8fafc; font-weight: 650; }
          @media (prefers-reduced-motion: reduce) { .shade, .focus-ring, .card { transition-duration: 1ms !important; } }
        </style>
        <div class="scene" data-phase="enter" data-animation="${overlay?.animation ?? "fade"}">
          <div class="overlay" aria-hidden="true"></div>
          <section class="card" role="dialog" aria-live="polite" aria-labelledby="scenema-title">
            <h2 id="scenema-title"></h2><p></p><footer><span class="progress"></span>
            <button class="back" type="button"></button><button class="next" type="button"></button></footer>
          </section>
        </div>`;

      const scene = root.querySelector<HTMLElement>(".scene")!;
      scene.style.setProperty("--overlay-color", overlay?.color ?? "transparent");
      scene.style.setProperty("--overlay-opacity", String(overlay?.opacity ?? 0));
      scene.style.setProperty("--overlay-duration", `${overlay?.duration ?? 0}ms`);
      scene.style.setProperty("--highlight-radius", `${overlay?.borderRadius ?? 0}px`);
      root.querySelector("h2")!.textContent = presentation.title;
      const description = root.querySelector("p")!;
      description.textContent = presentation.description ?? "";
      if (!presentation.description) description.remove();
      root.querySelector(".progress")!.textContent =
        `${context.stepNumber} / ${context.totalSteps}`;
      const back = root.querySelector<HTMLButtonElement>(".back")!;
      back.textContent = options.backLabel ?? "Back";
      back.hidden = !context.canPrevious;
      back.addEventListener("click", context.controls.previous);
      const next = root.querySelector<HTMLButtonElement>(".next")!;
      next.textContent =
        options.nextLabel ?? (context.stepNumber === context.totalSteps ? "Finish" : "Next");
      next.addEventListener("click", context.controls.proceed);
      document.body.append(host);

      const card = root.querySelector<HTMLElement>(".card")!;
      const overlayRoot = root.querySelector<HTMLElement>(".overlay")!;
      const updatePosition = () => {
        const target = context.target ? document.querySelector(context.target) : null;
        positionCard(card, target, document);
        if (overlay) positionOverlay(overlayRoot, target, document, overlay);
      };
      updatePosition();
      document.defaultView?.addEventListener("resize", updatePosition);
      document.addEventListener("scroll", updatePosition, true);
      removePositionListeners = () => {
        document.defaultView?.removeEventListener("resize", updatePosition);
        document.removeEventListener("scroll", updatePosition, true);
      };
      scheduleFrame(document, () => {
        if (scene.dataset.phase === "enter") scene.setAttribute("data-phase", "active");
      });
      next.focus();
    },
    dismiss,
  };
}

function resolveOverlayOptions(
  options: TourPresenterOptions["overlay"],
): ResolvedOverlayOptions | null {
  if (options === false) return null;
  const overrides = options === true || options === undefined ? {} : options;
  return {
    animation: overrides.animation ?? DEFAULT_OVERLAY.animation,
    color: overrides.color ?? DEFAULT_OVERLAY.color,
    opacity: clamp(overrides.opacity ?? DEFAULT_OVERLAY.opacity, 0, 1),
    padding: Math.max(0, overrides.padding ?? DEFAULT_OVERLAY.padding),
    borderRadius: Math.max(0, overrides.borderRadius ?? DEFAULT_OVERLAY.borderRadius),
    duration: Math.max(0, overrides.duration ?? DEFAULT_OVERLAY.duration),
  };
}

function positionCard(card: HTMLElement, target: Element | null, document: Document): void {
  if (!target) {
    card.style.left = "50%";
    card.style.top = "50%";
    card.style.transform = "translate(-50%, -50%)";
    return;
  }
  card.style.transform = "";
  const rect = target.getBoundingClientRect();
  const { width, height } = viewportSize(document);
  const left = Math.min(Math.max(16, rect.left), Math.max(16, width - 336));
  const top = rect.bottom + 12;
  card.style.left = `${left}px`;
  card.style.top = `${Math.max(16, Math.min(top, height - 180))}px`;
}

function positionOverlay(
  root: HTMLElement,
  target: Element | null,
  document: Document,
  options: ResolvedOverlayOptions,
): void {
  if (!target) {
    root.innerHTML = '<div class="shade shade--full"></div>';
    return;
  }

  if (!root.querySelector(".focus-ring")) {
    root.innerHTML = `
      <div class="shade shade--top"></div><div class="shade shade--bottom"></div>
      <div class="shade shade--left"></div><div class="shade shade--right"></div>
      <div class="focus-ring"></div>`;
  }

  const viewport = viewportSize(document);
  const rect = target.getBoundingClientRect();
  const left = clamp(rect.left - options.padding, 0, viewport.width);
  const top = clamp(rect.top - options.padding, 0, viewport.height);
  const right = clamp(rect.right + options.padding, left, viewport.width);
  const bottom = clamp(rect.bottom + options.padding, top, viewport.height);
  setRect(root.querySelector<HTMLElement>(".shade--top")!, 0, 0, viewport.width, top);
  setRect(
    root.querySelector<HTMLElement>(".shade--bottom")!,
    0,
    bottom,
    viewport.width,
    viewport.height - bottom,
  );
  setRect(root.querySelector<HTMLElement>(".shade--left")!, 0, top, left, bottom - top);
  setRect(
    root.querySelector<HTMLElement>(".shade--right")!,
    right,
    top,
    viewport.width - right,
    bottom - top,
  );
  setRect(root.querySelector<HTMLElement>(".focus-ring")!, left, top, right - left, bottom - top);
}

function setRect(
  element: HTMLElement,
  left: number,
  top: number,
  width: number,
  height: number,
): void {
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
}

function viewportSize(document: Document): { width: number; height: number } {
  return {
    width: document.defaultView?.innerWidth ?? document.documentElement.clientWidth,
    height: document.defaultView?.innerHeight ?? document.documentElement.clientHeight,
  };
}

function scheduleFrame(document: Document, callback: () => void): void {
  const view = document.defaultView;
  if (view?.requestAnimationFrame) view.requestAnimationFrame(() => callback());
  else view?.setTimeout(callback, 0);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
