import { ScenemaError, type ConditionWaiter, type SceneDefinition, type SceneMatcher, type Target, type UntilCondition } from "@scenema/core";

export interface DomEnvironment {
  window: Window;
  document: Document;
}

export class DomSceneMatcher implements SceneMatcher {
  constructor(private readonly environment: DomEnvironment) {}

  async matches(scene: SceneDefinition): Promise<boolean> {
    const { location } = this.environment.window;
    const { match } = scene;
    if (typeof match.pathname === "string" && location.pathname !== match.pathname) return false;
    if (match.pathname instanceof RegExp) {
      match.pathname.lastIndex = 0;
      if (!match.pathname.test(location.pathname)) return false;
    }
    if (match.hash !== undefined && location.hash !== match.hash) return false;
    if (match.search) {
      const params = new URLSearchParams(location.search);
      for (const [key, value] of Object.entries(match.search)) {
        if (params.get(key) !== value) return false;
      }
    }
    return !match.visible || this.environment.document.querySelector(match.visible) !== null;
  }
}

export class DomConditionWaiter implements ConditionWaiter {
  constructor(
    private readonly environment: DomEnvironment,
    private readonly defaultTimeout = 5_000,
    private readonly pollInterval = 50,
  ) {}

  async waitFor(condition: UntilCondition, fallbackTarget?: Target): Promise<void> {
    const timeout = condition.timeout ?? this.defaultTimeout;
    const startedAt = Date.now();
    while (!this.satisfied(condition, fallbackTarget)) {
      if (Date.now() - startedAt >= timeout) {
        throw new ScenemaError("TARGET_NOT_FOUND", "Exit condition was not satisfied before timeout.", {
          condition,
          fallbackTarget,
        });
      }
      await new Promise((resolve) => this.environment.window.setTimeout(resolve, this.pollInterval));
    }
  }

  private satisfied(condition: UntilCondition, fallbackTarget?: Target): boolean {
    if (condition.visible && !this.environment.document.querySelector(condition.visible)) return false;
    if (condition.value !== undefined) {
      if (!fallbackTarget) return false;
      const element = this.environment.document.querySelector(fallbackTarget);
      if (!element || !("value" in element) || typeof element.value !== "string") return false;
      if (element.value !== condition.value) return false;
    }
    return true;
  }
}

export function resolveDomTarget(document: Document, target: Target): Element {
  let element: Element | null;
  try {
    element = document.querySelector(target);
  } catch (cause) {
    throw new ScenemaError("TARGET_NOT_FOUND", `Target selector is invalid: ${target}`, { target, cause });
  }
  if (!element) throw new ScenemaError("TARGET_NOT_FOUND", `Target was not found: ${target}`, { target });
  return element;
}
