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
    expect(hole.getAttribute("rx")).toBe("14");
    expect(ring.style.cssText).toContain("left: 90px");
    expect(ring.style.cssText).toContain("top: 110px");
    expect(ring.style.cssText).toContain("width: 220px");
    expect(scene.style.getPropertyValue("--highlight-radius")).toBe("14px");
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
});
