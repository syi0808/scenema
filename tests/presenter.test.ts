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
  it("builds an iris highlight around the current target", () => {
    const presenter = createTourPresenter({
      document,
      overlay: { animation: "iris", padding: 10, borderRadius: 14, duration: 240 },
    });

    presenter.present(
      { title: "Create a project" },
      {
        sceneId: "projects",
        stepId: "create",
        stepNumber: 1,
        totalSteps: 2,
        canPrevious: false,
        target: "#target",
        controls,
      },
    );

    const host = document.querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!;
    const scene = host.shadowRoot!.querySelector<HTMLElement>(".scene")!;
    const ring = host.shadowRoot!.querySelector<HTMLElement>(".focus-ring")!;
    const hole = host.shadowRoot!.querySelector<SVGRectElement>(".mask-hole")!;
    expect(scene.dataset).toMatchObject({ animation: "iris", phase: "active" });
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

    presenter.dismiss();
    expect(document.querySelector('[data-scenema-presenter="tour"]')).toBeNull();
    expect(scene.dataset.phase).toBe("exit");
    expect(hole.getAttribute("x")).toBe("-2");
    expect(hole.getAttribute("width")).toBe(String(window.innerWidth + 4));
    expect(host.isConnected).toBe(true);
    vi.advanceTimersByTime(240);
    expect(host.isConnected).toBe(false);
  });

  it("uses a fading full-screen overlay when a step has no target", () => {
    const presenter = createTourPresenter({ document, overlay: { animation: "fade" } });

    presenter.present(
      { title: "Finished" },
      {
        sceneId: "projects",
        stepId: "complete",
        stepNumber: 2,
        totalSteps: 2,
        canPrevious: true,
        controls,
      },
    );

    const root = document.querySelector<HTMLElement>(
      '[data-scenema-presenter="tour"]',
    )!.shadowRoot!;
    expect(root.querySelector<HTMLElement>(".scene")!.dataset.animation).toBe("fade");
    expect(root.querySelector(".overlay-surface")).not.toBeNull();
    expect(root.querySelector<HTMLElement>(".focus-ring")!.hidden).toBe(true);
  });
});
