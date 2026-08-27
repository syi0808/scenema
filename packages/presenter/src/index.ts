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
  container?: HTMLElement;
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
  radii: CornerRadii;
}

interface CornerRadius {
  x: number;
  y: number;
}

interface CornerRadii {
  topLeft: CornerRadius;
  topRight: CornerRadius;
  bottomRight: CornerRadius;
  bottomLeft: CornerRadius;
}

interface OverlayController {
  update(target: Element | null): OverlayRect | null;
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
  const container = options.container;
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
          :host { all: initial; position: absolute; z-index: 2147483647; top: 0; left: 0;
            pointer-events: none; }
          .scene { position: absolute; inset: 0; font: 14px/1.45 "Helvetica Neue", Helvetica, Arial, sans-serif; }
          .overlay-svg { position: absolute; z-index: 0; inset: 0; width: 100%; height: 100%; }
          .overlay-surface { fill: var(--overlay-color); opacity: 0;
            transition: opacity var(--overlay-duration) ease; }
          .scene[data-phase="active"] .overlay-surface { opacity: var(--overlay-opacity);
            transition-delay: var(--overlay-delay); }
          .scene[data-phase="exit"] .overlay-surface,
          .scene[data-phase="exit"] .card { opacity: 0;
            transition-delay: 0ms; }
          .card { position: absolute; z-index: 2; width: min(320px, calc(100% - 32px)); padding: 18px;
            box-sizing: border-box; color: #0f172a; background: #fff; border: 1px solid #94a3b8;
            border-radius: 8px; box-shadow: 0 12px 32px #0f172a24; pointer-events: auto; opacity: 0;
            transition: opacity var(--overlay-duration) ease; }
          .scene[data-phase="active"] .card { opacity: 1; transition-delay: var(--popup-delay); }
          h2 { margin: 0 0 6px; font-size: 16px; letter-spacing: -.015em; } p { margin: 0 0 14px; color: #475569; }
          footer { display: flex; align-items: center; gap: 8px; } .progress { margin-right: auto; color: #475569; font: 12px/1.4 "SFMono-Regular", Consolas, monospace; }
          button { min-height: 36px; border: 1px solid transparent; border-radius: 6px; padding: 8px 12px; font: inherit; cursor: pointer; }
          .back { color: #0f172a; border-color: #e2e8f0; background: transparent; } .next { color: #fff; background: #2450e6; font-weight: 650; }
          @media (prefers-reduced-motion: reduce) { .overlay-surface, .card {
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
      host.style.position = "absolute";
      (container ?? document.body).append(host);
      if (context.interaction === "locked") {
        releaseInteractionLock = lockDocumentInteraction(document, host, container);
      }

      const card = root.querySelector<HTMLElement>(".card")!;
      const overlayRoot = root.querySelector<HTMLElement>(".overlay")!;
      const overlayController = overlay
        ? createOverlayController(overlayRoot, scene, document, overlay, container)
        : null;
      const updatePosition = () => {
        const surface = surfaceSize(document, container);
        host!.style.width = `${surface.width}px`;
        host!.style.height = `${surface.height}px`;
        const target = context.target ? document.querySelector(context.target) : null;
        const highlight = overlayController?.update(target);
        positionCard(
          card,
          highlight ??
            (!overlayController && target ? elementRect(target, document, container) : null),
          document,
          container,
        );
      };
      updatePosition();
      document.defaultView?.addEventListener("resize", updatePosition);
      removePositionListeners = () => {
        document.defaultView?.removeEventListener("resize", updatePosition);
      };
      scheduleFrame(document, () => {
        if (scene.dataset.phase !== "enter") return;
        scene.setAttribute("data-phase", "active");
      });
      next.focus({ preventScroll: true });
    },
    dismiss,
  };
}

function lockDocumentInteraction(
  document: Document,
  host: HTMLElement,
  container?: HTMLElement,
): () => void {
  const parent = container ?? document.body;
  const siblings = Array.from(parent.children).filter(
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

function positionCard(
  card: HTMLElement,
  anchor: OverlayRect | null,
  document: Document,
  container?: HTMLElement,
): void {
  const viewport = scrollport(document, container);
  if (!anchor) {
    card.style.left = `${viewport.left + viewport.width / 2}px`;
    card.style.top = `${viewport.top + viewport.height / 2}px`;
    card.style.transform = "translate(-50%, -50%)";
    return;
  }
  card.style.transform = "";
  const horizontallyVisible =
    anchor.x + anchor.width >= viewport.left && anchor.x <= viewport.left + viewport.width;
  const verticallyVisible =
    anchor.y + anchor.height >= viewport.top && anchor.y <= viewport.top + viewport.height;
  const minimumLeft = viewport.left + 16;
  const maximumLeft = Math.max(minimumLeft, viewport.left + viewport.width - 336);
  const left = horizontallyVisible
    ? Math.min(Math.max(minimumLeft, anchor.x), maximumLeft)
    : anchor.x;
  const top = anchor.y + anchor.height + 12;
  card.style.left = `${left}px`;
  card.style.top = `${
    verticallyVisible
      ? Math.max(viewport.top + 16, Math.min(top, viewport.top + viewport.height - 180))
      : top
  }px`;
}

function createOverlayController(
  root: HTMLElement,
  scene: HTMLElement,
  document: Document,
  options: ResolvedOverlayOptions,
  container?: HTMLElement,
): OverlayController {
  root.innerHTML = `
    <svg class="overlay-svg" aria-hidden="true">
      <defs>
        <mask id="scenema-overlay-mask" maskUnits="userSpaceOnUse">
          <rect class="mask-field" fill="white"></rect>
          <path class="mask-hole" fill="black"></path>
        </mask>
      </defs>
      <rect class="overlay-surface" mask="url(#scenema-overlay-mask)"></rect>
    </svg>`;

  const svg = root.querySelector<SVGSVGElement>(".overlay-svg")!;
  const field = root.querySelector<SVGRectElement>(".mask-field")!;
  const hole = root.querySelector<SVGPathElement>(".mask-hole")!;
  const overlaySurface = root.querySelector<SVGRectElement>(".overlay-surface")!;
  let bounds = surfaceSize(document, container);

  const setSurface = () => {
    bounds = surfaceSize(document, container);
    svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    for (const element of [field, overlaySurface]) {
      element.setAttribute("x", "0");
      element.setAttribute("y", "0");
      element.setAttribute("width", String(bounds.width));
      element.setAttribute("height", String(bounds.height));
    }
  };

  return {
    update(target) {
      setSurface();
      const highlight = target
        ? targetOverlayRect(target, bounds, options, document, container)
        : null;
      scene.dataset.hasTarget = String(Boolean(highlight));
      if (!highlight) {
        setSvgPath(hole, collapsedRect(bounds));
        return null;
      }
      setSvgPath(hole, highlight);
      return highlight;
    },
  };
}

function targetOverlayRect(
  target: Element,
  surface: { width: number; height: number },
  options: ResolvedOverlayOptions,
  document: Document,
  container?: HTMLElement,
): OverlayRect {
  const rect = target.getBoundingClientRect();
  const offset = coordinateOffset(document, container);
  const left = rect.left + offset.left;
  const top = rect.top + offset.top;
  const x = clamp(left - options.padding, 0, surface.width);
  const y = clamp(top - options.padding, 0, surface.height);
  const right = clamp(left + rect.width + options.padding, x, surface.width);
  const bottom = clamp(top + rect.height + options.padding, y, surface.height);
  const radii = expandRadii(targetBorderRadii(target, rect), options, right - x, bottom - y);
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
    radii,
  };
}

function elementRect(target: Element, document: Document, container?: HTMLElement): OverlayRect {
  const rect = target.getBoundingClientRect();
  const offset = coordinateOffset(document, container);
  return {
    x: rect.left + offset.left,
    y: rect.top + offset.top,
    width: rect.width,
    height: rect.height,
    radii: zeroCornerRadii(),
  };
}

function targetBorderRadii(target: Element, rect: DOMRect): CornerRadii {
  const style = target.ownerDocument.defaultView?.getComputedStyle(target);
  if (!style) return zeroCornerRadii();
  const shorthand = parseBorderRadius(style.borderRadius, rect.width, rect.height);
  return {
    topLeft: parseCornerRadius(
      style.borderTopLeftRadius,
      rect.width,
      rect.height,
      shorthand.topLeft,
    ),
    topRight: parseCornerRadius(
      style.borderTopRightRadius,
      rect.width,
      rect.height,
      shorthand.topRight,
    ),
    bottomRight: parseCornerRadius(
      style.borderBottomRightRadius,
      rect.width,
      rect.height,
      shorthand.bottomRight,
    ),
    bottomLeft: parseCornerRadius(
      style.borderBottomLeftRadius,
      rect.width,
      rect.height,
      shorthand.bottomLeft,
    ),
  };
}

function parseBorderRadius(value: string, width: number, height: number): CornerRadii {
  const [horizontal = "", vertical = horizontal] = value.split("/").map((part) => part.trim());
  const horizontalValues = expandRadiusValues(horizontal);
  const verticalValues = expandRadiusValues(vertical);
  return {
    topLeft: {
      x: radiusLength(horizontalValues[0], width),
      y: radiusLength(verticalValues[0], height),
    },
    topRight: {
      x: radiusLength(horizontalValues[1], width),
      y: radiusLength(verticalValues[1], height),
    },
    bottomRight: {
      x: radiusLength(horizontalValues[2], width),
      y: radiusLength(verticalValues[2], height),
    },
    bottomLeft: {
      x: radiusLength(horizontalValues[3], width),
      y: radiusLength(verticalValues[3], height),
    },
  };
}

function expandRadiusValues(value: string): [string, string, string, string] {
  const values = value.trim().split(/\s+/).filter(Boolean);
  const [topLeft = "0", topRight = topLeft, bottomRight = topLeft, bottomLeft = topRight] = values;
  return [topLeft, topRight, bottomRight, bottomLeft];
}

function parseCornerRadius(
  value: string,
  width: number,
  height: number,
  fallback: CornerRadius,
): CornerRadius {
  const values = value.trim().split(/\s+/).filter(Boolean);
  if (values.length === 0) return fallback;
  const [horizontalValue = "0", verticalValue = horizontalValue] = values;
  const horizontal = radiusLength(horizontalValue, width);
  const vertical = radiusLength(verticalValue, height);
  return horizontal === 0 && vertical === 0 ? fallback : { x: horizontal, y: vertical };
}

function radiusLength(value: string, percentageBasis: number): number {
  const match = /^(\d*\.?\d+)(px|%)$/.exec(value);
  if (!match) return 0;
  const amount = Number(match[1]);
  return match[2] === "%" ? (amount / 100) * percentageBasis : amount;
}

function expandRadii(
  radii: CornerRadii,
  options: ResolvedOverlayOptions,
  width: number,
  height: number,
): CornerRadii {
  const expanded = mapCornerRadii(radii, ({ x, y }) =>
    x === 0 || y === 0
      ? { x: 0, y: 0 }
      : {
          x: Math.max(options.borderRadius, x + options.padding),
          y: Math.max(options.borderRadius, y + options.padding),
        },
  );
  const horizontalTop = expanded.topLeft.x + expanded.topRight.x;
  const horizontalBottom = expanded.bottomLeft.x + expanded.bottomRight.x;
  const verticalLeft = expanded.topLeft.y + expanded.bottomLeft.y;
  const verticalRight = expanded.topRight.y + expanded.bottomRight.y;
  const scale = Math.min(
    1,
    horizontalTop > 0 ? width / horizontalTop : 1,
    horizontalBottom > 0 ? width / horizontalBottom : 1,
    verticalLeft > 0 ? height / verticalLeft : 1,
    verticalRight > 0 ? height / verticalRight : 1,
  );
  return mapCornerRadii(expanded, ({ x, y }) => ({ x: x * scale, y: y * scale }));
}

function mapCornerRadii(
  radii: CornerRadii,
  transform: (radius: CornerRadius) => CornerRadius,
): CornerRadii {
  return {
    topLeft: transform(radii.topLeft),
    topRight: transform(radii.topRight),
    bottomRight: transform(radii.bottomRight),
    bottomLeft: transform(radii.bottomLeft),
  };
}

function zeroCornerRadii(): CornerRadii {
  const radius = () => ({ x: 0, y: 0 });
  return {
    topLeft: radius(),
    topRight: radius(),
    bottomRight: radius(),
    bottomLeft: radius(),
  };
}

function collapsedRect(viewport: { width: number; height: number }): OverlayRect {
  return {
    x: viewport.width / 2,
    y: viewport.height / 2,
    width: 0,
    height: 0,
    radii: zeroCornerRadii(),
  };
}

function setSvgPath(element: SVGPathElement, rect: OverlayRect): void {
  const { x, y, width, height, radii } = rect;
  const right = x + width;
  const bottom = y + height;
  const commands = [
    `M ${formatNumber(x + radii.topLeft.x)} ${formatNumber(y)}`,
    `H ${formatNumber(right - radii.topRight.x)}`,
    cornerPath(radii.topRight, right, y + radii.topRight.y),
    `V ${formatNumber(bottom - radii.bottomRight.y)}`,
    cornerPath(radii.bottomRight, right - radii.bottomRight.x, bottom),
    `H ${formatNumber(x + radii.bottomLeft.x)}`,
    cornerPath(radii.bottomLeft, x, bottom - radii.bottomLeft.y),
    `V ${formatNumber(y + radii.topLeft.y)}`,
    cornerPath(radii.topLeft, x + radii.topLeft.x, y),
    "Z",
  ];
  element.setAttribute("d", commands.join(" "));
}

function cornerPath(radius: CornerRadius, x: number, y: number): string {
  return radius.x === 0 || radius.y === 0
    ? `L ${formatNumber(x)} ${formatNumber(y)}`
    : `A ${formatNumber(radius.x)} ${formatNumber(radius.y)} 0 0 1 ${formatNumber(x)} ${formatNumber(y)}`;
}

function formatNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function surfaceSize(
  document: Document,
  container?: HTMLElement,
): { width: number; height: number } {
  if (container) {
    return {
      width: Math.max(container.clientWidth, container.scrollWidth),
      height: Math.max(container.clientHeight, container.scrollHeight),
    };
  }
  const root = document.documentElement;
  const body = document.body;
  return {
    width: Math.max(
      document.defaultView?.innerWidth ?? root.clientWidth,
      root.clientWidth,
      root.scrollWidth,
      body?.clientWidth ?? 0,
      body?.scrollWidth ?? 0,
    ),
    height: Math.max(
      document.defaultView?.innerHeight ?? root.clientHeight,
      root.clientHeight,
      root.scrollHeight,
      body?.clientHeight ?? 0,
      body?.scrollHeight ?? 0,
    ),
  };
}

function coordinateOffset(
  document: Document,
  container?: HTMLElement,
): { left: number; top: number } {
  if (container) {
    const origin = container.getBoundingClientRect();
    return {
      left: container.scrollLeft - origin.left - container.clientLeft,
      top: container.scrollTop - origin.top - container.clientTop,
    };
  }
  return {
    left: document.defaultView?.scrollX ?? 0,
    top: document.defaultView?.scrollY ?? 0,
  };
}

function scrollport(
  document: Document,
  container?: HTMLElement,
): { left: number; top: number; width: number; height: number } {
  if (container) {
    return {
      left: container.scrollLeft,
      top: container.scrollTop,
      width: container.clientWidth,
      height: container.clientHeight,
    };
  }
  const root = document.documentElement;
  return {
    left: document.defaultView?.scrollX ?? 0,
    top: document.defaultView?.scrollY ?? 0,
    width: document.defaultView?.innerWidth ?? root.clientWidth,
    height: document.defaultView?.innerHeight ?? root.clientHeight,
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
