import { useCallback, useEffect, useRef, useState } from "react";
import { SPEECH_LANGUAGE } from "../copy.js";

export type SpeechStatus =
  "idle" | "listening" | "added" | "no_speech" | "denied" | "failed";

export interface SpeechRecognitionControl {
  supported: boolean;
  listening: boolean;
  status: SpeechStatus;
  start: () => void;
  stop: () => void;
}

// Lokalni oblik ugrađenog API-ja. lib.dom ne mora da sadrži SpeechRecognition
// (specs/002-ui-role-a/research.md, R-14), pa se tipovi opisuju ovde, bez `any`.
export interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export type RecognitionConstructor = new () => RecognitionLike;

export function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as Record<string, unknown>;
  for (const name of ["SpeechRecognition", "webkitSpeechRecognition"]) {
    const candidate = scope[name];
    if (typeof candidate === "function") {
      return candidate as RecognitionConstructor;
    }
  }
  return null;
}

function transcriptOf(
  results: ArrayLike<ArrayLike<{ transcript: string }>>,
): string {
  const parts: string[] = [];
  for (let index = 0; index < results.length; index += 1) {
    // Događaj dolazi iz pregledača, pa se tekst proverava pre upotrebe.
    const transcript = results[index]?.[0]?.transcript;
    if (typeof transcript === "string" && transcript.trim().length > 0) {
      parts.push(transcript.trim());
    }
  }
  return parts.join(" ");
}

function statusOfError(error: string): SpeechStatus {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "denied";
  }
  if (error === "no-speech") return "no_speech";
  return "failed";
}

export function useSpeechRecognition(
  onTranscript: (text: string) => void,
): SpeechRecognitionControl {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const supported = getRecognitionConstructor() !== null;

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognition?.stop();
    };
  }, []);

  const start = useCallback(() => {
    const Constructor = getRecognitionConstructor();
    if (Constructor === null || recognitionRef.current !== null) return;

    const recognition = new Constructor();
    recognition.lang = SPEECH_LANGUAGE;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = transcriptOf(event.results);
      // Prazan prepoznat tekst se ne prosleđuje, da ne bi dopisao razmak u polje.
      if (transcript.length === 0) {
        setStatus("no_speech");
        return;
      }
      onTranscriptRef.current(transcript);
      setStatus("added");
    };
    recognition.onerror = (event) => {
      setStatus(statusOfError(event.error));
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      // Bez rezultata i greške (na primer, zaustavljeno pre govora) ne ostaje „Slušam“.
      setStatus((current) => (current === "listening" ? "idle" : current));
    };

    recognitionRef.current = recognition;
    setListening(true);
    setStatus("listening");
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setStatus("failed");
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { supported, listening, status, start, stop };
}
