import { describe, expect, it } from "vitest";
import type { RunResponse } from "../../../../packages/shared/src/index.js";
import { Operations } from "./operations.js";

const KEY = "11111111-1111-4111-8111-111111111111";
// The store only clones and returns the value, so a minimal stand-in is enough.
const response = (tag: string) =>
  ({ explanation: tag }) as unknown as RunResponse;

describe("Operations idempotencija", () => {
  it("unutar TTL-a vraća isti odgovor bez ponovnog izvršavanja", async () => {
    let now = 1000;
    const ops = new Operations(() => now);
    let runs = 0;
    const action = async () => response(`run-${++runs}`);
    const first = await ops.execute(KEY, "/p", { a: 1 }, undefined, action);
    now += 59_000;
    const second = await ops.execute(KEY, "/p", { a: 1 }, undefined, action);
    expect(runs).toBe(1);
    expect(second).toEqual(first);
  });

  it("nakon TTL-a ponovo izvršava radnju i ne vraća stari odgovor", async () => {
    let now = 1000;
    const ops = new Operations(() => now);
    let runs = 0;
    const action = async () => response(`run-${++runs}`);
    const first = await ops.execute(KEY, "/p", { a: 1 }, undefined, action);
    now += 60_000;
    const second = await ops.execute(KEY, "/p", { a: 1 }, undefined, action);
    expect(runs).toBe(2);
    expect(first.explanation).toBe("run-1");
    expect(second.explanation).toBe("run-2");
  });

  it("aktivan duplikat deli jedno izvršavanje čak i posle TTL-a", async () => {
    let now = 1000;
    const ops = new Operations(() => now);
    let runs = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const action = async () => {
      runs += 1;
      await gate;
      return response("shared");
    };
    const a = ops.execute(KEY, "/p", { a: 1 }, undefined, action);
    now += 120_000;
    const b = ops.execute(KEY, "/p", { a: 1 }, undefined, action);
    release();
    expect(await a).toEqual(await b);
    expect(runs).toBe(1);
  });

  it("isti ključ sa drugim potpisom ostaje invalid_request", async () => {
    const ops = new Operations(() => 0);
    await ops.execute(KEY, "/p", { a: 1 }, undefined, async () =>
      response("x"),
    );
    expect(() =>
      ops.execute(KEY, "/p", { a: 2 }, undefined, async () => response("y")),
    ).toThrow();
  });
});
