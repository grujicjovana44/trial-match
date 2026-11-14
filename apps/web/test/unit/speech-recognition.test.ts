// @vitest-environment jsdom
// Kuka čita window, pa treba DOM okruženje; sama logika je bez React prikaza.
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSpeechRecognition } from "../../src/hooks/useSpeechRecognition.js";
import {
  installSpeechRecognition,
  latestRecognition,
  removeSpeechRecognition,
  type SpeechEventLike,
} from "../helpers/speech.js";

afterEach(() => {
  cleanup();
  removeSpeechRecognition();
});

describe("useSpeechRecognition (AC-13)", () => {
  it("prijavljuje podršku kada pregledač ima SpeechRecognition", () => {
    installSpeechRecognition();
    const { result } = renderHook(() => useSpeechRecognition(() => {}));
    expect(result.current.supported).toBe(true);
  });

  it("koristi webkitSpeechRecognition kada standardni naziv nedostaje", () => {
    installSpeechRecognition("webkitSpeechRecognition");
    const { result } = renderHook(() => useSpeechRecognition(() => {}));
    expect(result.current.supported).toBe(true);
  });

  it("pokreće prepoznavanje na sr-RS, bez međurezultata i bez neprekidnog slušanja", () => {
    installSpeechRecognition();
    const { result } = renderHook(() => useSpeechRecognition(() => {}));
    act(() => result.current.start());

    const recognition = latestRecognition();
    expect(recognition.lang).toBe("sr-RS");
    expect(recognition.interimResults).toBe(false);
    expect(recognition.continuous).toBe(false);
    expect(recognition.starts).toBe(1);
    expect(result.current.listening).toBe(true);
    expect(result.current.status).toBe("listening");
  });

  it("prosleđuje prepoznat tekst i postavlja status added", () => {
    const onTranscript = vi.fn();
    installSpeechRecognition();
    const { result } = renderHook(() => useSpeechRecognition(onTranscript));
    act(() => result.current.start());
    act(() => latestRecognition().say("muškarac 62 godine"));

    expect(onTranscript).toHaveBeenCalledTimes(1);
    expect(onTranscript).toHaveBeenCalledWith("muškarac 62 godine");
    expect(result.current.status).toBe("added");
    expect(result.current.listening).toBe(false);
  });

  it("spaja tekst svih rezultata razmakom", () => {
    const onTranscript = vi.fn();
    installSpeechRecognition();
    const { result } = renderHook(() => useSpeechRecognition(onTranscript));
    act(() => result.current.start());
    act(() =>
      latestRecognition().onresult?.({
        results: [
          [{ transcript: "HbA1c 8,1%" }],
          [{ transcript: " 62 godine " }],
        ],
      }),
    );

    expect(onTranscript).toHaveBeenCalledWith("HbA1c 8,1% 62 godine");
  });

  it("ne prosleđuje prazan rezultat i prijavljuje da govor nije prepoznat", () => {
    const onTranscript = vi.fn();
    installSpeechRecognition();
    const { result } = renderHook(() => useSpeechRecognition(onTranscript));
    act(() => result.current.start());
    act(() => latestRecognition().say("   "));

    expect(onTranscript).not.toHaveBeenCalled();
    expect(result.current.status).toBe("no_speech");
  });

  it("zaustavljanje pre govora vraća status na idle", () => {
    installSpeechRecognition();
    const { result } = renderHook(() => useSpeechRecognition(() => {}));
    act(() => result.current.start());
    act(() => result.current.stop());
    act(() => latestRecognition().onend?.());

    expect(result.current.listening).toBe(false);
    expect(result.current.status).toBe("idle");
  });

  it("neispravan tekst u događaju se ignoriše bez greške", () => {
    const onTranscript = vi.fn();
    installSpeechRecognition();
    const { result } = renderHook(() => useSpeechRecognition(onTranscript));
    act(() => result.current.start());
    const malformed = { results: [[{}]] } as unknown as SpeechEventLike;
    act(() => latestRecognition().onresult?.(malformed));

    expect(onTranscript).not.toHaveBeenCalled();
    expect(result.current.status).toBe("no_speech");
  });

  it("odbijen mikrofon daje status denied i gasi slušanje", () => {
    installSpeechRecognition();
    const { result } = renderHook(() => useSpeechRecognition(() => {}));
    act(() => result.current.start());
    act(() => latestRecognition().fail("not-allowed"));

    expect(result.current.status).toBe("denied");
    expect(result.current.listening).toBe(false);
  });

  it("service-not-allowed takođe daje status denied", () => {
    installSpeechRecognition();
    const { result } = renderHook(() => useSpeechRecognition(() => {}));
    act(() => result.current.start());
    act(() => latestRecognition().fail("service-not-allowed"));

    expect(result.current.status).toBe("denied");
  });

  it("ostale greške daju status failed", () => {
    installSpeechRecognition();
    const { result } = renderHook(() => useSpeechRecognition(() => {}));
    act(() => result.current.start());
    act(() => latestRecognition().fail("network"));

    expect(result.current.status).toBe("failed");
  });

  it("bez konstruktora podrška je false, a start ne baca", () => {
    const { result } = renderHook(() => useSpeechRecognition(() => {}));

    expect(result.current.supported).toBe(false);
    expect(() => act(() => result.current.start())).not.toThrow();
    expect(result.current.listening).toBe(false);
    expect(result.current.status).toBe("idle");
  });

  it("pri uklanjanju kuke zaustavlja prepoznavanje", () => {
    installSpeechRecognition();
    const { result, unmount } = renderHook(() =>
      useSpeechRecognition(() => {}),
    );
    act(() => result.current.start());
    const recognition = latestRecognition();
    unmount();

    expect(recognition.stops).toBe(1);
  });
});
