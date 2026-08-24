import { ScenemaError, type Actor, type Target } from "@scenema/core";

export interface ActorbleLike {
  moveTo(target: Element): Promise<void> | void;
  click(target: Element): Promise<void> | void;
  type(target: Element, value: string): Promise<void> | void;
}

export function createActorbleActor(
  actorble: ActorbleLike,
  document: Document = window.document,
): Actor {
  const resolve = (target: Target): Element => {
    const element = document.querySelector(target);
    if (!element)
      throw new ScenemaError("TARGET_NOT_FOUND", `Target was not found: ${target}`, { target });
    return element;
  };

  return {
    moveTo: async (target) => actorble.moveTo(resolve(target)),
    click: async (target) => actorble.click(resolve(target)),
    type: async (target, value) => actorble.type(resolve(target), value),
  };
}
