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
  it("prikazuje status, vrednost, izvor i ceo citat kao tekst", () => {
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
    expect(document.body.textContent).toContain("T-1#inc-1");
    expect(screen.getByText("Citat 1 za T-1", { selector: "q" })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(
      /\b(?:met|not_met|true|null)\b/,
    );
  });
});

describe("kartica studije", () => {
  it("prikazuje preveden ishod, sažetak i bezbednu vezu ka registru", () => {
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
      "1 od 3 ispunjeno, 1 nije ispunjeno, 1 nepoznato",
    );
  });

  it("ne pravi registarsku vezu za sintetički ID i objašnjava prazan skup kriterijuma", () => {
    const trial: TrialResult = {
      trialId: "T-1",
      title: "Studija bez kriterijuma",
      verdict: "candidate",
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
