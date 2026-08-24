import { type Actor, type Target } from "@scenema/core";

import { resolveDomTarget } from "./matcher.js";

export class DomActor implements Actor {
  constructor(private readonly document: Document) {}

  async moveTo(target: Target): Promise<void> {
    resolveDomTarget(this.document, target).scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async click(target: Target): Promise<void> {
    const element = resolveDomTarget(this.document, target);
    if (!(element instanceof this.document.defaultView!.HTMLElement)) {
      throw new TypeError(`Target is not an HTMLElement: ${target}`);
    }
    element.click();
  }

  async type(target: Target, value: string): Promise<void> {
    const element = resolveDomTarget(this.document, target);
    const view = this.document.defaultView!;
    if (!(element instanceof view.HTMLInputElement) && !(element instanceof view.HTMLTextAreaElement)) {
      throw new TypeError(`Target does not accept text: ${target}`);
    }
    element.focus();
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new view.Event("input", { bubbles: true }));
    element.dispatchEvent(new view.Event("change", { bubbles: true }));
  }
}
