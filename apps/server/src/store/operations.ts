import { createHash } from "node:crypto";
import { z } from "zod";
import { HttpError } from "../service/trialmatch.js";
import type { RunResponse } from "../../../../packages/shared/src/index.js";

const invalid = (category: string) =>
  new HttpError(400, {
    category,
    message: "Zahtev nije dostupan u trenutnom stanju provere.",
    retryable: false,
  });

/** Process-local operation identities. Active entries are never evicted. */
export class Operations {
  private readonly entries = new Map<
    string,
    {
      signature: string;
      pending: Promise<RunResponse>;
      expires: number;
      active: boolean;
    }
  >();
  private readonly locks = new Map<string, Promise<RunResponse>>();
  private readonly revisions = new Map<string, number>();
  constructor(
    private readonly now: () => number = Date.now,
    private readonly capacity = 1000,
  ) {}

  execute(
    key: unknown,
    path: string,
    body: unknown,
    runId: string | undefined,
    action: () => Promise<RunResponse>,
  ): Promise<RunResponse> {
    let identity: string | undefined;
    if (key !== undefined) {
      const parsed = z.string().uuid().safeParse(key);
      if (!parsed.success) throw invalid("invalid_request");
      identity = parsed.data;
    }
    const signature = createHash("sha256")
      .update(JSON.stringify({ path, body }))
      .digest("hex");
    if (identity) {
      const previous = this.entries.get(identity);
      if (previous) {
        if (previous.signature !== signature) throw invalid("invalid_request");
        return previous.pending.then((response) => structuredClone(response));
      }
      for (const [id, entry] of this.entries)
        if (!entry.active && entry.expires <= this.now())
          this.entries.delete(id);
      if (this.entries.size >= this.capacity)
        throw new HttpError(429, {
          category: "rate_limit_exceeded",
          message: "Sačekajte pre nove provere.",
          retryable: true,
        });
    }
    const revision = runId ? (this.revisions.get(runId) ?? 0) : 0;
    const prior = runId ? this.locks.get(runId) : undefined;
    const pending = (async () => {
      if (prior) await prior.catch(() => undefined);
      if (runId && (this.revisions.get(runId) ?? 0) !== revision)
        throw invalid("invalid_transition");
      const response = await action();
      this.revisions.set(
        response.runId,
        (this.revisions.get(response.runId) ?? 0) + 1,
      );
      return response;
    })();
    if (runId) this.locks.set(runId, pending);
    const entry = {
      signature,
      pending,
      expires: this.now() + 60000,
      active: true,
    };
    if (identity) this.entries.set(identity, entry);
    void pending
      .finally(() => {
        entry.active = false;
        if (runId && this.locks.get(runId) === pending)
          this.locks.delete(runId);
      })
      .catch(() => undefined);
    return pending;
  }
}
