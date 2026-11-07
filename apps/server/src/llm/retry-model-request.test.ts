import { describe, expect, it, vi } from "vitest";
import { ModelRequestError, retryModelRequest } from "./generate-structured.js";

describe("ponovni pokušaji mrežnog poziva modela", () => {
  it("ograničava pokušaje i koristi odobrene pauze za timeout/429/5xx", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new ModelRequestError(429))
      .mockRejectedValueOnce(new ModelRequestError(503))
      .mockResolvedValue("uspeh");
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(
      retryModelRequest(request, {
        maxRetries: 2,
        delaysMs: [500, 1500],
        sleep,
      }),
    ).resolves.toBe("uspeh");
    expect(request).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[500], [1500]]);
  });

  it("ne ponavlja neodobrene greške niti prekoračuje broj pokušaja", async () => {
    const request = vi.fn().mockRejectedValue(new ModelRequestError(400));
    await expect(
      retryModelRequest(request, { maxRetries: 2, delaysMs: [500, 1500] }),
    ).rejects.toBeInstanceOf(ModelRequestError);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
