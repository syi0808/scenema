import { createActorble, type Actorble, type ActorbleFacadeOptions } from "@actorble/browser";

export type ScenemaActorbleOptions = ActorbleFacadeOptions;

export function createScenemaActorble(
  document: Document,
  options: ScenemaActorbleOptions = {},
): Actorble {
  return createActorble({ ...options, root: options.root ?? document });
}
