import { describe, expect, it } from "vitest";
import { canTransition, transition } from "./state-machine.js";

describe("mašina stanja", () => {
  it("dozvoljava dopunu i hipotezu, ali odbija nevažeće prelaze", () => {
    expect(canTransition("awaiting_input", "ready")).toBe(true);
    expect(canTransition("completed", "received")).toBe(true);
    expect(() => transition("failed", "ready")).toThrow();
  });
});
