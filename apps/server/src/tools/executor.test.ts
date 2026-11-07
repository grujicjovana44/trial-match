import { describe, expect, it } from "vitest";
import { ToolExecutor } from "./executor.js";

describe("dozvoljeni alati", () => {
  it("odbija nepoznat alat pre izvršavanja", async () => {
    const tools = new ToolExecutor(10, 2000, () => []);
    await expect(tools.execute("shell", {})).rejects.toMatchObject({
      category: "unknown_tool",
    });
    expect(tools.callCount).toBe(0);
  });
});
