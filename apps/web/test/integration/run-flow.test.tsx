// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App.js";
import {
  clarificationResponse as makeClarificationResponse,
  jsonResponse,
  okResponse,
} from "../helpers/responses.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("korisnički tok", () => {
  it("zadržava profil, postavlja dopunu i prikazuje citat nakon nastavka istog izvršavanja", async () => {
    const clarification = {
      runId: "run-1",
      status: "needs_clarification",
      stage: "awaiting_input",
      profile: {
        age: 62,
        provenance: { age: { origin: "initial_input", round: 0 } },
      },
      derived: [],
      results: [],
      excludedTrials: [],
      explanation: "Nedostaje podatak.",
      question: {
        field: "insulin_last_3_months",
        text: "Da li je osoba koristila insulin?",
        options: ["Da", "Ne"],
        trialsResolved: ["T-A"],
      },
      reason: null,
      error: null,
      meta: {
        modelId: "mock",
        providerId: "mock",
        modelAttempts: 1,
        dataSnapshotDate: null,
        dataOrigin: "Sintetički primeri",
        dataSynthetic: true,
        promptVersion: "demo.v1",
        schemaVersion: "2.0.0",
        dataVersion: "synthetic-trials-v1",
        durationMs: 1,
        modelCalls: 1,
        toolCalls: 0,
        tokens: null,
        demoMode: true,
      },
    };
    const completed = {
      ...clarification,
      status: "ok",
      stage: "completed",
      question: null,
      explanation: "Preliminarna provera; lekar donosi odluku.",
      profile: {
        age: 62,
        insulin_last_3_months: false,
        provenance: {
          age: { origin: "initial_input", round: 0 },
          insulin_last_3_months: { origin: "answer", round: 1 },
        },
      },
      results: [
        {
          trialId: "T-A",
          title: "Sintetička studija T-A",
          verdict: "candidate",
          overallStatus: null,
          phase: null,
          criteria: [
            {
              id: "T-A#inc-1",
              text: "Uzrast od 18 do 75 godina.",
              status: "met",
              observedValue: 62,
              observedUnit: "years",
              observedOrigin: "profile",
              sourceId: "T-A#inc-1",
              citation: {
                sourceId: "T-A#inc-1",
                quote: "Uzrast od 18 do 75 godina.",
              },
            },
          ],
        },
      ],
    };
    const hypothetical = {
      ...completed,
      explanation: "Hipotetička izmena prikazana odvojeno.",
      profile: {
        ...completed.profile,
        hba1c: { value: 9, unit: "%" },
        provenance: {
          ...completed.profile.provenance,
          hba1c: { origin: "hypothesis", round: 1 },
        },
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(clarification))
      .mockResolvedValueOnce(jsonResponse(completed))
      .mockResolvedValueOnce(jsonResponse(hypothetical));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    const profile = "Sintetički profil 62 godine";
    fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
      target: { value: profile },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );
    await screen.findByRole("heading", {
      level: 2,
      name: "Potrebna je dopuna",
    });
    expect(
      (screen.getByLabelText("Opis profila ili pitanje") as HTMLTextAreaElement)
        .value,
    ).toBe(profile);

    fireEvent.click(screen.getByRole("button", { name: "Ne" }));
    expect(
      await screen.findByText("Uzrast od 18 do 75 godina.", { selector: "q" }),
    ).toBeTruthy();
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/runs/run-1/answer");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({ answer: "Ne" }),
    });
    expect(
      screen.getByText("Odgovor je sačuvan · ista provera je nastavljena"),
    ).toBeTruthy();

    fireEvent.change(
      screen.getByLabelText("Unesite samo hipotetičku izmenu profila"),
      { target: { value: "A šta ako je HbA1c 9,0%?" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Ponovi proveru" }));
    await screen.findByText("Hipotetička izmena prikazana odvojeno.");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/runs/run-1/hypothesis");
  });

  it("šalje slobodan odgovor samo kada ima tekst", async () => {
    const clarification = makeClarificationResponse();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          ...clarification,
          question: { ...clarification.question, options: [] },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(okResponse()));
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
    expect(
      screen.queryByRole("group", { name: "Ponuđeni odgovori" }),
    ).toBeNull();
    const submit = screen.getByRole("button", { name: "Pošalji dopunu" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(
      screen.getByLabelText("Da li je osoba koristila insulin?"),
      { target: { value: "10 godina" } },
    );
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submit);

    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({ answer: "10 godina" }),
    });
  });

  it("ignoriše dupli klik na ponuđeni odgovor dok se zahtev obrađuje", async () => {
    let resolveAnswer: (response: Response) => void = () => {};
    const pendingAnswer = new Promise<Response>((resolve) => {
      resolveAnswer = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(makeClarificationResponse()))
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
    const answer = screen.getByRole("button", { name: "Ne" });
    fireEvent.click(answer);
    fireEvent.click(answer);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    resolveAnswer(jsonResponse(okResponse()));
    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });
  });

  it("vraća izbor dugmeta kada zahtev za dopunu ne uspe", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(makeClarificationResponse()))
      .mockRejectedValueOnce(new Error("offline"));
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
    await screen.findByRole("alert");

    const answer = screen.getByRole("button", { name: "Ne" });
    await waitFor(() => {
      expect(answer.getAttribute("aria-pressed")).toBe("false");
    });
    expect((answer as HTMLButtonElement).disabled).toBe(false);
  });
});
