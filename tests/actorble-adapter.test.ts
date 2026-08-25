import { describe, expect, it, vi } from "vitest";

import {
  ActorbleActorAdapter,
  type ActorbleActions,
} from "../packages/scenema/src/actor/actorble-adapter.js";

describe("ActorbleActorAdapter", () => {
  it("maps Scenema CSS targets and actions to Actorble", async () => {
    const actorble: ActorbleActions = {
      moveTo: vi.fn(),
      click: vi.fn(),
      typeInto: vi.fn(),
    };
    const actor = new ActorbleActorAdapter(actorble);

    await actor.moveTo("#create-project");
    await actor.restoreCursor("#create-project");
    await actor.click("#create-project");
    await actor.type("#project-name", "Launch workspace");

    const target = { kind: "css", selector: "#create-project" };
    expect(actorble.moveTo).toHaveBeenCalledWith(target);
    expect(actorble.moveTo).toHaveBeenCalledWith(target, { duration: 0 });
    expect(actorble.click).toHaveBeenCalledWith(target);
    expect(actorble.typeInto).toHaveBeenCalledWith(
      { kind: "css", selector: "#project-name" },
      "Launch workspace",
    );
  });
});
