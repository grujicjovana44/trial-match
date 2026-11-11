// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App.js";
import { jsonResponse, metaOf, okResponse } from "./helpers/responses.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function enterProfile() {
  fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
    target: { value: "Sintetički profil" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Proveri kriterijume" }));
}

function submitButtonNames() {
  expect(screen.getByLabelText("Opis profila ili pitanje")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Proveri kriterijume" }),
  ).toBeTruthy();
}

describe("pristupačnost i fokus", () => {
  it("fokusira naslov rezultata po uspešnom odgovoru", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(okResponse())),
    );
    render(<App />);
    expect(
      document.querySelector(".results-region[aria-live='polite']"),
    ).toBeTruthy();
    submitButtonNames();
    enterProfile();

    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole("heading", { name: "Šta ako?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ponovi proveru" })).toBeTruthy();
  });

  it("fokusira dopunu kada je potreban odgovor", async () => {
    const { clarificationResponse } = await import("./helpers/responses.js");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(clarificationResponse())),
    );
    render(<App />);
    enterProfile();

    const heading = await screen.findByRole("heading", {
      level: 3,
      name: "Potrebna dopuna",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole("button", { name: "Ne" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pošalji dopunu" })).toBeTruthy();
  });

  it("fokusira panel greške", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<App />);
    enterProfile();
    const panel = await screen.findByRole("alert");
    await waitFor(() => expect(document.activeElement).toBe(panel));
  });

  it("keeps the processing announcement and stable action names", async () => {
    const pending = new Promise<Response>(() => {});
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending));
    render(<App />);
    enterProfile();
    expect(screen.getByRole("status").textContent).toContain(
      "Provera je u toku…",
    );
    expect(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    ).toBeTruthy();
  });
});

describe("responsivnost i smanjen pokret", () => {
  it("contains the required narrow-screen, desktop, and reduced-motion rules", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(
      `${process.cwd()}/apps/web/src/styles.css`,
      "utf8",
    );
    expect(css).toContain("@media (max-width: 560px)");
    expect(css).toContain("@media (min-width: 720px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("min-width: 320px");
    const pixelWidths = [...css.matchAll(/^\s*(?:min-)?width:\s*(\d+)px/gm)];
    expect(pixelWidths.every((match) => Number(match[1]) <= 320)).toBe(true);
  });
});

describe("bez internih oznaka u prikazu", () => {
  const responseFactories = [
    ["ok", okResponse],
    [
      "clarification",
      async () =>
        (await import("./helpers/responses.js")).clarificationResponse(),
    ],
    [
      "no match",
      async () => (await import("./helpers/responses.js")).noMatchResponse(),
    ],
    [
      "not in sources",
      async () =>
        (await import("./helpers/responses.js")).notInSourcesResponse(),
    ],
    [
      "rejected",
      async () => (await import("./helpers/responses.js")).rejectedResponse(),
    ],
    [
      "model timeout",
      async () =>
        (await import("./helpers/responses.js")).runErrorResponse(
          "model_timeout",
          true,
        ),
    ],
    [
      "tool failure",
      async () =>
        (await import("./helpers/responses.js")).runErrorResponse(
          "tool_error",
          false,
        ),
    ],
  ] as const;
  const modes = [
    ["demo", metaOf()],
    ["live", metaOf({ demoMode: false, modelId: "model-x" })],
  ] as const;
  const internalNames =
    /\b(?:needs_clarification|insufficient_evidence|no_matching_trial|not_in_sources|rejected|candidate|pending|excluded|not_met|met|unknown|true|false|null|undefined|model_timeout|tool_error)\b/i;

  for (const [responseName, factory] of responseFactories) {
    for (const [modeName, meta] of modes) {
      it(`does not expose internal names for ${responseName} in ${modeName} mode`, async () => {
        const response = await factory();
        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValue(jsonResponse({ ...response, meta })),
        );
        render(<App />);
        enterProfile();
        await waitFor(() =>
          expect(
            document.querySelector(".results-panel, .error-panel"),
          ).not.toBeNull(),
        );

        const visibleText = document.querySelector("main")?.textContent ?? "";
        expect(visibleText).not.toMatch(internalNames);
        if (modeName === "live") expect(visibleText).not.toContain("DEMO");
      });
    }
  }

  it("does not expose internal names when fetch is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<App />);
    enterProfile();
    await screen.findByRole("alert");
    expect(document.querySelector("main")?.textContent ?? "").not.toMatch(
      internalNames,
    );
  });
});
