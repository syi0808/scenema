import { css, type MoveOptions, type TargetLike } from "@actorble/browser";
import { type Actor, type Target } from "@scenema/core";

export interface ActorbleActions {
  moveTo(target: TargetLike, options?: MoveOptions): Promise<void>;
  click(target: TargetLike): Promise<void>;
  typeInto(target: TargetLike, value: string): Promise<void>;
}

export class ActorbleActorAdapter implements Actor {
  constructor(private readonly actorble: ActorbleActions) {}

  moveTo(target: Target): Promise<void> {
    return this.actorble.moveTo(css(target));
  }

  restoreCursor(target: Target): Promise<void> {
    return this.actorble.moveTo(css(target), { duration: 0 });
  }

  click(target: Target): Promise<void> {
    return this.actorble.click(css(target));
  }

  type(target: Target, value: string): Promise<void> {
    return this.actorble.typeInto(css(target), value);
  }
}
