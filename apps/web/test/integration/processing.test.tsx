// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App.js";
import { copy } from "../../src/copy.js";
import {
  clarificationResponse,
  jsonResponse,
  okResponse,
} from "../helpers/responses.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("stanje obrade", () => {
  it("najavljuje dugo čekanje, sprečava duplo slanje i uklanja red po odgovoru", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let resolveFetch: (response: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(pending);
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
      target: { value: "Sintetički profil" },
    });
    const submit = screen.getByRole("button", { name: "Proveri kriterijume" });
    fireEvent.click(submit);

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Provera je u toku…");
    expect(status.querySelector(".pulse-dot")).toBeNull();
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(submit.textContent).toBe("Proveri kriterijume");
    fireEvent.click(submit);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(status.textContent).toContain(copy.processing.slow);

    await act(async () => {
      resolveFetch(jsonResponse(okResponse()));
    });
    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("marks the previous result inert while an answer is pending, then restores it", async () => {
    let resolveAnswer: (response: Response) => void = () => {};
    const pendingAnswer = new Promise<Response>((resolve) => {
      resolveAnswer = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(clarificationResponse()))
      .mockReturnValueOnce(pendingAnswer);
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
      target: { value: "Sintetički profil" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );
    await screen.findByRole("heading", {
      level: 2,
      name: "Potrebna je dopuna",
    });

    fireEvent.click(screen.getByRole("button", { name: "Ne" }));
    const panel = document.querySelector(".results-panel");
    expect(panel?.hasAttribute("inert")).toBe(true);
    expect(panel?.getAttribute("aria-busy")).toBe("true");
    expect(panel?.textContent).toContain(
      "Prethodni rezultat. Nova provera je u toku.",
    );
    const answer = screen.getByRole("button", { name: "Ne" });
    expect(answer.getAttribute("aria-pressed")).toBe("true");
    expect((answer as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      resolveAnswer(jsonResponse(okResponse()));
    });
    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });
    expect(
      document.querySelector(".results-panel")?.hasAttribute("inert"),
    ).toBe(false);
    expect(document.querySelector(".stale-banner")).toBeNull();
  });

  it("hides a confirmed result as soon as a new profile check starts", async () => {
    let resolveSecond: (response: Response) => void = () => {};
    const pendingSecond = new Promise<Response>((resolve) => {
      resolveSecond = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(okResponse()))
      .mockReturnValueOnce(pendingSecond);
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
      target: { value: "Sintetički profil" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );
    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });

    fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
      target: { value: "Drugi sintetički profil" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );
    expect(
      screen.queryByRole("heading", {
        level: 2,
        name: "Preliminarna provera završena",
      }),
    ).toBeNull();
    await act(async () => {
      resolveSecond(jsonResponse(okResponse()));
    });
    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });
  });
});
