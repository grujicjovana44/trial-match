// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrialResult } from "../../../../packages/shared/src/index.js";
import { CriterionRow } from "../../src/components/CriterionRow.js";
import { TrialCard } from "../../src/components/TrialCard.js";
import { TrialOverview } from "../../src/components/TrialOverview.js";
import { criterionOf, trialsOf } from "../helpers/responses.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("red kriterijuma", () => {
  it("prikazuje status, vrednost i citat, a tehnički ID drži van reda kriterijuma", () => {
    const criteria = [
      criterionOf("T-1", 1, "met", 62),
      criterionOf("T-1", 2, "not_met", true),
      criterionOf("T-1", 3, "unknown", null),
    ];
    render(
      <ul>
        {criteria.map((criterion) => (
          <CriterionRow key={criterion.id} criterion={criterion} />
        ))}
      </ul>,
    );

    expect(screen.getByText("Ispunjen")).toBeTruthy();
    expect(screen.getAllByText("prema dostupnim podacima")).toHaveLength(2);
    expect(document.body.textContent).toContain("Vrednost: 62");
    expect(document.body.textContent).toContain("Vrednost: da");
    expect(document.body.textContent).toContain("Vrednost: nije uneto");
    expect(document.querySelector(".criterion")?.textContent).not.toContain(
      "T-1#inc-1",
    );
    expect(screen.getByText("Citat 1 za T-1", { selector: "q" })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(
      /\b(?:met|not_met|true|null)\b/,
    );
  });
});

describe("jedinica i poreklo vrednosti (T220, AC-01)", () => {
  function renderRow(criterion: ReturnType<typeof criterionOf>) {
    render(
      <ul>
        <CriterionRow criterion={criterion} />
      </ul>,
    );
  }

  it("izračunata vrednost ima jedinicu i oznaku „izračunao kod“", () => {
    renderRow({
      ...criterionOf("T-1", 1, "met", 62.11),
      observedUnit: "mL/min/1.73 m²",
      observedOrigin: "derived",
    });
    expect(document.body.textContent).toContain("62,11 mL/min/1.73 m²");
    expect(screen.getByText("izračunao kod")).toBeTruthy();
  });

  it("vrednost iz profila nema oznaku, a „%“ ide bez razmaka", () => {
    renderRow({
      ...criterionOf("T-1", 1, "met", 8.1),
      observedUnit: "%",
      observedOrigin: "profile",
    });
    expect(document.body.textContent).toContain("8,1%");
    expect(screen.queryByText("izračunao kod")).toBeNull();
    expect(document.body.textContent).not.toMatch(
      /Izvedena vrednost|Iz profila|Nepoznato/,
    );
  });

  it("bez vrednosti nema ni jedinice ni oznake", () => {
    renderRow({
      ...criterionOf("T-1", 1, "unknown", null),
      observedUnit: "mL/min/1.73 m²",
      observedOrigin: "derived",
    });
    expect(document.body.textContent).toContain("Vrednost: nije uneto");
    expect(document.body.textContent).not.toContain("mL/min");
    expect(screen.queryByText("izračunao kod")).toBeNull();
  });
});

describe("status regrutacije i faza (T221, AC-01)", () => {
  function renderCard(
    overallStatus: string | null,
    phase: string | null,
  ): void {
    render(
      <TrialCard
        trial={{ ...trialsOf(1)[0]!, overallStatus, phase }}
        index={0}
      />,
    );
  }

  it("poznate vrednosti registra prikazuje srpskim tekstom", () => {
    renderCard("RECRUITING", "PHASE2");
    expect(
      screen.getByText(/Status regrutacije: regrutuje učesnike/),
    ).toBeTruthy();
    expect(document.body.textContent).toContain("Faza: faza 2");
    expect(document.body.textContent).not.toMatch(/RECRUITING|PHASE2/);
  });

  it("više faza spojenih zarezom prevodi pojedinačno", () => {
    renderCard(null, "PHASE1, PHASE2");
    expect(document.body.textContent).toContain("Faza: faza 1, faza 2");
    expect(document.body.textContent).not.toContain("Status regrutacije");
  });

  it("nepoznatu vrednost prikazuje doslovno kao podatak registra", () => {
    renderCard("AVAILABLE", null);
    const value = screen.getByText("AVAILABLE");
    expect(value.className).toBe("mono");
    expect(document.body.textContent).not.toContain("Faza:");
  });

  it("bez oba polja nema reda i nema podrazumevane vrednosti", () => {
    renderCard(null, "  ");
    expect(document.querySelector(".trial-facts")).toBeNull();
    expect(document.body.textContent).not.toMatch(
      /Status regrutacije|Faza:|Nije naveden/,
    );
  });
});

