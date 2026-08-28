import type { PresentContent, Presenter, PresenterContext, ResolvedTarget } from "@scenema/core";

export interface TourOverlayOptions {
  color?: string;
  opacity?: number;
  padding?: number;
  borderRadius?: number;
  focusRing?: boolean;
  delay?: number;
  duration?: number;
}

export type TourCardPlacement = "top" | "right" | "bottom" | "left";

export interface TourPresenterOptions {
  document?: Document;
  container?: HTMLElement;
  nextLabel?: string;
  backLabel?: string;
  overlay?: boolean | TourOverlayOptions;
  preferredPlacement?:
    | TourCardPlacement
    | ((context: PresenterContext) => TourCardPlacement | undefined);
}

interface ResolvedOverlayOptions {
  color: string;
  opacity: number;
  padding: number;
  borderRadius: number;
  focusRing: boolean;
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

interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlacementCandidate {
  placement: TourCardPlacement;
  rect: CardRect;
  overlap: number;
  violation: number;
  adjustment: number;
}

const DEFAULT_OVERLAY: ResolvedOverlayOptions = {
  color: "#020617",
  opacity: 0.72,
  padding: 8,
  borderRadius: 10,
  focusRing: false,
  delay: 240,
  duration: 320,
};

const CARD_GAP = 12;
const CARD_HEIGHT_FALLBACK = 164;
const CARD_WIDTH = 320;
const VIEWPORT_PADDING = 16;
const DEFAULT_PLACEMENTS: readonly TourCardPlacement[] = ["bottom", "top", "right", "left"];

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
    present(presentation: PresentContent, context: PresenterContext) {
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
          .focus-ring { position: absolute; z-index: 1; box-sizing: border-box; border: 2px solid #fff;
            border-radius: 0; box-shadow: 0 0 0 1px #0f172a66, 0 0 20px #fff4;
            opacity: 0; transform: scale(.96); transition: opacity var(--overlay-duration) ease,
            transform var(--overlay-duration) cubic-bezier(.22, 1, .36, 1); }
          .scene[data-phase="active"] .focus-ring { opacity: 1; transform: scale(1);
            transition-delay: var(--overlay-delay); }
          .scene[data-phase="exit"] .overlay-surface,
          .scene[data-phase="exit"] .focus-ring, .scene[data-phase="exit"] .card { opacity: 0;
            transition-delay: 0ms; }
          .card { position: absolute; z-index: 2; width: min(320px, calc(100% - 32px)); padding: 18px;
            box-sizing: border-box; color: #0f172a; background: #fff; border: 1px solid #94a3b8;
            border-radius: 8px; box-shadow: 0 12px 32px #0f172a24; overflow-y: auto;
            pointer-events: auto; opacity: 0;
            transition: opacity var(--overlay-duration) ease; }
          .scene[data-phase="active"] .card { opacity: 1; transition-delay: var(--popup-delay); }
          h2 { margin: 0 0 6px; font-size: 16px; letter-spacing: -.015em; } p { margin: 0 0 14px; color: #475569; }
          footer { display: flex; align-items: center; gap: 8px; } .progress { margin-right: auto; color: #475569; font: 12px/1.4 "SFMono-Regular", Consolas, monospace; }
          button { min-height: 36px; border: 1px solid transparent; border-radius: 6px; padding: 8px 12px; font: inherit; cursor: pointer; }
          .back { color: #0f172a; border-color: #e2e8f0; background: transparent; } .next { color: #fff; background: #2450e6; font-weight: 650; }
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
      root.querySelector("h2")!.textContent = presentation.title;
      const description = root.querySelector("p")!;
      description.textContent = presentation.description ?? "";
      if (!presentation.description) description.remove();
      const progress = context.progress;
      root.querySelector(".progress")!.textContent = `${progress.current} / ${progress.total}`;
      const back = root.querySelector<HTMLButtonElement>(".back")!;
      back.textContent = options.backLabel ?? "Back";
      back.hidden = !context.canBack;
      back.addEventListener("click", context.controls.back);
      const next = root.querySelector<HTMLButtonElement>(".next")!;
      next.textContent =
        options.nextLabel ?? (progress.current === progress.total ? "Finish" : "Next");
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
      const preferredPlacement =
        context.placement && context.placement !== "auto"
          ? context.placement
          : resolvePreferredPlacement(options.preferredPlacement, context);
      let cardPlacement: TourCardPlacement | null = null;
      const updatePosition = () => {
        const surface = surfaceSize(document, container);
        host!.style.width = `${surface.width}px`;
        host!.style.height = `${surface.height}px`;
        const target = resolvePresenterTarget(document, context.target);
        const highlight = overlayController?.update(target);
        cardPlacement = positionCard(
          card,
          highlight ??
            (!overlayController && target ? elementRect(target, document, container) : null),
          document,
          container,
          preferredPlacement,
          cardPlacement,
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
    focusRing: overrides.focusRing ?? DEFAULT_OVERLAY.focusRing,
    delay: Math.max(0, overrides.delay ?? DEFAULT_OVERLAY.delay),
    duration: Math.max(0, overrides.duration ?? DEFAULT_OVERLAY.duration),
  };
}

function positionCard(
  card: HTMLElement,
  anchor: OverlayRect | null,
  document: Document,
  container: HTMLElement | undefined,
  preferredPlacement: TourCardPlacement | undefined,
  currentPlacement: TourCardPlacement | null,
): TourCardPlacement | null {
  const currentViewport = scrollport(document, container);
  const viewport = anchor
    ? projectedScrollport(currentViewport, anchor, surfaceSize(document, container))
    : currentViewport;
  const cardSize = sizeCard(card, viewport);
  if (!anchor) {
    delete card.dataset.placement;
    card.style.left = `${viewport.left + viewport.width / 2}px`;
    card.style.top = `${viewport.top + viewport.height / 2}px`;
    card.style.transform = "translate(-50%, -50%)";
    return null;
  }
  card.style.transform = "";
  const candidates = placementCandidates(anchor, cardSize, viewport);
  const priority = placementPriority(preferredPlacement, currentPlacement);
  const validCandidate = priority
    .map((placement) => candidates.find((candidate) => candidate.placement === placement)!)
    .find((candidate) => candidate.overlap === 0 && candidate.violation === 0);
  const candidate = validCandidate ?? bestCompromise(candidates, priority);
  card.dataset.placement = candidate.placement;
  card.style.left = `${candidate.rect.x}px`;
  card.style.top = `${candidate.rect.y}px`;
  return candidate.placement;
}

function resolvePreferredPlacement(
  preference: TourPresenterOptions["preferredPlacement"],
  context: PresenterContext,
): TourCardPlacement | undefined {
  return typeof preference === "function" ? preference(context) : preference;
}

function resolvePresenterTarget(
  document: Document,
  target: ResolvedTarget | undefined,
): Element | null {
  if (target === undefined) return null;
  if (typeof target === "string") return document.querySelector(target);
  return target.nodeType === 1 ? (target as Element) : target.parentElement;
}

function sizeCard(
  card: HTMLElement,
  viewport: { width: number; height: number },
): { width: number; height: number } {
  const width = Math.max(0, Math.min(CARD_WIDTH, viewport.width - VIEWPORT_PADDING * 2));
  const maximumHeight = Math.max(0, viewport.height - VIEWPORT_PADDING * 2);
  card.style.width = `${width}px`;
  card.style.maxHeight = `${maximumHeight}px`;
  const measuredHeight = card.getBoundingClientRect().height;
  return {
    width,
    height: Math.min(measuredHeight || CARD_HEIGHT_FALLBACK, maximumHeight),
  };
}

function placementCandidates(
  anchor: OverlayRect,
  card: { width: number; height: number },
  viewport: { left: number; top: number; width: number; height: number },
): PlacementCandidate[] {
  const minimumLeft = viewport.left + VIEWPORT_PADDING;
  const minimumTop = viewport.top + VIEWPORT_PADDING;
  const maximumLeft = Math.max(
    minimumLeft,
    viewport.left + viewport.width - VIEWPORT_PADDING - card.width,
  );
  const maximumTop = Math.max(
    minimumTop,
    viewport.top + viewport.height - VIEWPORT_PADDING - card.height,
  );
  const ideals: Record<TourCardPlacement, { x: number; y: number }> = {
    top: { x: anchor.x, y: anchor.y - CARD_GAP - card.height },
    right: { x: anchor.x + anchor.width + CARD_GAP, y: anchor.y },
    bottom: { x: anchor.x, y: anchor.y + anchor.height + CARD_GAP },
    left: { x: anchor.x - CARD_GAP - card.width, y: anchor.y },
  };

  return DEFAULT_PLACEMENTS.map((placement) => {
    const ideal = ideals[placement];
    const rect = {
      x: clamp(ideal.x, minimumLeft, maximumLeft),
      y: clamp(ideal.y, minimumTop, maximumTop),
      ...card,
    };
    return {
      placement,
      rect,
      overlap: intersectionArea(rect, anchor),
      violation: placementViolation(placement, rect, anchor),
      adjustment: Math.abs(rect.x - ideal.x) + Math.abs(rect.y - ideal.y),
    };
  });
}

function placementViolation(
  placement: TourCardPlacement,
  card: CardRect,
  anchor: OverlayRect,
): number {
  switch (placement) {
    case "top":
      return Math.max(0, card.y + card.height - anchor.y);
    case "right":
      return Math.max(0, anchor.x + anchor.width - card.x);
    case "bottom":
      return Math.max(0, anchor.y + anchor.height - card.y);
    case "left":
      return Math.max(0, card.x + card.width - anchor.x);
  }
}

function placementPriority(
  preferredPlacement: TourCardPlacement | undefined,
  currentPlacement: TourCardPlacement | null,
): TourCardPlacement[] {
  return Array.from(
    new Set([preferredPlacement, currentPlacement, ...DEFAULT_PLACEMENTS].filter(Boolean)),
  ) as TourCardPlacement[];
}

function bestCompromise(
  candidates: PlacementCandidate[],
  priority: TourCardPlacement[],
): PlacementCandidate {
  return [...candidates].sort(
    (left, right) =>
      left.overlap - right.overlap ||
      left.violation - right.violation ||
      left.adjustment - right.adjustment ||
      priority.indexOf(left.placement) - priority.indexOf(right.placement),
  )[0]!;
}

function intersectionArea(left: CardRect, right: CardRect): number {
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x),
  );
  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y),
  );
  return width * height;
}

function projectedScrollport(
  viewport: { left: number; top: number; width: number; height: number },
  anchor: OverlayRect,
  surface: { width: number; height: number },
): { left: number; top: number; width: number; height: number } {
  return {
    ...viewport,
    left: projectedScrollOffset(
      viewport.left,
      viewport.width,
      anchor.x,
      anchor.width,
      surface.width,
    ),
    top: projectedScrollOffset(
      viewport.top,
      viewport.height,
      anchor.y,
      anchor.height,
      surface.height,
    ),
  };
}

function projectedScrollOffset(
  offset: number,
  viewportSize: number,
  targetOffset: number,
  targetSize: number,
  surfaceSize: number,
): number {
  const targetEnd = targetOffset + targetSize;
  if (targetEnd > offset && targetOffset < offset + viewportSize) return offset;
  return clamp(
    targetOffset + targetSize / 2 - viewportSize / 2,
    0,
    Math.max(0, surfaceSize - viewportSize),
  );
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
    </svg>
    ${options.focusRing ? '<div class="focus-ring"></div>' : ""}`;

  const svg = root.querySelector<SVGSVGElement>(".overlay-svg")!;
  const field = root.querySelector<SVGRectElement>(".mask-field")!;
  const hole = root.querySelector<SVGPathElement>(".mask-hole")!;
  const overlaySurface = root.querySelector<SVGRectElement>(".overlay-surface")!;
  const ring = root.querySelector<HTMLElement>(".focus-ring");
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
      if (ring) ring.hidden = !highlight;
      if (!highlight) {
        setSvgPath(hole, collapsedRect(bounds));
        return null;
      }
      if (ring) {
        setElementRect(ring, highlight.x, highlight.y, highlight.width, highlight.height);
        setElementRadii(ring, highlight.radii);
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

function setElementRadii(element: HTMLElement, radii: CornerRadii): void {
  element.style.borderTopLeftRadius = cssRadius(radii.topLeft);
  element.style.borderTopRightRadius = cssRadius(radii.topRight);
  element.style.borderBottomRightRadius = cssRadius(radii.bottomRight);
  element.style.borderBottomLeftRadius = cssRadius(radii.bottomLeft);
}

function cssRadius(radius: CornerRadius): string {
  const horizontal = `${formatNumber(radius.x)}px`;
  return radius.x === radius.y ? horizontal : `${horizontal} ${formatNumber(radius.y)}px`;
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
