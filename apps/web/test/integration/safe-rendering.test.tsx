// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App.js";
import {
  clarificationResponse,
  criterionOf,
  jsonResponse,
  metaOf,
  okResponse,
  runErrorResponse,
  trialsOf,
} from "../helpers/responses.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (window as unknown as Record<string, unknown>).__xss;
});

const payload =
  '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script><b>x</b>';

function startProfile() {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
    target: { value: "Sintetički profil" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Proveri kriterijume" }));
}

function assertPayloadIsText() {
  const main = document.querySelector("main");
  expect(main?.querySelector("script")).toBeNull();
  expect(main?.querySelector("img")).toBeNull();
  expect(main?.querySelector("b")).toBeNull();
  expect((window as unknown as Record<string, unknown>).__xss).toBeUndefined();
  expect(main?.textContent).toContain(payload);
}

describe("bezbedan prikaz teksta", () => {
  it("renders explanation, study title, criterion text and quote as literal text", async () => {
    const trial = trialsOf(1)[0]!;
    const criterion = criterionOf(trial.trialId, 1, "met", 62);
    const response = okResponse({
      explanation: payload,
      results: [
        {
          ...trial,
          title: payload,
          criteria: [
            {
              ...criterion,
              text: payload,
              citation: { ...criterion.citation, quote: payload },
            },
          ],
        },
      ],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(response)));
    startProfile();
    await screen.findByRole("heading", { level: 3, name: payload });

    assertPayloadIsText();
    expect(screen.getAllByText(payload).length).toBeGreaterThanOrEqual(3);
  });

  it("renders question text and choices as literal text", async () => {
    const response = clarificationResponse({
      question: {
        field: "insulin_last_3_months",
        text: payload,
        options: [payload],
        trialsResolved: [],
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(response)));
    startProfile();
    await screen.findByRole("button", { name: payload });

    assertPayloadIsText();
    expect(
      screen.getByText(payload, { selector: "label" }).textContent,
    ).toContain(payload);
  });

  it("renders an unknown server message as literal text", async () => {
    const response = runErrorResponse("new_unknown_category", true, {
      meta: metaOf(),
      error: {
        category: "new_unknown_category",
        message: payload,
        retryable: true,
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(response)));
    startProfile();
    await screen.findByRole("alert");

    assertPayloadIsText();
    expect(document.querySelector(".server-message")?.textContent).toContain(
      payload,
    );
  });

  it("does not use unsafe HTML insertion APIs in web source", () => {
    const sourceRoot = join(process.cwd(), "apps", "web", "src");
    const sourceFiles: string[] = [];
    function collect(directory: string) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) collect(path);
        else if (/\.tsx?$/.test(entry.name)) sourceFiles.push(path);
      }
    }
    collect(sourceRoot);
    const unsafe = sourceFiles.filter((path) =>
      /dangerouslySetInnerHTML|innerHTML|insertAdjacentHTML/.test(
        readFileSync(path, "utf8"),
      ),
    );
    expect(unsafe).toEqual([]);
  });
});
