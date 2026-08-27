// @vitest-environment jsdom

import { beforeAll, describe, expect, it, vi } from "vitest";

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
  document.elementFromPoint = vi.fn(() => currentActorbleTarget());
  document.elementsFromPoint = vi.fn(() => {
    const target = currentActorbleTarget();
    return target ? [target] : [];
  });
  window.requestAnimationFrame = (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(0), 0);
  document.body.innerHTML =
    '<a class="skip-link" href="#main">Skip to content</a><div id="app"></div>';
  history.replaceState(null, "", "/");
  await import("../apps/site/src/main.ts");
});

function currentActorbleTarget(): Element | null {
  return (
    document.querySelector("#click-example-action") ??
    document.querySelector("#type-example-input") ??
    document.querySelector("#navigation-example-action") ??
    document.querySelector("#scenario-code-panel") ??
    document.querySelector("#hero-demo")
  );
}

describe("landing examples", () => {
  it("runs examples directly and keeps the selected route in sync", async () => {
    await vi.waitFor(() => expect(document.querySelector("#example-tab-click")).not.toBeNull());
    click("#example-tab-click");
    expect(location.pathname).toBe("/examples/click");
    await vi.waitFor(() => expect(document.querySelector("#click-example-action")).not.toBeNull());
    click("#click-example-action");
    await vi.waitFor(() =>
      expect(document.querySelector("#click-example-count")?.textContent).toContain("1"),
    );

    click("#example-tab-type");
    expect(location.pathname).toBe("/examples/type");
    await vi.waitFor(() => expect(document.querySelector("#type-example-input")).not.toBeNull());
    const input = document.querySelector<HTMLInputElement>("#type-example-input")!;
    input.value = "Direct example";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(input.value).toBe("Direct example");

    click("#example-tab-navigation");
    await vi.waitFor(() =>
      expect(document.querySelector("#navigation-example-action")).not.toBeNull(),
    );
    click("#navigation-example-action");
    expect(location.pathname).toBe("/examples/navigation");
    expect(document.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe(
      "Navigate",
    );
  });
});

describe("integrated landing demo", () => {
  it("clicks, types, changes route, and connects the result to code", async () => {
    click("#start-tour");
    await expectTourTitle("This page is the demo");

    clickTourNext();
    await expectTourTitle("Perform a real click");

    clickTourNext();
    await expectTourTitle("Type into the real field");

    clickTourBack();
    await expectTourTitle("Perform a real click");
    expect(document.querySelector("#click-example-count")?.textContent).toContain("1");

    clickTourNext();
    await expectTourTitle("Type into the real field");
    clickTourNext();
    await expectTourTitle("Continue on a new route");

    clickTourBack();
    await expectTourTitle("Type into the real field");
    expect((document.querySelector("#type-example-input") as HTMLInputElement).value).toBe(
      "Launch workspace",
    );

    clickTourNext();
    await expectTourTitle("Continue on a new route");
    clickTourNext();
    await vi.waitFor(() => expect(location.pathname).toBe("/examples/navigation"));
    await expectTourTitle("The scenario stayed with the page");
    expect(document.querySelector("#scenario-code-panel")?.textContent).toContain(
      "#navigation-example-action",
    );

    clickTourNext();
    await vi.waitFor(() =>
      expect(document.querySelector('[data-scenema-presenter="tour"]')).toBeNull(),
    );
    await vi.waitFor(() =>
      expect(document.querySelector(".demo-status")?.textContent).toContain("Demo complete"),
    );
    expect(document.querySelector("#start-tour")?.textContent).toBe("Run the demo again");
  });
});

function click(selector: string): void {
  (document.querySelector(selector) as HTMLElement).click();
}

async function expectTourTitle(title: string): Promise<void> {
  await vi.waitFor(() => {
    const presenter = document.querySelector<HTMLElement>('[data-scenema-presenter="tour"]');
    expect(presenter?.shadowRoot?.querySelector("h2")?.textContent).toBe(title);
  });
}

function clickTourNext(): void {
  const presenter = document.querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!;
  presenter.shadowRoot!.querySelector<HTMLButtonElement>(".next")!.click();
}

function clickTourBack(): void {
  const presenter = document.querySelector<HTMLElement>('[data-scenema-presenter="tour"]')!;
  presenter.shadowRoot!.querySelector<HTMLButtonElement>(".back")!.click();
}
