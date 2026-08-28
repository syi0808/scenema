import {
  ScenemaError,
  normalizeReady,
  type Condition,
  type ConditionWaiter,
  type ReadyCondition,
  type ResolvedTarget,
  type Target,
  type TargetContext,
  type WaitOptions,
} from "@scenema/core";

export interface DomEnvironment {
  window: Window;
  document: Document;
}

export class DomConditionWaiter implements ConditionWaiter {
  constructor(
    private readonly environment: DomEnvironment,
    private readonly defaultTimeout = 5_000,
    private readonly pollInterval = 50,
  ) {}

  async waitFor(condition: ReadyCondition, options?: WaitOptions): Promise<void> {
    const timeout = options?.timeout ?? this.defaultTimeout;
    const startedAt = Date.now();
    while (!(await this.satisfied(normalizeReady(condition)))) {
      if (Date.now() - startedAt >= timeout) {
        throw new ScenemaError("TARGET_NOT_FOUND", "Condition was not satisfied before timeout.", {
          condition,
          timeout,
        });
      }
      await new Promise((resolve) =>
        this.environment.window.setTimeout(resolve, this.pollInterval),
      );
    }
  }

  private async satisfied(condition: ReadyCondition): Promise<boolean> {
    if (typeof condition === "function") return condition(this.context());
    if (!("kind" in condition)) return this.satisfied(normalizeReady(condition));
    return this.satisfiedCondition(condition);
  }

  private async satisfiedCondition(condition: Condition): Promise<boolean> {
    switch (condition.kind) {
      case "exists":
        return (await queryDomTarget(this.environment.document, condition.target)) !== null;
      case "visible": {
        const target = await queryDomTarget(this.environment.document, condition.target);
        return target !== null && isDomTargetVisible(this.environment.window, target);
      }
      case "value": {
        const target = await queryDomTarget(this.environment.document, condition.target);
        return (
          target !== null &&
          "value" in target &&
          typeof target.value === "string" &&
          target.value === condition.value
        );
      }
      case "pathname": {
        const pathname = this.environment.window.location.pathname;
        if (typeof condition.pathname === "string") return pathname === condition.pathname;
        condition.pathname.lastIndex = 0;
        return condition.pathname.test(pathname);
      }
      case "all": {
        for (const child of condition.conditions) {
          if (!(await this.satisfied(normalizeReady(child)))) return false;
        }
        return true;
      }
      case "any": {
        for (const child of condition.conditions) {
          if (await this.satisfied(normalizeReady(child))) return true;
        }
        return false;
      }
    }
  }

  private context(): TargetContext {
    return {
      document: this.environment.document,
      location: this.environment.window.location,
    };
  }
}

export async function resolveDomTarget(document: Document, target: Target): Promise<Node> {
  const resolved = await queryDomTarget(document, target);
  if (!resolved) {
    throw new ScenemaError("TARGET_NOT_FOUND", "Target was not found.", { target });
  }
  return resolved;
}

export async function queryDomTarget(document: Document, target: Target): Promise<Node | null> {
  if (typeof target === "string") {
    try {
      return document.querySelector(target);
    } catch (cause) {
      throw new ScenemaError("TARGET_NOT_FOUND", `Target selector is invalid: ${target}`, {
        target,
        cause,
      });
    }
  }
  if (typeof target === "function") {
    return target({ document, location: document.defaultView?.location ?? globalThis.location });
  }
  return target;
}

export function isDomTargetVisible(window: Window, target: ResolvedTarget): boolean {
  if (typeof target === "string") return false;
  const element = target.nodeType === 1 ? (target as Element) : target.parentElement;
  if (!element) return false;
  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.visibility === "collapse"
  ) {
    return false;
  }
  if (target.nodeType === 1) {
    const rect = (target as Element).getBoundingClientRect();
    return (target as Element).getClientRects().length > 0 || rect.width > 0 || rect.height > 0;
  }
  const range = target.ownerDocument?.createRange();
  if (!range) return false;
  range.selectNode(target);
  const rect = range.getBoundingClientRect();
  return range.getClientRects().length > 0 || rect.width > 0 || rect.height > 0;
}
