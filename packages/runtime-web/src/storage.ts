import {
  deserializeSession,
  serializeSession,
  type ScenarioSession,
  type SessionStore,
} from "@scenema/core";

export const ACTIVE_SESSION_KEY = "__scenema__:v1:active-session";
export const SESSION_KEY_PREFIX = "__scenema__:v1:session:";

export class LocalStorageSessionStore implements SessionStore {
  constructor(
    private readonly storage: Storage,
    private readonly prefix = SESSION_KEY_PREFIX,
  ) {}

  read(id: string): ScenarioSession | null {
    const serialized = this.storage.getItem(this.key(id));
    return serialized === null ? null : deserializeSession(serialized);
  }

  write(session: ScenarioSession): void {
    this.storage.setItem(this.key(session.id), serializeSession(session));
  }

  remove(id: string): void {
    this.storage.removeItem(this.key(id));
  }

  private key(id: string): string {
    return `${this.prefix}${id}`;
  }
}

export class ActiveSessionPointer {
  constructor(
    private readonly storage: Storage,
    private readonly key = ACTIVE_SESSION_KEY,
  ) {}

  get(): string | null {
    return this.storage.getItem(this.key);
  }

  set(id: string): void {
    this.storage.setItem(this.key, id);
  }

  clear(): void {
    this.storage.removeItem(this.key);
  }
}

export function createLocalStorageSessionStore(
  storage: Storage = window.localStorage,
): SessionStore {
  return new LocalStorageSessionStore(storage);
}

export function createActiveSessionPointer(
  storage: Storage = window.sessionStorage,
): ActiveSessionPointer {
  return new ActiveSessionPointer(storage);
}
