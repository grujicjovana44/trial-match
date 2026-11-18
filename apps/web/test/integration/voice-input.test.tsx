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
import { jsonResponse, okResponse } from "../helpers/responses.js";
import {
  installSpeechRecognition,
  latestRecognition,
  removeSpeechRecognition,
} from "../helpers/speech.js";

afterEach(() => {
  cleanup();
  removeSpeechRecognition();
  vi.unstubAllGlobals();
});

function profileField(): HTMLTextAreaElement {
  return screen.getByLabelText(
    "Opis profila ili pitanje",
  ) as HTMLTextAreaElement;
}

function dictate(): void {
  fireEvent.click(screen.getByRole("button", { name: "Diktiraj" }));
}

describe("glasovni unos (AC-13)", () => {
  it("(a) diktat upisuje tekst u polje, prikazuje potvrdu i ništa ne šalje", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    installSpeechRecognition();
    render(<App />);

    dictate();
    act(() => latestRecognition().say("muškarac 62 godine"));

    expect(profileField().value).toBe("muškarac 62 godine");
    expect(
      screen.getByText(
        "Tekst je dodat u polje. Proverite ga i ispravite pre slanja.",
      ),
    ).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("(b) diktat se dopisuje na postojeći tekst razmakom", () => {
    installSpeechRecognition();
    render(<App />);

    fireEvent.change(profileField(), { target: { value: "HbA1c 8,1%" } });
    dictate();
    act(() => latestRecognition().say("muškarac 62 godine"));

    expect(profileField().value).toBe("HbA1c 8,1% muškarac 62 godine");
  });

  it("(c) posle diktata polje se može ručno izmeniti", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    installSpeechRecognition();
    render(<App />);

    dictate();
    act(() => latestRecognition().say("muškarac 62 godine"));
    fireEvent.change(profileField(), {
      target: { value: "Muškarac, 63 godine" },
    });

    expect(profileField().value).toBe("Muškarac, 63 godine");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("(d) odbijen mikrofon prikazuje poruku, a unos tekstom ostaje dostupan", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    installSpeechRecognition();
    render(<App />);

    dictate();
    act(() => latestRecognition().fail("not-allowed"));

    expect(
      screen.getByText(
        "Pristup mikrofonu nije dozvoljen. Unos tekstom radi kao i do sada.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Diktiraj" })).toBeTruthy();
    fireEvent.change(profileField(), { target: { value: "Ručni unos" } });
    expect(profileField().value).toBe("Ručni unos");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("(e) bez podrške pregledača nema dugmeta, a unos tekstom i slanje rade", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(okResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    expect(screen.queryByRole("button", { name: "Diktiraj" })).toBeNull();
    fireEvent.change(profileField(), {
      target: { value: "Sintetički profil" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );

    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("(f) slanje tokom diktata prekida diktat, a kasni rezultat ne menja polje", () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    installSpeechRecognition();
    render(<App />);

    fireEvent.change(profileField(), {
      target: { value: "Sintetički profil" },
    });
    dictate();
    const recognition = latestRecognition();
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );

    expect(recognition.stops).toBe(1);
    const button = screen.getByRole("button", { name: "Diktiraj" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("Slušam. Govorite sada.")).toBeNull();
    act(() => recognition.say("kasni tekst"));
    expect(profileField().value).toBe("Sintetički profil");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("(g) „Počni iznova“ tokom diktata prekida diktat i ostavlja prazno polje", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(okResponse()));
    vi.stubGlobal("fetch", fetchMock);
    installSpeechRecognition();
    render(<App />);

    fireEvent.change(profileField(), {
      target: { value: "Sintetički profil" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Proveri kriterijume" }),
    );
    await screen.findByRole("heading", {
      level: 2,
      name: "Preliminarna provera završena",
    });

    dictate();
    const recognition = latestRecognition();
    fireEvent.click(screen.getByRole("button", { name: "Počni iznova" }));
    act(() => recognition.say("kasni tekst"));

    expect(recognition.stops).toBe(1);
    expect(profileField().value).toBe("");
    expect(screen.getByRole("button", { name: "Diktiraj" })).toBeTruthy();
    expect(screen.queryByText("Slušam. Govorite sada.")).toBeNull();
  });

  it("(h) dugme menja natpis bez aria-pressed, a zaustavljanje zadržava izgovoreno", () => {
    installSpeechRecognition();
    render(<App />);

    dictate();
    const stopButton = screen.getByRole("button", {
      name: "Zaustavi diktiranje",
    });
    expect(stopButton.hasAttribute("aria-pressed")).toBe(false);
    expect(screen.getByText("Slušam. Govorite sada.")).toBeTruthy();

    fireEvent.click(stopButton);
    act(() => latestRecognition().say("muškarac 62 godine"));

    expect(latestRecognition().stops).toBe(1);
    expect(profileField().value).toBe("muškarac 62 godine");
    expect(
      screen
        .getByRole("button", { name: "Diktiraj" })
        .hasAttribute("aria-pressed"),
    ).toBe(false);
  });
});
