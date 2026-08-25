import { css, type TargetLike } from "@actorble/browser";
import { type Actor, type Target } from "@scenema/core";

export interface ActorbleActions {
  moveTo(target: TargetLike): Promise<void>;
  click(target: TargetLike): Promise<void>;
  typeInto(target: TargetLike, value: string): Promise<void>;
}

export class ActorbleActorAdapter implements Actor {
  constructor(private readonly actorble: ActorbleActions) {}

  moveTo(target: Target): Promise<void> {
    return this.actorble.moveTo(css(target));
  }

  click(target: Target): Promise<void> {
    return this.actorble.click(css(target));
  }

  type(target: Target, value: string): Promise<void> {
    return this.actorble.typeInto(css(target), value);
  }
}
