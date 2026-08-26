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
  document.addEventListener("mousedown", (event) => {
    if (event.target instanceof HTMLInputElement) event.target.focus();
  });
  window.requestAnimationFrame = (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(0), 0);
  document.body.innerHTML =
    '<a class="skip-link" href="#main">Skip to content</a><div id="app"></div>';
  history.replaceState(null, "", "/demo/projects");
  await import("../apps/site/src/main.ts");
});

function currentActorbleTarget(): Element | null {
  if (location.pathname === "/demo/projects") return document.querySelector("#create-project");
  const name = document.querySelector<HTMLInputElement>("#project-name");
  return name?.value === "Launch workspace" ? document.querySelector("#submit-project") : name;
}

describe("landing demo", () => {
  it("runs the complete guided project scenario", async () => {
    await vi.waitFor(() => expect(document.querySelector("#start-tour")).not.toBeNull());
    (document.querySelector("#start-tour") as HTMLButtonElement).click();
    await expectTourTitle("Create your first project");

    clickTourNext();
    await vi.waitFor(() => expect(location.pathname).toBe("/demo/projects/new"));
    await expectTourTitle("Give the project a name");

    clickTourNext();
    await expectTourTitle("Create the project");
    expect((document.querySelector("#project-name") as HTMLInputElement).value).toBe(
      "Launch workspace",
    );

    clickTourBack();
    await expectTourTitle("Give the project a name");

    clickTourNext();
    await expectTourTitle("Create the project");
    expect((document.querySelector("#project-name") as HTMLInputElement).value).toBe(
      "Launch workspace",
    );

    clickTourNext();
    await vi.waitFor(() => expect(location.pathname).toBe("/demo/projects/launch-workspace"));
    await expectTourTitle("The scenario stayed with you");
    expect(document.querySelector("#project-ready")).not.toBeNull();

    clickTourNext();
    await vi.waitFor(() =>
      expect(document.querySelector('[data-scenema-presenter="tour"]')).toBeNull(),
    );
  });
});

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