describe("kartica studije", () => {
  it("grupiše kriterijume po kind-u, a nepoznate ostavlja sklopljene", () => {
    const trial: TrialResult = {
      ...trialsOf(1)[0]!,
      criteria: [
        { ...criterionOf("T-1", 1, "met", 62), kind: "inclusion" },
        { ...criterionOf("T-1", 2, "not_met", true), kind: "exclusion" },
        { ...criterionOf("T-1", 3, "unknown", null), kind: "inclusion" },
      ],
    };
    render(<TrialCard trial={trial} index={0} />);
    const cardDetails = document.querySelector(
      ".trial-details",
    ) as HTMLDetailsElement;
    const unknownDetails = document.querySelector(
      ".unknown-details",
    ) as HTMLDetailsElement;
    expect(cardDetails.open).toBe(false);
    expect(unknownDetails.open).toBe(false);
    expect(document.querySelector(".trial-unknown-count")?.textContent).toBe(
      "1 kriterijum čeka proveru lekara",
    );
    fireEvent.click(screen.getByText("Detalji studije"));
    expect(cardDetails.open).toBe(true);
    expect(screen.getAllByRole("heading", { name: "Uključuje" })).toHaveLength(
      1,
    );
    expect(screen.getByText("Potrebna provera lekara (1)")).toBeTruthy();
  });

  it("prikazuje preveden ishod, broj za proveru i bezbednu vezu ka registru", () => {
    const trial: TrialResult = {
      ...trialsOf(1, "NCT")[0]!,
      trialId: "NCT01234567",
    };
    render(<TrialCard trial={trial} index={0} />);

    expect(screen.getByText("Kandidat za dalju proveru")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\bcandidate\b/);
    const registryLink = screen.getByRole("link", {
      name: /Otvori NCT01234567 na ClinicalTrials\.gov/,
    });
    expect(registryLink.getAttribute("href")).toBe(
      "https://clinicaltrials.gov/study/NCT01234567",
    );
    expect(registryLink.getAttribute("target")).toBe("_blank");
    expect(registryLink.getAttribute("rel")).toBe("noopener noreferrer");
    expect(document.body.textContent).toContain(
      "1 kriterijum čeka proveru lekara",
    );
    expect(screen.getByText("Detalji studije")).toBeTruthy();
  });

  it("ne pravi registarsku vezu za sintetički ID i objašnjava prazan skup kriterijuma", () => {
    const trial: TrialResult = {
      trialId: "T-1",
      title: "Studija bez kriterijuma",
      verdict: "candidate",
      overallStatus: null,
      phase: null,
      criteria: [],
    };
    render(<TrialCard trial={trial} index={0} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(
      screen.getByText("Kriterijumi ove studije nisu dostupni u odgovoru."),
    ).toBeTruthy();
  });
});

describe("pregled studija", () => {
  it("izostaje za jednu studiju", () => {
    const trial = trialsOf(1);
    render(<TrialOverview trials={trial} />);
    expect(document.querySelector("nav.trial-overview")).toBeNull();
  });

  it("čuva redosled i premešta fokus na izabrani naslov", () => {
    const trials = trialsOf(3);
    render(
      <>
        <TrialOverview trials={trials} />
        {trials.map((trial, index) => (
          <TrialCard key={trial.trialId} trial={trial} index={index} />
        ))}
      </>,
    );

    const links = screen.getAllByRole("navigation")[0]?.querySelectorAll("a");
    expect(links).toHaveLength(3);
    expect(links?.[0]?.textContent).toContain("T-1");
    expect(links?.[1]?.textContent).toContain("T-2");
    expect(links?.[2]?.textContent).toContain("T-3");
    // false znači da je podrazumevani skok na #trial-3 zaustavljen, pa ga
    // pregledač ne može vratiti fokus na <body> posle rukovaoca.
    expect(fireEvent.click(links?.[2] as HTMLAnchorElement)).toBe(false);
    expect(document.activeElement).toBe(
      document.getElementById("trial-3-title"),
    );
  });

  it("prikaže 50 studija i pregled pre isteka jedne sekunde", async () => {
    const trials = trialsOf(50);
    const started = performance.now();
    render(
      <>
        <TrialOverview trials={trials} />
        <div className="trial-list">
          {trials.map((trial, index) => (
            <TrialCard key={trial.trialId} trial={trial} index={index} />
          ))}
        </div>
      </>,
    );
    expect(performance.now() - started).toBeLessThan(1000);
    expect(document.querySelectorAll(".trial-list article")).toHaveLength(50);
    expect(screen.getByRole("navigation").querySelectorAll("a")).toHaveLength(
      50,
    );
    expect(document.getElementById("trial-50-title")?.textContent).toBe(
      "Studija 50",
    );
  });
});

describe("red kriterijuma: vrsta uslova i tekst registra", () => {
  const base = criterionOf("T-1", 1, "met", 8.1);
  const renderRow = (criterion: typeof base) =>
    render(
      <ul>
        <CriterionRow criterion={criterion} />
      </ul>,
    );

  it("uslov isključenja: met znači da se ne odnosi", () => {
    renderRow({ ...base, kind: "exclusion" });
    expect(screen.getByText("Ne odnosi se")).toBeTruthy();
    expect(screen.getByText("Uslov isključenja")).toBeTruthy();
    expect(document.body.textContent).toContain(
      "uslov isključenja nije prisutan prema dostupnim podacima",
    );
    expect(document.body.textContent).not.toContain("Ispunjen");
  });
  it("uslov isključenja: not_met znači da se odnosi", () => {
    renderRow({ ...base, status: "not_met", kind: "exclusion" });
    expect(screen.getByText("Odnosi se")).toBeTruthy();
  });
  it("uslov uključenja zadržava postojeće oznake", () => {
    renderRow({ ...base, kind: "inclusion" });
    expect(screen.getByText("Ispunjen")).toBeTruthy();
    expect(screen.getByText("Uslov uključenja")).toBeTruthy();
  });
  it("bez kind-a nema oznake vrste i važe oznake uključenja", () => {
    renderRow(base);
    expect(screen.getByText("Ispunjen")).toBeTruthy();
    expect(document.body.textContent).not.toContain("Uslov uključenja");
    expect(document.body.textContent).not.toContain("Uslov isključenja");
  });
  it("prikazuje tekst registra bez markdown escape-ova", () => {
    renderRow({
      ...base,
      kind: "exclusion",
      text: "* HbA1c \\>10.0%",
      citation: { sourceId: base.sourceId, quote: "* HbA1c \\>10.0% \\*" },
    });
    expect(document.body.textContent).toContain("* HbA1c >10.0%");
    expect(document.body.textContent).not.toContain("\\");
    expect(document.querySelector("q")?.textContent).toBe("* HbA1c >10.0% *");
  });
});
