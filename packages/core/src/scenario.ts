import { ScenemaError } from "./errors.js";
import type { ScenarioDefinition } from "./types.js";

export function defineScenario<const T extends ScenarioDefinition>(scenario: T): T {
  if (!scenario.id || !Number.isInteger(scenario.version) || scenario.version < 1) {
    throw new ScenemaError(
      "INVALID_SCENARIO",
      "A scenario needs an id and a positive integer version.",
    );
  }

  const sceneIds = new Set<string>();
  for (const scene of scenario.scenes) {
    if (!scene.id || sceneIds.has(scene.id)) {
      throw new ScenemaError("INVALID_SCENARIO", `Scene id is missing or duplicated: ${scene.id}`);
    }
    sceneIds.add(scene.id);

    const stepIds = new Set<string>();
    for (const step of scene.steps) {
      if (!step.id || stepIds.has(step.id)) {
        throw new ScenemaError(
          "INVALID_SCENARIO",
          `Step id is missing or duplicated in ${scene.id}: ${step.id}`,
        );
      }
      stepIds.add(step.id);
      const needsStepTarget =
        step.enter?.cursor === "move" ||
        (step.commit && "click" in step.commit && step.commit.click === true) ||
        (step.commit && "type" in step.commit && !step.commit.type.target) ||
        step.transition?.trigger.click === true;
      if (needsStepTarget && !step.target) {
        throw new ScenemaError("INVALID_SCENARIO", `Step ${scene.id}/${step.id} needs a target.`);
      }
    }
  }

  for (const scene of scenario.scenes) {
    for (const step of scene.steps) {
      if (step.transition && !sceneIds.has(step.transition.to)) {
        throw new ScenemaError(
          "INVALID_SCENARIO",
          `Transition ${scene.id}/${step.id} points to unknown scene ${step.transition.to}.`,
        );
      }
    }
  }

  return scenario;
}
