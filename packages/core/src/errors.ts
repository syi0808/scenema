import type { ScenemaErrorCode } from "./types.js";

export class ScenemaError extends Error {
  readonly code: ScenemaErrorCode;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(code: ScenemaErrorCode, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = "ScenemaError";
    this.code = code;
    this.context = context;
  }
}
