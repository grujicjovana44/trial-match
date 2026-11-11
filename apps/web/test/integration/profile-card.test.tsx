// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProfileCard } from "../../src/components/ProfileCard.js";
import { okResponse } from "../helpers/responses.js";

afterEach(cleanup);

describe("kartica profila", () => {
  it("prikazuje izvorni tekst, prepoznate i izvedene podatke, kao i nedostajuća polja", () => {
    const response = okResponse();
    render(
      <ProfileCard
        profile={response.profile}
        derived={response.derived}
        sourceText="Sintetički profil"
      />,
    );

    expect(screen.getByText("Sintetički profil")).toBeTruthy();
    expect(screen.getByText("starost")).toBeTruthy();
    expect(screen.getByText("62")).toBeTruthy();
    expect(screen.getByText("pol")).toBeTruthy();
    expect(screen.getByText("M")).toBeTruthy();
    expect(screen.getByText("8,1%")).toBeTruthy();
    expect(screen.getByText("eGFR ≈ 62,11 mL/min/1.73 m²")).toBeTruthy();
    expect(screen.getByText("izračunao kod")).toBeTruthy();
    expect(
      screen.getByText("CKD-EPI 2021. Izvor: docs/project-brief.md"),
    ).toBeTruthy();
    expect(screen.getByText("kreatinin")).toBeTruthy();
    expect(screen.queryByText("male")).toBeNull();
  });

  it("prikazuje poreklo dopune i hipotetičke izmene", () => {
    const response = okResponse({
      profile: {
        age: 62,
        insulin_last_3_months: false,
        provenance: {
          age: { origin: "answer", round: 1 },
          insulin_last_3_months: { origin: "hypothesis", round: 2 },
        },
      },
    });
    render(
      <ProfileCard profile={response.profile} derived={[]} sourceText={null} />,
    );

    expect(screen.getByText("iz dopune")).toBeTruthy();
    expect(screen.getByText("hipotetički")).toBeTruthy();
  });

  it("prikazuje poruku kada nijedno polje profila nije prepoznato", () => {
    render(<ProfileCard profile={{}} derived={[]} sourceText={null} />);
    expect(
      screen.getByText("Iz teksta nije prepoznata nijedna vrednost profila."),
    ).toBeTruthy();
  });
});
