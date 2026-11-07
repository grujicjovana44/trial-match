import { describe, expect, it } from "vitest";
import { loadCases } from "./cases.js";

describe("fiksni evaluacioni slučajevi", () => {
  it("učitava tačno 16 slučajeva sa stabilnim režimima", async () => {
    const cases = await loadCases();
    expect(cases).toHaveLength(16);
    expect(cases.find((item) => item.case_id === "EV-07")?.execution_mode).toBe(
      "real_model",
    );
    expect(cases.find((item) => item.case_id === "EV-11")?.execution_mode).toBe(
      "offline",
    );
    expect(cases.find((item) => item.case_id === "EV-16")?.execution_mode).toBe(
      "simulated_fault",
    );
  });
});
