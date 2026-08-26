import { css, type MoveOptions, type TargetLike } from "@actorble/browser";
import { type Actor, type Target } from "@scenema/core";

export interface ActorbleActions {
  moveTo(target: TargetLike, options?: MoveOptions): Promise<void>;
  click(target: TargetLike): Promise<void>;
  typeInto(target: TargetLike, value: string): Promise<void>;
  destroy?(): void;
}

export class ActorbleActorAdapter implements Actor {
  private actorble: ActorbleActions | undefined;

  constructor(private readonly source: ActorbleActions | (() => ActorbleActions)) {
    if (typeof source !== "function") this.actorble = source;
  }

  destroy(): void {
    this.actorble?.destroy?.();
    this.actorble = undefined;
  }

  moveTo(target: Target): Promise<void> {
    return this.getActorble().moveTo(css(target));
  }

  restoreCursor(target: Target): Promise<void> {
    return this.getActorble().moveTo(css(target), { duration: 0 });
  }

  click(target: Target): Promise<void> {
    return this.getActorble().click(css(target));
  }

  type(target: Target, value: string): Promise<void> {
    return this.getActorble().typeInto(css(target), value);
  }

  private getActorble(): ActorbleActions {
    this.actorble ??= typeof this.source === "function" ? this.source() : this.source;
    return this.actorble;
  }
}
