// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTourPresenter } from "@scenema/presenter";

const controls = {
  proceed: vi.fn(),
  back: vi.fn(),
  stop: vi.fn(),
};

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperties(window, {
    scrollX: { configurable: true, value: 0 },
    scrollY: { configurable: true, value: 0 },
    innerWidth: { configurable: true, value: 1024 },
    innerHeight: { configurable: true, value: 768 },
  });
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: 0,
  });
  document.body.innerHTML = '<button id="target">Target</button>';
  let elapsed = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    elapsed += 500;
    callback(performance.now() + elapsed);
    return 1;
  });
  document.querySelector("#target")!.getBoundingClientRect = () =>
    DOMRect.fromRect({ x: 100, y: 120, width: 200, height: 40 });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("createTourPresenter overlay", () => {
  it("builds a single masked highlight around the current target", () => {
    const presenter = createTourPresenter({
      document,
      overlay: { padding: 10, borderRadius: 14, duration: 240 },
    });

    presenter.present(
      { title: "Create a project" },
      {
        scenarioId: "demo",
        step: { id: "create", index: 0 },
        presentation: { index: 0 },
        progress: { current: 1, total: 2 },
        canBack: false,
        interaction: "locked",
        target: "#target",
        controls,
      },
    );

    const host = document.querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!;
    const scene = host.shadowRoot!.querySelector<HTMLElement>(".scene")!;
    const hole = host.shadowRoot!.querySelector<SVGPathElement>(".mask-hole")!;
    expect(scene.dataset.phase).toBe("active");
    expect(host.shadowRoot!.querySelectorAll(".overlay-surface")).toHaveLength(1);
    expect(host.shadowRoot!.querySelector(".focus-ring")).toBeNull();
    expect(host.shadowRoot!.querySelectorAll('[class^="shade"]')).toHaveLength(0);
    expect(hole.getAttribute("d")).toBe(
      "M 90 110 H 310 L 310 110 V 170 L 310 170 H 90 L 90 170 V 110 L 90 110 Z",
    );
    const card = host.shadowRoot!.querySelector<HTMLElement>(".card")!;
    expect(card.style.left).toBe("90px");
    expect(card.style.top).toBe("182px");
    expect(scene.style.getPropertyValue("--overlay-delay")).toBe("240ms");
    expect(scene.style.getPropertyValue("--popup-delay")).toBe("480ms");
    expect(document.querySelector("#target")!.hasAttribute("inert")).toBe(true);

    presenter.dismiss();
    expect(document.querySelector("#target")!.hasAttribute("inert")).toBe(false);
    expect(document.querySelector('[data-scenema-presenter="tour"]')).toBeNull();
    expect(scene.dataset.phase).toBe("exit");
    expect(host.isConnected).toBe(true);
    vi.advanceTimersByTime(240);
    expect(host.isConnected).toBe(false);
  });

  it("moves the card above a target near the viewport footer", () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 600 });
    document.querySelector("#target")!.getBoundingClientRect = () =>
      DOMRect.fromRect({ x: 100, y: 540, width: 200, height: 40 });
    const presenter = createTourPresenter({
      document,
      overlay: { padding: 10 },
    });

    presenter.present(
      { title: "Footer action" },
      {
        scenarioId: "demo",
        step: { id: "footer", index: 0 },
        presentation: { index: 0 },
        progress: { current: 1, total: 1 },
        canBack: false,
        interaction: "passthrough",
        target: "#target",
        controls,
      },
    );

    const card = document
      .querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!
      .shadowRoot!.querySelector<HTMLElement>(".card")!;
    expect(card.dataset.placement).toBe("top");
    expect(card.style.left).toBe("90px");
    expect(card.style.top).toBe("354px");
  });

  it("keeps a viable author placement preference", () => {
    document.querySelector("#target")!.getBoundingClientRect = () =>
      DOMRect.fromRect({ x: 100, y: 350, width: 200, height: 40 });
    const presenter = createTourPresenter({
      document,
      preferredPlacement: ({ step }) => (step.id === "preferred" ? "top" : undefined),
      overlay: { padding: 10 },
    });

    presenter.present(
      { title: "Preferred composition" },
      {
        scenarioId: "demo",
        step: { id: "preferred", index: 0 },
        presentation: { index: 0 },
        progress: { current: 1, total: 1 },
        canBack: false,
        interaction: "passthrough",
        target: "#target",
        controls,
      },
    );

    const card = document
      .querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!
      .shadowRoot!.querySelector<HTMLElement>(".card")!;
    expect(card.dataset.placement).toBe("top");
    expect(card.style.top).toBe("164px");
  });

  it("falls back when the author preference would cover the target", () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 600 });
    document.querySelector("#target")!.getBoundingClientRect = () =>
      DOMRect.fromRect({ x: 100, y: 540, width: 200, height: 40 });
    const presenter = createTourPresenter({
      document,
      preferredPlacement: "bottom",
      overlay: { padding: 10 },
    });

    presenter.present(
      { title: "Safe fallback" },
      {
        scenarioId: "demo",
        step: { id: "fallback", index: 0 },
        presentation: { index: 0 },
        progress: { current: 1, total: 1 },
        canBack: false,
        interaction: "passthrough",
        target: "#target",
        controls,
      },
    );

    const card = document
      .querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!
      .shadowRoot!.querySelector<HTMLElement>(".card")!;
    expect(card.dataset.placement).toBe("top");
  });

  it("keeps the current side while it remains viable after resizing", () => {
    document.querySelector("#target")!.getBoundingClientRect = () =>
      DOMRect.fromRect({ x: 100, y: 300, width: 200, height: 40 });
    const presenter = createTourPresenter({ document, overlay: { padding: 10 } });

    presenter.present(
      { title: "Stable placement" },
      {
        scenarioId: "demo",
        step: { id: "stable", index: 0 },
        presentation: { index: 0 },
        progress: { current: 1, total: 1 },
        canBack: false,
        interaction: "passthrough",
        target: "#target",
        controls,
      },
    );

    const card = document
      .querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!
      .shadowRoot!.querySelector<HTMLElement>(".card")!;
    expect(card.dataset.placement).toBe("bottom");

    Object.defineProperty(window, "innerHeight", { configurable: true, value: 400 });
    window.dispatchEvent(new Event("resize"));
    expect(card.dataset.placement).toBe("top");

    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    window.dispatchEvent(new Event("resize"));
    expect(card.dataset.placement).toBe("top");
  });

  it("optionally draws a focus ring around the masked highlight", () => {
    const presenter = createTourPresenter({
      document,
      overlay: { padding: 10, focusRing: true },
    });

    presenter.present(
      { title: "Create a project" },
      {
        scenarioId: "demo",
        step: { id: "create", index: 0 },
        presentation: { index: 0 },
        progress: { current: 1, total: 1 },
        canBack: false,
        interaction: "passthrough",
        target: "#target",
        controls,
      },
    );

    const root = document.querySelector<HTMLElement>(
      '[data-scenema-presenter="tour"]',
    )!.shadowRoot!;
    const ring = root.querySelector<HTMLElement>(".focus-ring")!;
    expect(ring.style.left).toBe("90px");
    expect(ring.style.top).toBe("110px");
    expect(ring.style.width).toBe("220px");
    expect(ring.hidden).toBe(false);
  });

  it("uses a fading full-screen overlay when a step has no target", () => {
    const presenter = createTourPresenter({ document });

    presenter.present(
      { title: "Finished" },
      {
        scenarioId: "demo",
        step: { id: "complete", index: 1 },
        presentation: { index: 0 },
        progress: { current: 2, total: 2 },
        canBack: true,
        interaction: "passthrough",
        controls,
      },
    );

    const root = document.querySelector<HTMLElement>(
      '[data-scenema-presenter="tour"]',
    )!.shadowRoot!;
    expect(root.querySelector(".overlay-surface")).not.toBeNull();
    expect(root.querySelector(".focus-ring")).toBeNull();
    expect(document.querySelector("#target")!.hasAttribute("inert")).toBe(false);
  });

  it("keeps document-space highlights stable without scroll-driven repositioning", () => {
    let scrollY = 300;
    let viewportTop = 120;
    Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
    const target = document.querySelector<HTMLElement>("#target")!;
    const targetRect = vi.fn(() =>
      DOMRect.fromRect({ x: 100, y: viewportTop, width: 200, height: 40 }),
    );
    target.getBoundingClientRect = targetRect;
    const presenter = createTourPresenter({
      document,
      overlay: { padding: 10 },
    });

    presenter.present(
      { title: "Document anchored" },
      {
        scenarioId: "demo",
        step: { id: "anchor", index: 0 },
        presentation: { index: 0 },
        progress: { current: 1, total: 1 },
        canBack: false,
        interaction: "passthrough",
        target: "#target",
        controls,
      },
    );

    const host = document.querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!;
    const hole = host.shadowRoot!.querySelector<SVGPathElement>(".mask-hole")!;
    const initialCalls = targetRect.mock.calls.length;
    const initialPath = hole.getAttribute("d");
    expect(host.style.position).toBe("absolute");
    expect(initialPath).toContain("M 90 410");

    scrollY = 500;
    viewportTop = -80;
    document.dispatchEvent(new Event("scroll", { bubbles: true }));
    expect(targetRect).toHaveBeenCalledTimes(initialCalls);
    expect(hole.getAttribute("d")).toBe(initialPath);

    window.dispatchEvent(new Event("resize"));
    expect(targetRect.mock.calls.length).toBeGreaterThan(initialCalls);
    expect(hole.getAttribute("d")).toBe(initialPath);
  });

  it("anchors the card to an offscreen target before the document scrolls", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2000,
    });
    document.querySelector("#target")!.getBoundingClientRect = () =>
      DOMRect.fromRect({ x: 100, y: 1200, width: 200, height: 40 });
    const presenter = createTourPresenter({
      document,
      overlay: { padding: 10 },
    });

    presenter.present(
      { title: "Offscreen target" },
      {
        scenarioId: "demo",
        step: { id: "offscreen", index: 0 },
        presentation: { index: 0 },
        progress: { current: 1, total: 1 },
        canBack: false,
        interaction: "passthrough",
        target: "#target",
        controls,
      },
    );

    const host = document.querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!;
    const card = host.shadowRoot!.querySelector<HTMLElement>(".card")!;
    expect(card.style.top).toBe("1262px");
  });

  it("places a document-end card safely before its target scrolls into view", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2000,
    });
    document.querySelector("#target")!.getBoundingClientRect = () =>
      DOMRect.fromRect({ x: 100, y: 1900, width: 200, height: 40 });
    const presenter = createTourPresenter({
      document,
      overlay: { padding: 10 },
    });

    presenter.present(
      { title: "Document footer" },
      {
        scenarioId: "demo",
        step: { id: "document-footer", index: 0 },
        presentation: { index: 0 },
        progress: { current: 1, total: 1 },
        canBack: false,
        interaction: "passthrough",
        target: "#target",
        controls,
      },
    );

    const card = document
      .querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!
      .shadowRoot!.querySelector<HTMLElement>(".card")!;
    expect(card.dataset.placement).toBe("top");
    expect(card.style.top).toBe("1714px");
  });

  it.each([
    { borderRadius: "0px", width: 100, height: 40, expected: "0" },
    { borderRadius: "12px", width: 100, height: 40, expected: "16" },
    { borderRadius: "50%", width: 40, height: 40, expected: "24" },
  ])("derives the highlight radius from the target and padding", (sample) => {
    const target = document.querySelector<HTMLElement>("#target")!;
    target.style.borderRadius = sample.borderRadius;
    target.getBoundingClientRect = () =>
      DOMRect.fromRect({ x: 100, y: 120, width: sample.width, height: sample.height });
    const presenter = createTourPresenter({
      document,
      overlay: { padding: 4, borderRadius: 10 },
    });

    presenter.present(
      { title: "Rounded target" },
      {
        scenarioId: "demo",
        step: { id: "rounded", index: 0 },
        presentation: { index: 0 },
        progress: { current: 1, total: 1 },
        canBack: false,
        interaction: "passthrough",
        target: "#target",
        controls,
      },
    );

    const root = document.querySelector<HTMLElement>(
      '[data-scenema-presenter="tour"]',
    )!.shadowRoot!;
    if (sample.expected === "0") {
      expect(root.querySelector(".mask-hole")!.getAttribute("d")).not.toContain(" A ");
    } else {
      expect(root.querySelector(".mask-hole")!.getAttribute("d")).toContain(
        `A ${sample.expected} ${sample.expected}`,
      );
    }
  });

  it("preserves asymmetric and elliptical target corner radii", () => {
    const target = document.querySelector<HTMLElement>("#target")!;
    target.style.borderRadius = "4px 12px 20px 28px / 6px 14px 22px 30px";
    target.getBoundingClientRect = () =>
      DOMRect.fromRect({ x: 100, y: 120, width: 200, height: 100 });
    const presenter = createTourPresenter({
      document,
      overlay: { padding: 4, borderRadius: 0 },
    });

    presenter.present(
      { title: "Asymmetrically rounded target" },
      {
        scenarioId: "demo",
        step: { id: "asymmetric", index: 0 },
        presentation: { index: 0 },
        progress: { current: 1, total: 1 },
        canBack: false,
        interaction: "passthrough",
        target: "#target",
        controls,
      },
    );

    const root = document.querySelector<HTMLElement>(
      '[data-scenema-presenter="tour"]',
    )!.shadowRoot!;
    const path = root.querySelector(".mask-hole")!.getAttribute("d")!;
    expect(path).toContain("A 8 10");
    expect(path).toContain("A 16 18");
    expect(path).toContain("A 24 26");
    expect(path).toContain("A 32 34");
  });

  it("preserves application inert state when releasing the interaction lock", () => {
    document.querySelector("#target")!.setAttribute("inert", "");
    const presenter = createTourPresenter({ document, overlay: false });

    presenter.present(
      { title: "Locked" },
      {
        scenarioId: "demo",
        step: { id: "create", index: 0 },
        presentation: { index: 0 },
        progress: { current: 1, total: 1 },
        canBack: false,
        interaction: "locked",
        controls,
      },
    );
    presenter.dismiss();

    expect(document.querySelector("#target")!.hasAttribute("inert")).toBe(true);
  });

  it("scopes the overlay and interaction lock to a container", () => {
    document.body.innerHTML =
      '<main id="outside">Landing copy</main><section id="stage"><button id="target">Target</button></section>';
    const stage = document.querySelector<HTMLElement>("#stage")!;
    Object.defineProperties(stage, {
      clientWidth: { configurable: true, value: 640 },
      clientHeight: { configurable: true, value: 420 },
      clientLeft: { configurable: true, value: 1 },
      clientTop: { configurable: true, value: 1 },
      scrollWidth: { configurable: true, value: 800 },
      scrollHeight: { configurable: true, value: 600 },
      scrollLeft: { configurable: true, value: 30 },
      scrollTop: { configurable: true, value: 50 },
    });
    stage.getBoundingClientRect = () => DOMRect.fromRect({ x: 20, y: 40, width: 640, height: 420 });
    document.querySelector("#target")!.getBoundingClientRect = () =>
      DOMRect.fromRect({ x: 100, y: 120, width: 200, height: 40 });
    const presenter = createTourPresenter({
      document,
      container: stage,
      overlay: { padding: 10 },
    });

    presenter.present(
      { title: "Scoped guide" },
      {
        scenarioId: "demo",
        step: { id: "create", index: 0 },
        presentation: { index: 0 },
        progress: { current: 1, total: 1 },
        canBack: false,
        interaction: "locked",
        target: "#target",
        controls,
      },
    );

    const host = stage.querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!;
    expect(host.style.position).toBe("absolute");
    expect(host.style.width).toBe("800px");
    expect(host.style.height).toBe("600px");
    expect(host.shadowRoot!.querySelector(".mask-hole")!.getAttribute("d")).toMatch(/^M 99 119/);
    expect(document.querySelector("#target")!.hasAttribute("inert")).toBe(true);
    expect(document.querySelector("#outside")!.hasAttribute("inert")).toBe(false);
  });
});
