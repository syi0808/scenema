// @vitest-environment jsdom

import { beforeAll, describe, expect, it, vi } from "vitest";

let actorTargetSelector = "#code-tab-navigation";

beforeAll(async () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getBoundingClientRect = vi.fn(() =>
    DOMRect.fromRect({ x: 20, y: 20, width: 120, height: 32 }),
  );
  document.elementFromPoint = vi.fn(() => document.querySelector(actorTargetSelector));
  document.elementsFromPoint = vi.fn(() => {
    const target = document.querySelector(actorTargetSelector);
    return target ? [target] : [];
  });
  window.requestAnimationFrame = (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(0), 0);
  document.body.innerHTML =
    '<a class="skip-link" href="#main">Skip to content</a><div id="app"></div>';
  window.sessionStorage.clear();
  history.replaceState(null, "", "/");
  await import("../apps/site/src/main.ts");
});

describe("automatic landing demo", () => {
  it("asks for consent and drives the page tour through Finish", async () => {
    await vi.waitFor(() =>
      expect(document.querySelector(".demo-prompt")?.textContent).toContain(
        "See Scenema in action?",
      ),
    );

    actorTargetSelector = "#code-tab-dom-action";
    clickButton("Run demo");
    await expectTourTitle("Continue with another action");
    actorTargetSelector = "#code-tab-navigation";

    await vi.waitFor(
      () => {
        expect(document.querySelector(".demo-prompt")).toBeNull();
        expect(document.querySelector("#code-tab-navigation")?.getAttribute("aria-selected")).toBe(
          "true",
        );
        expect(document.querySelector('[data-scenema-presenter="tour"]')).toBeNull();
      },
      { timeout: 5_000 },
    );
    expect(window.sessionStorage.getItem("scenema:demo-prompt-seen")).toBe("true");
  }, 10_000);
});

describe("landing content", () => {
  it("keeps examples compact and connects code tabs to one panel", async () => {
    await vi.waitFor(() => expect(document.querySelector("#run-page-tour")).not.toBeNull());
    expect(document.querySelectorAll(".example-actions .button")).toHaveLength(3);
    expect(document.querySelector("#click-example-count")).toBeNull();
    expect(document.querySelector("#type-example-input")).toBeNull();
    expect(document.querySelector(".feature-strip")).toBeNull();
    expect(document.querySelector(".sequence-preview")).toBeNull();
    expect(document.querySelector(".demo-status")).toBeNull();

    click("#code-tab-dom-action");
    await vi.waitFor(() =>
      expect(document.querySelector("#scenario-code-panel")?.textContent).toContain(
        'type: { value: "Launch workspace" }',
      ),
    );
    click("#code-tab-navigation");
    await vi.waitFor(() =>
      expect(document.querySelector("#scenario-code-panel")?.textContent).toContain(
        'to: "project-detail"',
      ),
    );
  });
});

describe("landing demos", () => {
  it("uses Actorble actions from the first step", async () => {
    actorTargetSelector = "#code-tab-dom-action";
    click("#start-tour");
    await expectTourTitle("Click a real control");

    clickTourNext();
    await vi.waitFor(() =>
      expect(document.querySelector("#code-tab-dom-action")?.getAttribute("aria-selected")).toBe(
        "true",
      ),
    );
    await expectTourTitle("Continue with another action");

    actorTargetSelector = "#code-tab-navigation";
    clickTourNext();
    await vi.waitFor(() =>
      expect(document.querySelector("#code-tab-navigation")?.getAttribute("aria-selected")).toBe(
        "true",
      ),
    );
    await expectTourTitle("The page responded");
    clickTourNext();
    await expectTourTitle("Start with one scenario");
    clickTourNext();
    await vi.waitFor(() =>
      expect(document.querySelector('[data-scenema-presenter="tour"]')).toBeNull(),
    );
    expect(document.querySelector(".demo-status")).toBeNull();
  });

  it("runs the single highlight against the real getting-started block", async () => {
    click("#run-single-highlight");
    await expectTourTitle("Start from the repository");
    clickTourNext();
    await vi.waitFor(() =>
      expect(document.querySelector('[data-scenema-presenter="tour"]')).toBeNull(),
    );
  });

  it("runs a DOM action against the real code tabs", async () => {
    actorTargetSelector = "#code-tab-dom-action";
    click("#run-dom-action");
    await expectTourTitle("Click a real control");
    clickTourNext();
    await vi.waitFor(() =>
      expect(document.querySelector("#code-tab-dom-action")?.getAttribute("aria-selected")).toBe(
        "true",
      ),
    );
    await expectTourTitle("The interface responded");
    expect(document.querySelector("#scenario-code-panel")?.textContent).toContain(
      'type: { value: "Launch workspace" }',
    );
    clickTourNext();
  });
});

function click(selector: string): void {
  (document.querySelector(selector) as HTMLElement).click();
}

function clickButton(label: string): void {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`Button not found: ${label}`);
  button.click();
}

async function expectTourTitle(title: string): Promise<void> {
  await vi.waitFor(
    () => {
      const presenter = document.querySelector<HTMLElement>('[data-scenema-presenter="tour"]');
      expect(presenter?.shadowRoot?.querySelector("h2")?.textContent).toBe(title);
    },
    { timeout: 3_000 },
  );
}

function clickTourNext(): void {
  const presenter = document.querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!;
  presenter.shadowRoot!.querySelector<HTMLButtonElement>(".next")!.click();
}
