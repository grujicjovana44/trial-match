// Lažno prepoznavanje govora za testove: bez mikrofona i bez mreže.
// Oblik odgovara lokalnom RecognitionLike u src/hooks/useSpeechRecognition.ts.

export interface SpeechEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

export class FakeSpeechRecognition {
  static created: FakeSpeechRecognition[] = [];
  lang = "";
  interimResults = true;
  continuous = true;
  onresult: ((event: SpeechEventLike) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  starts = 0;
  stops = 0;

  constructor() {
    FakeSpeechRecognition.created.push(this);
  }

  start(): void {
    this.starts += 1;
  }

  stop(): void {
    this.stops += 1;
  }

  // Završen izgovor: prvo rezultat, pa kraj, kao u pregledaču.
  say(transcript: string): void {
    this.onresult?.({ results: [[{ transcript }]] });
    this.onend?.();
  }

  // Greška pa kraj, kao u pregledaču.
  fail(error: string): void {
    this.onerror?.({ error });
    this.onend?.();
  }
}

const globalNames = ["SpeechRecognition", "webkitSpeechRecognition"] as const;

export function installSpeechRecognition(
  name: (typeof globalNames)[number] = "SpeechRecognition",
): void {
  FakeSpeechRecognition.created = [];
  Object.defineProperty(window, name, {
    value: FakeSpeechRecognition,
    configurable: true,
    writable: true,
  });
}

export function removeSpeechRecognition(): void {
  for (const name of globalNames) {
    Reflect.deleteProperty(window, name);
  }
  FakeSpeechRecognition.created = [];
}

export function latestRecognition(): FakeSpeechRecognition {
  const instance = FakeSpeechRecognition.created.at(-1);
  if (instance === undefined) {
    throw new Error("Prepoznavanje govora nije napravljeno.");
  }
  return instance;
}
