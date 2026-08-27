// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTourPresenter } from "@scenema/presenter";

const controls = {
  proceed: vi.fn(),
  previous: vi.fn(),
  stop: vi.fn(),
};

beforeEach(() => {
  vi.useFakeTimers();
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
        sceneId: "projects",
        stepId: "create",
        stepNumber: 1,
        totalSteps: 2,
        canPrevious: false,
        interaction: "locked",
        target: "#target",
        controls,
      },
    );

    const host = document.querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!;
    const scene = host.shadowRoot!.querySelector<HTMLElement>(".scene")!;
    const ring = host.shadowRoot!.querySelector<HTMLElement>(".focus-ring")!;
    const hole = host.shadowRoot!.querySelector<SVGRectElement>(".mask-hole")!;
    expect(scene.dataset.phase).toBe("active");
    expect(host.shadowRoot!.querySelectorAll(".overlay-surface")).toHaveLength(1);
    expect(host.shadowRoot!.querySelectorAll('[class^="shade"]')).toHaveLength(0);
    expect(hole.getAttribute("x")).toBe("90");
    expect(hole.getAttribute("y")).toBe("110");
    expect(hole.getAttribute("width")).toBe("220");
    expect(hole.getAttribute("height")).toBe("60");
    expect(hole.getAttribute("rx")).toBe("0");
    expect(ring.style.cssText).toContain("left: 90px");
    expect(ring.style.cssText).toContain("top: 110px");
    expect(ring.style.cssText).toContain("width: 220px");
    const card = host.shadowRoot!.querySelector<HTMLElement>(".card")!;
    expect(card.style.left).toBe("90px");
    expect(card.style.top).toBe("182px");
    expect(scene.style.getPropertyValue("--highlight-radius")).toBe("0px");
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

  it("uses a fading full-screen overlay when a step has no target", () => {
    const presenter = createTourPresenter({ document });

    presenter.present(
      { title: "Finished" },
      {
        sceneId: "projects",
        stepId: "complete",
        stepNumber: 2,
        totalSteps: 2,
        canPrevious: true,
        interaction: "passthrough",
        controls,
      },
    );

    const root = document.querySelector<HTMLElement>(
      '[data-scenema-presenter="tour"]',
    )!.shadowRoot!;
    expect(root.querySelector(".overlay-surface")).not.toBeNull();
    expect(root.querySelector<HTMLElement>(".focus-ring")!.hidden).toBe(true);
    expect(document.querySelector("#target")!.hasAttribute("inert")).toBe(false);
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
        sceneId: "projects",
        stepId: "rounded",
        stepNumber: 1,
        totalSteps: 1,
        canPrevious: false,
        interaction: "passthrough",
        target: "#target",
        controls,
      },
    );

    const root = document.querySelector<HTMLElement>(
      '[data-scenema-presenter="tour"]',
    )!.shadowRoot!;
    expect(root.querySelector(".mask-hole")!.getAttribute("rx")).toBe(sample.expected);
    expect(
      root.querySelector<HTMLElement>(".scene")!.style.getPropertyValue("--highlight-radius"),
    ).toBe(`${sample.expected}px`);
  });

  it("preserves application inert state when releasing the interaction lock", () => {
    document.querySelector("#target")!.setAttribute("inert", "");
    const presenter = createTourPresenter({ document, overlay: false });

    presenter.present(
      { title: "Locked" },
      {
        sceneId: "projects",
        stepId: "create",
        stepNumber: 1,
        totalSteps: 1,
        canPrevious: false,
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
        sceneId: "projects",
        stepId: "create",
        stepNumber: 1,
        totalSteps: 1,
        canPrevious: false,
        interaction: "locked",
        target: "#target",
        controls,
      },
    );

    const host = stage.querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!;
    expect(host.style.position).toBe("absolute");
    expect(host.shadowRoot!.querySelector(".mask-hole")!.getAttribute("x")).toBe("69");
    expect(host.shadowRoot!.querySelector(".mask-hole")!.getAttribute("y")).toBe("69");
    expect(document.querySelector("#target")!.hasAttribute("inert")).toBe(true);
    expect(document.querySelector("#outside")!.hasAttribute("inert")).toBe(false);
  });
});
