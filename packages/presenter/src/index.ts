import type { Presenter, PresenterContext, StepPresentation } from "@scenema/core";

export interface TourOverlayOptions {
  color?: string;
  opacity?: number;
  padding?: number;
  borderRadius?: number;
  delay?: number;
  duration?: number;
}

export interface TourPresenterOptions {
  document?: Document;
  nextLabel?: string;
  backLabel?: string;
  overlay?: boolean | TourOverlayOptions;
}

interface ResolvedOverlayOptions {
  color: string;
  opacity: number;
  padding: number;
  borderRadius: number;
  delay: number;
  duration: number;
}

interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

interface OverlayController {
  update(target: Element | null): void;
}

const DEFAULT_OVERLAY: ResolvedOverlayOptions = {
  color: "#020617",
  opacity: 0.72,
  padding: 8,
  borderRadius: 10,
  delay: 240,
  duration: 320,
};

export function createTourPresenter(options: TourPresenterOptions = {}): Presenter {
  const document = options.document ?? window.document;
  const overlay = resolveOverlayOptions(options.overlay);
  let host: HTMLElement | null = null;
  let removePositionListeners = () => {};
  let releaseInteractionLock = () => {};

  const dismiss = () => {
    removePositionListeners();
    removePositionListeners = () => {};
    releaseInteractionLock();
    releaseInteractionLock = () => {};
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
          .overlay-svg { position: fixed; z-index: 0; inset: 0; width: 100%; height: 100%; }
          .overlay-surface { fill: var(--overlay-color); opacity: 0;
            transition: opacity var(--overlay-duration) ease; }
          .scene[data-phase="active"] .overlay-surface { opacity: var(--overlay-opacity);
            transition-delay: var(--overlay-delay); }
          .focus-ring { position: fixed; z-index: 1; box-sizing: border-box; border: 2px solid #fff;
            border-radius: var(--highlight-radius); box-shadow: 0 0 0 1px #0f172a66, 0 0 24px #fff3;
            opacity: 0; transform: scale(.96); transition: opacity var(--overlay-duration) ease,
            transform var(--overlay-duration) cubic-bezier(.22, 1, .36, 1); }
          .scene[data-phase="active"] .focus-ring { opacity: 1; transform: scale(1);
            transition-delay: var(--overlay-delay); }
          .scene[data-phase="exit"] .overlay-surface,
          .scene[data-phase="exit"] .focus-ring, .scene[data-phase="exit"] .card { opacity: 0;
            transition-delay: 0ms; }
          .card { position: fixed; z-index: 2; width: min(320px, calc(100vw - 32px)); padding: 18px;
            box-sizing: border-box; color: #f8fafc; background: #111827; border: 1px solid #374151;
            border-radius: 14px; box-shadow: 0 18px 48px #0005; pointer-events: auto; opacity: 0;
            transition: opacity var(--overlay-duration) ease; }
          .scene[data-phase="active"] .card { opacity: 1; transition-delay: var(--popup-delay); }
          h2 { margin: 0 0 6px; font-size: 16px; } p { margin: 0 0 14px; color: #cbd5e1; }
          footer { display: flex; align-items: center; gap: 8px; } .progress { margin-right: auto; color: #94a3b8; font-size: 12px; }
          button { border: 0; border-radius: 8px; padding: 8px 12px; font: inherit; cursor: pointer; }
          .back { color: #e2e8f0; background: #334155; } .next { color: #111827; background: #f8fafc; font-weight: 650; }
          @media (prefers-reduced-motion: reduce) { .overlay-surface, .focus-ring, .card {
            transition-duration: 1ms !important; transition-delay: 0ms !important; } }
        </style>
        <div class="scene" data-phase="enter">
          <div class="overlay" aria-hidden="true"></div>
          <section class="card" role="dialog" aria-live="polite" aria-labelledby="scenema-title">
            <h2 id="scenema-title"></h2><p></p><footer><span class="progress"></span>
            <button class="back" type="button"></button><button class="next" type="button"></button></footer>
          </section>
        </div>`;

      const scene = root.querySelector<HTMLElement>(".scene")!;
      scene.style.setProperty("--overlay-color", overlay?.color ?? "transparent");
      scene.style.setProperty("--overlay-opacity", String(overlay?.opacity ?? 0));
      scene.style.setProperty("--overlay-delay", `${overlay?.delay ?? 0}ms`);
      scene.style.setProperty("--overlay-duration", `${overlay?.duration ?? 0}ms`);
      scene.style.setProperty(
        "--popup-delay",
        `${(overlay?.delay ?? 0) + (overlay?.duration ?? 0)}ms`,
      );
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
      if (context.interaction === "locked") {
        releaseInteractionLock = lockDocumentInteraction(document, host);
      }

      const card = root.querySelector<HTMLElement>(".card")!;
      const overlayRoot = root.querySelector<HTMLElement>(".overlay")!;
      const overlayController = overlay
        ? createOverlayController(overlayRoot, scene, document, overlay)
        : null;
      const updatePosition = () => {
        const target = context.target ? document.querySelector(context.target) : null;
        positionCard(card, target, document);
        overlayController?.update(target);
      };
      updatePosition();
      document.defaultView?.addEventListener("resize", updatePosition);
      document.addEventListener("scroll", updatePosition, true);
      removePositionListeners = () => {
        document.defaultView?.removeEventListener("resize", updatePosition);
        document.removeEventListener("scroll", updatePosition, true);
      };
      scheduleFrame(document, () => {
        if (scene.dataset.phase !== "enter") return;
        scene.setAttribute("data-phase", "active");
      });
      next.focus();
    },
    dismiss,
  };
}

function lockDocumentInteraction(document: Document, host: HTMLElement): () => void {
  const siblings = Array.from(document.body.children).filter(
    (element): element is HTMLElement => element instanceof HTMLElement && element !== host,
  );
  const initiallyInert = new Set(siblings.filter((element) => element.hasAttribute("inert")));
  for (const element of siblings) element.setAttribute("inert", "");
  return () => {
    for (const element of siblings) {
      if (!initiallyInert.has(element)) element.removeAttribute("inert");
    }
  };
}

function resolveOverlayOptions(
  options: TourPresenterOptions["overlay"],
): ResolvedOverlayOptions | null {
  if (options === false) return null;
  const overrides = options === true || options === undefined ? {} : options;
  return {
    color: overrides.color ?? DEFAULT_OVERLAY.color,
    opacity: clamp(overrides.opacity ?? DEFAULT_OVERLAY.opacity, 0, 1),
    padding: Math.max(0, overrides.padding ?? DEFAULT_OVERLAY.padding),
    borderRadius: Math.max(0, overrides.borderRadius ?? DEFAULT_OVERLAY.borderRadius),
    delay: Math.max(0, overrides.delay ?? DEFAULT_OVERLAY.delay),
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

function createOverlayController(
  root: HTMLElement,
  scene: HTMLElement,
  document: Document,
  options: ResolvedOverlayOptions,
): OverlayController {
  root.innerHTML = `
    <svg class="overlay-svg" aria-hidden="true">
      <defs>
        <mask id="scenema-overlay-mask" maskUnits="userSpaceOnUse">
          <rect class="mask-field" fill="white"></rect>
          <rect class="mask-hole" fill="black"></rect>
        </mask>
      </defs>
      <rect class="overlay-surface" mask="url(#scenema-overlay-mask)"></rect>
    </svg>
    <div class="focus-ring"></div>`;

  const svg = root.querySelector<SVGSVGElement>(".overlay-svg")!;
  const field = root.querySelector<SVGRectElement>(".mask-field")!;
  const hole = root.querySelector<SVGRectElement>(".mask-hole")!;
  const surface = root.querySelector<SVGRectElement>(".overlay-surface")!;
  const ring = root.querySelector<HTMLElement>(".focus-ring")!;
  let viewport = viewportSize(document);

  const setViewport = () => {
    viewport = viewportSize(document);
    svg.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
    for (const element of [field, surface]) {
      element.setAttribute("x", "0");
      element.setAttribute("y", "0");
      element.setAttribute("width", String(viewport.width));
      element.setAttribute("height", String(viewport.height));
    }
  };

  return {
    update(target) {
      setViewport();
      const highlight = target ? targetOverlayRect(target, viewport, options) : null;
      scene.dataset.hasTarget = String(Boolean(highlight));
      ring.hidden = !highlight;
      if (!highlight) {
        setSvgRect(hole, collapsedRect(viewport));
        return;
      }
      setElementRect(ring, highlight.x, highlight.y, highlight.width, highlight.height);
      setSvgRect(hole, highlight);
    },
  };
}

function targetOverlayRect(
  target: Element,
  viewport: { width: number; height: number },
  options: ResolvedOverlayOptions,
): OverlayRect {
  const rect = target.getBoundingClientRect();
  const x = clamp(rect.left - options.padding, 0, viewport.width);
  const y = clamp(rect.top - options.padding, 0, viewport.height);
  const right = clamp(rect.right + options.padding, x, viewport.width);
  const bottom = clamp(rect.bottom + options.padding, y, viewport.height);
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
    radius: options.borderRadius,
  };
}

function collapsedRect(viewport: { width: number; height: number }): OverlayRect {
  return { x: viewport.width / 2, y: viewport.height / 2, width: 0, height: 0, radius: 0 };
}

function setElementRect(
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

function setSvgRect(element: SVGRectElement, rect: OverlayRect): void {
  element.setAttribute("x", String(rect.x));
  element.setAttribute("y", String(rect.y));
  element.setAttribute("width", String(rect.width));
  element.setAttribute("height", String(rect.height));
  element.setAttribute("rx", String(Math.min(rect.radius, rect.width / 2, rect.height / 2)));
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
