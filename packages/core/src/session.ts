import { ScenemaError } from "./errors.js";
import type { Durability, PendingOperationStatus, ScenarioSession } from "./types.js";

const durabilities: readonly Durability[] = ["replay-safe", "at-most-once", "reconcile"];
const pendingStatuses: readonly PendingOperationStatus[] = ["prepared", "performed"];

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

  if (!isRecord(value) || !isRecord(value.position)) {
    throw invalidSession("Session must be an object with a position.");
  }
  if (
    value.schemaVersion !== 2 ||
    !isString(value.id) ||
    !isString(value.scenarioId) ||
    !isPositiveInteger(value.scenarioVersion) ||
    !isString(value.position.stepId) ||
    !isNonNegativeInteger(value.position.operationIndex) ||
    !Array.isArray(value.completedOperations) ||
    !value.completedOperations.every(isString) ||
    !isNonNegativeInteger(value.revision) ||
    !isFiniteNumber(value.updatedAt)
  ) {
    throw invalidSession("Session has an invalid shape.");
  }

  if (value.pendingOperation !== undefined) {
    if (!isRecord(value.pendingOperation)) {
      throw invalidSession("Pending operation must be an object.");
    }
    const pending = value.pendingOperation;
    if (
      !isString(pending.address) ||
      !isString(pending.kind) ||
      !durabilities.includes(pending.durability as Durability) ||
      !pendingStatuses.includes(pending.status as PendingOperationStatus) ||
      !isFiniteNumber(pending.startedAt) ||
      (pending.timeout !== undefined && (!isFiniteNumber(pending.timeout) || pending.timeout < 0))
    ) {
      throw invalidSession("Pending operation has an invalid shape.");
    }
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
