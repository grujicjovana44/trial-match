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
import { createApp } from "../../../server/src/api/app.js";
import { parseConfig } from "../../../server/src/config/index.js";
import { TrialSchema } from "../../../../packages/shared/src/index.js";

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

  it("prikazuje MOCK API rezultate za sva četiri operatora i njihove granice", async () => {
    const trialId = "T-OPERATOR-BOUNDARY";
    const operatorCases = [
      { kind: "inclusion", operator: "lt", threshold: 10 },
      { kind: "inclusion", operator: "lte", threshold: 10 },
      { kind: "inclusion", operator: "gt", threshold: 30 },
      { kind: "inclusion", operator: "gte", threshold: 30 },
      { kind: "exclusion", operator: "lt", threshold: 10 },
      { kind: "exclusion", operator: "lte", threshold: 10 },
      { kind: "exclusion", operator: "gt", threshold: 30 },
      { kind: "exclusion", operator: "gte", threshold: 30 },
    ] as const;
    const criteria = operatorCases.map((item, index) => {
      const operatorText = {
        lt: "<",
        lte: "<=",
        gt: ">",
        gte: ">=",
      }[item.operator];
      const text = `Age ${operatorText} ${item.threshold} years.`;
      return {
        id: `${trialId}#${item.kind === "inclusion" ? "inc" : "exc"}-${index + 1}`,
        trialId,
        kind: item.kind,
        field: "age",
        operator: item.operator,
        value: item.threshold,
        unit: "years",
        checkability: "auto",
        origin: "compiled_reviewed",
        text,
        sourceId: `${trialId}#unsplit-1`,
        sourceQuote: text,
      };
    });
    const trial = TrialSchema.parse({
      trialId,
      title: "Synthetic operator-boundary fixture",
      conditions: ["dijabetes tip 2"],
      overallStatus: "SINTETIČKI PRIMER",
      phase: "Nije primenljivo",
      locations: [],
      eligibilityText: criteria
        .map((criterion) => criterion.sourceQuote)
        .join("\n"),
      dataVersion: "synthetic-operator-boundaries-v1",
      criteria,
    });
    const app = createApp({
      config: parseConfig({ NODE_ENV: "test", DEMO_MODE: "true" }),
      serviceOptions: {
        trials: [trial],
        manifest: {
          name: "Synthetic operator boundary test",
          version: "synthetic-operator-boundaries-v1",
          date: null,
          origin: "Privremeni podaci definisani isključivo u testu.",
          synthetic: true,
          license: "Nije primenljivo na sintetičke testne podatke.",
          transformations: "Privremeni podaci za proveru matcher-a i UI-ja.",
          limitations: ["Nije stvarna studija ni medicinski kriterijum."],
        },
      },
    });
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const response = await app.inject({
          method: "POST",
          url: "/api/runs",
          payload: JSON.parse(String(init?.body)),
        });
        return jsonResponse(response.json(), response.statusCode);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      render(<App />);
      fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
        target: {
          value: "Muškarac, 10 godina, dijabetes tip 2.",
        },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Proveri kriterijume" }),
      );
      await screen.findByRole("heading", {
        name: "Isključene studije i razlozi",
      });

      const expectedAtTen = [
        "not_met",
        "met",
        "not_met",
        "not_met",
        "met",
        "not_met",
        "met",
        "met",
      ];
      const rows = document.querySelectorAll(".trial-card .criterion");
      expect(rows).toHaveLength(operatorCases.length);
      for (const [index, item] of operatorCases.entries()) {
        const row = rows[index] as HTMLElement;
        const symbol = {
          lt: "<",
          lte: "<=",
          gt: ">",
          gte: ">=",
        }[item.operator];
        expect(row.querySelector(".criterion-text")?.textContent).toContain(
          `${symbol} ${item.threshold}`,
        );
        expect(row.querySelector(".criterion-status")?.textContent).toContain(
          expectedAtTen[index] === "met" ? "Ispunjen" : "Nije ispunjen",
        );
        expect(row.querySelector(".criterion-evidence")?.textContent).toContain(
          "10 years",
        );
        expect(row.querySelector("blockquote")?.textContent).toBe(
          criteria[index]!.sourceQuote,
        );
      }

      for (const age of [9, 10, 11, 29, 30, 31]) {
        const response = await app.inject({
          method: "POST",
          url: "/api/runs",
          payload: {
            profileText: `Muškarac, ${age} godina, dijabetes tip 2.`,
          },
        });
        expect(response.statusCode, response.body).toBe(200);
        const body = response.json();
        const result = [...body.results, ...body.excludedTrials].find(
          (item: { trialId: string }) => item.trialId === trialId,
        );
        expect(result).toBeDefined();
        for (const [index, item] of operatorCases.entries()) {
          const matches =
            item.operator === "lt"
              ? age < item.threshold
              : item.operator === "lte"
                ? age <= item.threshold
                : item.operator === "gt"
                  ? age > item.threshold
                  : age >= item.threshold;
          const isMet = item.kind === "inclusion" ? matches : !matches;
          expect(result.criteria[index].status).toBe(isMet ? "met" : "not_met");
        }
      }
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
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
    expect(screen.getByText("Isključene studije i razlozi")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Studija 1" })).toBeTruthy();
    expect(screen.getByText("Uslov 2")).toBeTruthy();
    expect(screen.getByText("Citat 2 za T-1")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Šta ako?" })).toBeTruthy();
    expect(document.querySelectorAll("article")).toHaveLength(1);
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
