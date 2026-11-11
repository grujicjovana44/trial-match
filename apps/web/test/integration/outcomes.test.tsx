// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App.js";
import {
  jsonResponse,
  noMatchResponse,
  notInSourcesResponse,
  okResponse,
  rejectedResponse,
} from "../helpers/responses.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ishod ok", () => {
  it("prikazuje profil, pregled i studije bez internih naziva", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(okResponse())),
    );
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
    expect(
      screen.getByText("Sintetički profil", { selector: ".source-text" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Pregled studija" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Studija 1" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Studija 2" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Studija 3" })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(
      /\b(?:ok|candidate|needs_clarification)\b/,
    );
  });

  it("označava rezultat hipotetičke izmene i prazni obrazac posle uspeha", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(okResponse()))
      .mockResolvedValueOnce(
        jsonResponse(
          okResponse({ explanation: "Hipotetička izmena prikazana odvojeno." }),
        ),
      );
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
    const hypothesis = screen.getByLabelText(
      "Unesite samo hipotetičku izmenu profila",
    );
    fireEvent.change(hypothesis, {
      target: { value: "A šta ako je HbA1c 9,0%?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ponovi proveru" }));

    await screen.findByText("Rezultat hipotetičke izmene");
    expect(
      screen.getByText("Hipotetička izmena. Ovo nije izvorni profil."),
    ).toBeTruthy();
    expect(screen.getByText("Izmena: „A šta ako je HbA1c 9,0%?“")).toBeTruthy();
    expect(
      (
        screen.getByLabelText(
          "Unesite samo hipotetičku izmenu profila",
        ) as HTMLInputElement
      ).value,
    ).toBe("");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/runs/run-1/hypothesis");
  });
});

describe("obrazac profila", () => {
  it("prikazuje prazno polje, greške i zadržava unos duži od granice", () => {
    render(<App />);
    const field = screen.getByLabelText(
      "Opis profila ili pitanje",
    ) as HTMLTextAreaElement;
    const submit = screen.getByRole("button", {
      name: "Proveri kriterijume",
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(
      screen.getByText(
        "Unesite opis profila ili pitanje da biste pokrenuli proveru. Ne unosite stvarne podatke pacijenata.",
      ),
    ).toBeTruthy();

    fireEvent.change(field, { target: { value: "sintetičko" } });
    fireEvent.change(field, { target: { value: "" } });
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(
      screen.getByText("Polje je prazno. Unesite opis profila ili pitanje."),
    ).toBeTruthy();

    const longText = "x".repeat(4005);
    fireEvent.change(field, { target: { value: longText } });
    expect(field.value).toHaveLength(4005);
    expect(screen.getByText("4005/4000 znakova")).toBeTruthy();
    expect(
      screen.getByText(/Unos je duži od 4000 znakova za 5\./),
    ).toBeTruthy();
    expect(submit.disabled).toBe(true);

    fireEvent.change(field, { target: { value: "ispravan sintetički unos" } });
    expect(submit.disabled).toBe(false);
  });
});

describe("početni ekran posle resetovanja", () => {
  it("briše unos, rezultat i vraća fokus na profil", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(okResponse())),
    );
    render(<App />);
    expect(screen.queryByRole("button", { name: "Počni iznova" })).toBeNull();
    const field = screen.getByLabelText("Opis profila ili pitanje");
    fireEvent.change(field, { target: { value: "Sintetički profil" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );
    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });
    fireEvent.click(screen.getByRole("button", { name: "Počni iznova" }));

    expect(
      screen.queryByRole("heading", {
        level: 2,
        name: "Preliminarna provera završena",
      }),
    ).toBeNull();
    expect((field as HTMLTextAreaElement).value).toBe("");
    expect(document.activeElement).toBe(field);
    expect(screen.queryByRole("button", { name: "Počni iznova" })).toBeNull();
  });
});

describe("ishodi bez studija", () => {
  it("objašnjava kada nijedna studija ne odgovara i dozvoljava hipotezu", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(noMatchResponse())),
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
      target: { value: "Sintetički profil" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );
    await screen.findByRole("heading", {
      level: 2,
      name: "Nijedna studija iz skupa ne odgovara profilu",
    });

    expect(
      screen.getByText(
        "Prema unetim podacima profil ne ispunjava kriterijume nijedne studije iz dostupnog skupa. TrialMatch ne predlaže studije van tog skupa i ne nagađa.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Razlozi po studiji trenutno nisu deo odgovora."),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Šta ako?" })).toBeTruthy();
    expect(document.querySelectorAll("article")).toHaveLength(0);
  });

  it("ne prikazuje profil ni hipotezu kada informacija nije u izvorima", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(notInSourcesResponse())),
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
      target: { value: "Sintetičko pitanje" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );
    await screen.findByRole("heading", {
      level: 2,
      name: "Tražena informacija nije u dostupnim izvorima",
    });

    expect(
      screen.getByText(
        "Odgovor na ovo pitanje ne nalazi se u dostupnim izvorima studija. TrialMatch ne odgovara iz opšteg znanja.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Šta ako?" })).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Prepoznati podaci iz unosa" }),
    ).toBeNull();
    expect(screen.queryByText("Kandidat za dalju proveru")).toBeNull();
    expect(document.querySelectorAll("article")).toHaveLength(0);
  });

  it("objašnjava odbijen zahtev bez profila ili studija", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(rejectedResponse())),
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
      target: { value: "Pitanje van podržanog obima" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );
    await screen.findByRole("heading", {
      level: 2,
      name: "Zahtev nije podržan",
    });

    expect(
      screen.getByText(
        "TrialMatch ne postavlja dijagnozu, ne daje savet o lečenju i ne odlučuje o uključivanju u studiju.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Šta ako?" })).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Prepoznati podaci iz unosa" }),
    ).toBeNull();
    expect(screen.queryByText("Kandidat za dalju proveru")).toBeNull();
    expect(document.querySelectorAll("article")).toHaveLength(0);
  });
});
