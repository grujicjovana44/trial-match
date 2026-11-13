// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App.js";
import {
  httpErrorBody,
  jsonResponse,
  nonJsonResponse,
  okResponse,
  clarificationResponse,
  runErrorResponse,
} from "../helpers/responses.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function submitProfile() {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
    target: { value: "Sintetički profil" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Proveri kriterijume" }));
}

describe("greške zahteva", () => {
  it("nudi ponovni pokušaj i ponavlja isti zahtev", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(runErrorResponse("tool_error", true)))
      .mockResolvedValueOnce(jsonResponse(okResponse()));
    vi.stubGlobal("fetch", fetchMock);
    submitProfile();

    const panel = await screen.findByRole("alert");
    expect(panel.querySelector("h2")?.textContent).toBe(
      "Provera nije završena",
    );
    expect(screen.getByRole("button", { name: "Pokušaj ponovo" })).toBeTruthy();
    expect(panel.querySelectorAll("button")).toHaveLength(2);
    expect(document.querySelectorAll("article")).toHaveLength(0);
    const firstPath = fetchMock.mock.calls[0]?.[0];
    const firstBody = fetchMock.mock.calls[0]?.[1]?.body;

    fireEvent.click(screen.getByRole("button", { name: "Pokušaj ponovo" }));
    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(firstPath);
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(firstBody);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("maps model timeout to its controlled message", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(runErrorResponse("model_timeout", true)),
        ),
    );
    submitProfile();
    await screen.findByText("Servis nije odgovorio na vreme", {
      selector: "h2",
    });
  });

  it("shows only start over for a non-retryable restart error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(runErrorResponse("question_round_limit", false)),
        ),
    );
    submitProfile();
    const panel = await screen.findByRole("alert");
    expect(panel.textContent).toContain("Dostignut je najveći broj dopuna");
    expect(panel.querySelector("button")?.textContent).toBe("Počni iznova");
    expect(panel.querySelectorAll("button")).toHaveLength(1);
  });

  it("shows no panel actions for an edit-only HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(httpErrorBody("invalid_profile", false), 400),
        ),
    );
    submitProfile();
    const panel = await screen.findByRole("alert");
    expect(panel.textContent).toContain("Unos nije prihvaćen");
    expect(panel.querySelectorAll("button")).toHaveLength(0);
  });

  it("allows retry after a network failure", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(jsonResponse(okResponse()));
    vi.stubGlobal("fetch", fetchMock);
    submitProfile();
    await screen.findByText("Server nije dostupan", { selector: "h2" });

    fireEvent.click(screen.getByRole("button", { name: "Pokušaj ponovo" }));
    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("hides parser details for non-JSON and invalid-schema replies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nonJsonResponse(200)));
    submitProfile();
    const nonJsonPanel = await screen.findByRole("alert");
    expect(nonJsonPanel.textContent).toContain("Odgovor servera nije čitljiv");
    expect(nonJsonPanel.textContent).not.toContain("Unexpected token");

    cleanup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ foo: 1 })));
    submitProfile();
    await screen.findByText("Odgovor servera nije u očekivanom obliku", {
      selector: "h2",
    });
  });

  it("shows an unknown server message as plain text", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(runErrorResponse("citation_validation_failed", true)),
        ),
    );
    submitProfile();
    const panel = await screen.findByRole("alert");
    expect(panel.textContent).toContain("Poruka servera: Poruka servera.");
  });

  it("counts down the Retry-After value and enables retry at zero", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(httpErrorBody("rate_limit_exceeded", false), 429, {
          "retry-after": "3",
        }),
      )
      .mockResolvedValueOnce(jsonResponse(okResponse()));
    vi.stubGlobal("fetch", fetchMock);
    submitProfile();

    const panel = await screen.findByRole("alert");
    const retry = screen.getByRole("button", { name: "Pokušaj ponovo" });
    expect(panel.textContent).toContain("Poslato je previše zahteva");
    expect(panel.textContent).toContain("Možete pokušati ponovo za 3 s.");
    expect((retry as HTMLButtonElement).disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(panel.textContent).toContain("Možete pokušati ponovo.");
    expect((retry as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(retry);
    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });
  });

  it("uses the default wait when Retry-After is absent", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(httpErrorBody("rate_limit_exceeded", false), 429),
        ),
    );
    submitProfile();
    const panel = await screen.findByRole("alert");
    expect(panel.textContent).toContain("Možete pokušati ponovo za 60 s.");
    expect(
      (
        screen.getByRole("button", {
          name: "Pokušaj ponovo",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("keeps a confirmed result after an invalid hypothesis", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(okResponse()))
        .mockResolvedValueOnce(
          jsonResponse(httpErrorBody("ambiguous_hypothesis", false), 400),
        ),
    );
    submitProfile();
    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });
    fireEvent.change(
      screen.getByLabelText("Unesite samo hipotetičku izmenu profila"),
      { target: { value: "Možda drugačije" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Ponovi proveru" }));

    const panel = await screen.findByRole("alert");
    expect(panel.textContent).toContain("Hipotetička izmena nije primenjena");
    expect(panel.textContent).toContain(
      "Ispod je poslednji potvrđeni rezultat ove provere.",
    );
    for (const study of ["Studija 1", "Studija 2", "Studija 3"]) {
      expect(
        screen.getByRole("heading", { level: 3, name: study }),
      ).toBeTruthy();
    }
    expect(
      screen.getByLabelText("Unesite samo hipotetičku izmenu profila"),
    ).toBeTruthy();
  });

  it("clears a clarification when its run has expired", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(clarificationResponse()))
        .mockResolvedValueOnce(
          jsonResponse(httpErrorBody("run_not_found", false), 404),
        ),
    );
    submitProfile();
    await screen.findByRole("heading", {
      level: 2,
      name: "Potrebna je dopuna",
    });
    fireEvent.click(screen.getByRole("button", { name: "Ne" }));

    const panel = await screen.findByRole("alert");
    expect(panel.textContent).toContain("Provera više nije dostupna");
    expect(
      screen.queryByLabelText("Da li je osoba koristila insulin?"),
    ).toBeNull();
    expect(panel.querySelector("button")?.textContent).toBe("Počni iznova");
    expect(screen.queryByRole("button", { name: "Pokušaj ponovo" })).toBeNull();
  });

  it("does not keep trials after a model timeout during a hypothesis", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(okResponse()))
        .mockResolvedValueOnce(
          jsonResponse(runErrorResponse("model_timeout", true)),
        ),
    );
    submitProfile();
    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });
    fireEvent.change(
      screen.getByLabelText("Unesite samo hipotetičku izmenu profila"),
      { target: { value: "A šta ako je HbA1c 9%?" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Ponovi proveru" }));

    await screen.findByText("Servis nije odgovorio na vreme", {
      selector: "h2",
    });
    expect(document.querySelectorAll("article")).toHaveLength(0);
  });

  it("keeps the clarification visible after a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(clarificationResponse()))
        .mockRejectedValueOnce(new Error("offline")),
    );
    submitProfile();
    await screen.findByRole("heading", {
      level: 2,
      name: "Potrebna je dopuna",
    });
    fireEvent.click(screen.getByRole("button", { name: "Ne" }));

    await screen.findByRole("alert");
    expect(
      screen.getByLabelText("Da li je osoba koristila insulin?"),
    ).toBeTruthy();
  });
});
