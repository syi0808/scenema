import { ScenemaError } from "./errors.js";
import type { ScenarioSession, SessionPhase, TransitionStatus } from "./types.js";

const phases: readonly SessionPhase[] = ["enter", "present", "commit", "transition", "complete"];
const transitionStatuses: readonly TransitionStatus[] = ["prepared", "triggered", "arrived"];

export function serializeSession(session: ScenarioSession): string {
  return JSON.stringify(session);
}

export function deserializeSession(serialized: string): ScenarioSession {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch (cause) {
    throw invalidSession("Session is not valid JSON.", cause);
  }

  if (!isRecord(value)) throw invalidSession("Session must be an object.");
  if (
    value.schemaVersion !== 1 ||
    !isString(value.id) ||
    !isString(value.scenarioId) ||
    !isPositiveInteger(value.scenarioVersion) ||
    !isString(value.sceneId) ||
    !isString(value.stepId) ||
    !phases.includes(value.phase as SessionPhase) ||
    !isNonNegativeInteger(value.revision) ||
    !isFiniteNumber(value.updatedAt)
  ) {
    throw invalidSession("Session has an invalid shape.");
  }

  if (value.transition !== undefined) {
    if (!isRecord(value.transition)) throw invalidSession("Transition must be an object.");
    const transition = value.transition;
    if (
      !isString(transition.id) ||
      !isString(transition.fromScene) ||
      !isString(transition.fromStep) ||
      !isString(transition.toScene) ||
      !transitionStatuses.includes(transition.status as TransitionStatus) ||
      !isFiniteNumber(transition.startedAt) ||
      !isFiniteNumber(transition.timeout) ||
      transition.timeout < 0
    ) {
      throw invalidSession("Transition has an invalid shape.");
    }
  }
  if ((value.phase === "transition") !== (value.transition !== undefined)) {
    throw invalidSession("Transition checkpoint does not match the session phase.");
  }

  return value as unknown as ScenarioSession;
}

function invalidSession(message: string, cause?: unknown): ScenemaError {
  const error = new ScenemaError("INVALID_SESSION_STATE", message);
  if (cause !== undefined) Object.assign(error, { cause });
  return error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}
