import { css, type MoveOptions, type TargetLike } from "@actorble/browser";
import { ScenemaError, type Actor, type ResolvedTarget } from "@scenema/core";

export interface ActorbleActions {
  moveTo(target: TargetLike, options?: MoveOptions): Promise<void>;
  click(target: TargetLike): Promise<void>;
  typeInto(target: TargetLike, value: string): Promise<void>;
  press?(key: string): Promise<void>;
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

  moveTo(target: ResolvedTarget): Promise<void> {
    return this.getActorble().moveTo(this.toTargetLike(target, true));
  }

  restoreCursor(target: ResolvedTarget): Promise<void> {
    return this.getActorble().moveTo(this.toTargetLike(target, true), { duration: 0 });
  }

  click(target: ResolvedTarget): Promise<void> {
    return this.getActorble().click(this.toTargetLike(target, false));
  }

  type(target: ResolvedTarget, value: string): Promise<void> {
    return this.getActorble().typeInto(this.toTargetLike(target, false), value);
  }

  press(key: string): Promise<void> {
    const actorble = this.getActorble();
    if (!actorble.press) {
      throw new ScenemaError("TARGET_CAPABILITY_MISMATCH", "Actorble cannot press keys.");
    }
    return actorble.press(key);
  }

  private getActorble(): ActorbleActions {
    this.actorble ??= typeof this.source === "function" ? this.source() : this.source;
    return this.actorble;
  }

  private toTargetLike(target: ResolvedTarget, allowParent: boolean): TargetLike {
    if (typeof target === "string") return css(target);
    if (target.nodeType === 1) return target as Element;
    if (allowParent && target.parentElement) return target.parentElement;
    throw new ScenemaError(
      "TARGET_CAPABILITY_MISMATCH",
      "This operation requires an Element target.",
      { target },
    );
  }
}
