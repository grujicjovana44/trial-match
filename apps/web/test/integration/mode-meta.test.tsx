// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App.js";
import { ResultMeta } from "../../src/components/ResultMeta.js";
import {
  httpErrorBody,
  jsonResponse,
  metaOf,
  okResponse,
  runErrorResponse,
} from "../helpers/responses.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function submitProfile() {
  fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
    target: { value: "Sintetički profil" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Proveri kriterijume" }));
}

describe("režim i metapodaci", () => {
  it("prikazuje oznaku režima samo posle odgovora i prati demo ili stvarni model", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(okResponse()))
      .mockResolvedValueOnce(
        jsonResponse(
          okResponse({
            meta: metaOf({ demoMode: false, modelId: "model-x" }),
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    expect(screen.queryByText("DEMO REŽIM")).toBeNull();
    expect(screen.queryByText("STVARNI MODEL")).toBeNull();
    expect(
      screen.getByLabelText("Važno medicinsko upozorenje").textContent,
    ).not.toContain("demo");

    submitProfile();
    await screen.findByText("DEMO REŽIM");
    expect(
      screen.getByLabelText("Važno medicinsko upozorenje").textContent,
    ).toContain("Studije su sintetički primeri.");
    expect(screen.getByText("Skup podataka: synthetic-trials-v1")).toBeTruthy();
    expect(
      screen.getByText("DEMO režim — bez poziva stvarnom modelu"),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
      target: { value: "Drugi sintetički profil" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );
    await screen.findByText("STVARNI MODEL");
    expect(screen.getByText("model-x")).toBeTruthy();
    expect(screen.queryByText("DEMO REŽIM")).toBeNull();
    expect(document.body.textContent).not.toContain(
      "bez poziva stvarnom modelu",
    );
    expect(document.body.textContent).not.toContain("sintetičke studije");
    expect(screen.getByText("Stvarni model: model-x")).toBeTruthy();
  });

  it("does not describe real study data as synthetic in DEMO mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          okResponse({
            meta: metaOf({
              dataSynthetic: false,
              dataOrigin: "ClinicalTrials.gov",
              dataVersion: "approved-studies-v1",
              demoMode: true,
            }),
          }),
        ),
      ),
    );
    render(<App />);

    submitProfile();
    await screen.findByText("DEMO REŽIM");

    expect(
      screen.getByLabelText("Važno medicinsko upozorenje").textContent,
    ).not.toContain("Studije su sintetički primeri.");
    expect(screen.getByText("Snimak studija")).toBeTruthy();
    expect(
      screen.getByText("DEMO režim — bez poziva stvarnom modelu"),
    ).toBeTruthy();
    expect(screen.getByText("ClinicalTrials.gov")).toBeTruthy();
  });

  it("omits an empty model id, updates meta after errors, and clears mode on restart", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          okResponse({
            meta: metaOf({ demoMode: false, modelId: "" }),
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          runErrorResponse("tool_error", true, {
            meta: metaOf({ demoMode: false, modelId: "model-x" }),
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(httpErrorBody("invalid_profile", false), 400),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    submitProfile();
    await screen.findByText("STVARNI MODEL");
    expect(document.querySelector(".mode-model")).toBeNull();
    expect(screen.getByText("Stvarni model")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
      target: { value: "Još jedan sintetički profil" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );
    await screen.findByText("Provera nije završena", { selector: "h2" });
    expect(screen.getByText("STVARNI MODEL")).toBeTruthy();

    fireEvent.click(
      screen.getAllByRole("button", { name: "Počni iznova" })[0]!,
    );
    expect(screen.queryByText("STVARNI MODEL")).toBeNull();
  });

  it("renders metadata from each response and omits hard-coded dataset claims", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          okResponse({
            meta: metaOf({ dataVersion: "ctgov-t2d-2026-11" }),
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          okResponse({
            meta: metaOf({ dataVersion: "ctgov-t2d-2026-12" }),
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    submitProfile();
    await screen.findByText("Skup podataka: ctgov-t2d-2026-11");
    fireEvent.change(screen.getByLabelText("Opis profila ili pitanje"), {
      target: { value: "Drugi sintetički profil" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );
    await screen.findByText("Skup podataka: ctgov-t2d-2026-12");
    expect(document.body.textContent).not.toContain("synthetic-trials-v1");
    expect(document.body.textContent).not.toContain("7. novembar 2026.");
  });

  it("prikazuje datum snimka samo kada postoji (T232, AC-01)", () => {
    const { rerender } = render(
      <ResultMeta meta={metaOf({ dataSnapshotDate: "2026-11-07" })} />,
    );
    expect(screen.getByText("Datum snimka: 7. novembar 2026.")).toBeTruthy();

    rerender(<ResultMeta meta={metaOf({ dataSnapshotDate: null })} />);
    expect(document.body.textContent).not.toContain("Datum snimka");
    expect(document.body.textContent).not.toContain("Datum nije dostupan");
  });
});
