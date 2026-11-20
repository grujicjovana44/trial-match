export const MAX_INPUT_CHARS = 4000;
export const REQUEST_TIMEOUT_MS = 70000;
export const SLOW_NOTICE_MS = 5000;
export const DEFAULT_RETRY_AFTER_SECONDS = 60;
export const SPEECH_LANGUAGE = "sr-RS";

export const copy = {
  documentTitle: "TrialMatch",
  brand: { name: "TrialMatch", homeLabel: "TrialMatch početna stranica" },

  mode: {
    srPrefix: "Režim rada: ",
    demo: "DEMO REŽIM",
    live: "STVARNI MODEL",
  },

  intro: {
    eyebrow: "Provera studija",
    title: "Proverite profil prema studijama",
    lead: "Unesite izmišljeni profil. Pregledajte šta je poznato, a šta lekar treba da proveri.",
  },

  empty: {
    heading: "Rezultati provere",
    body: "Unesite sintetički profil i pokrenite proveru. Rezultati će se prikazati ovde.",
  },

  safety: {
    label: "Važno medicinsko upozorenje",
    strong: "Važno:",
    short:
      "Alat ne postavlja dijagnozu, ne preporučuje lečenje i ne odlučuje o uključivanju. Konačnu odluku donosi lekar. Unosite samo sintetičke profile.",
    details: "O alatu i ograničenjima",
    body: "Jezički model čita pravila i objašnjava rezultat; presudu određuje deterministički kod. Ne unosite stvarne podatke pacijenata.",
    demo: "Studije su sintetički primeri.",
  },

  form: {
    heading: "Podaci profila",
    label: "Opišite profil",
    placeholder:
      "Primer: Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg.",
    hint: "Ne unosite stvarne podatke pacijenata.",
    hintEmpty:
      "Unesite opis profila ili pitanje da biste pokrenuli proveru. Ne unosite stvarne podatke pacijenata.",
    errorEmpty: "Polje je prazno. Unesite opis profila ili pitanje.",
    errorTooLong: (over: number) =>
      `Unos je duži od 4000 znakova za ${over}. Skratite opis da biste pokrenuli proveru.`,
    counter: (length: number) => `${length}/4000 znakova`,
    submit: "Proveri kriterijume",
    startOver: "Počni iznova",
  },

  voice: {
    start: "Diktiraj",
    stop: "Zaustavi diktiranje",
    note: "Diktiranje koristi prepoznavanje govora pregledača; zvuk može da se obrađuje na njegovom servisu. Diktirajte samo sintetičke podatke.",
    listening: "Slušam. Govorite sada.",
    added: "Tekst je dodat u polje. Proverite ga i ispravite pre slanja.",
    noSpeech: "Govor nije prepoznat. Pokušajte ponovo ili unesite tekst.",
    denied:
      "Pristup mikrofonu nije dozvoljen. Unos tekstom radi kao i do sada.",
    failed: "Diktiranje nije uspelo. Unos tekstom radi kao i do sada.",
    unsupported:
      "Diktiranje nije dostupno u ovom pregledaču. Možete uneti tekst.",
  },

  processing: {
    line: "Provera je u toku…",
    short: "Upoređujemo unete podatke sa kriterijumima studija.",
    slow: "Provera sa stvarnim modelom može trajati do jednog minuta. Zahtev je poslat jednom i ne treba ga ponavljati.",
    stale: "Prethodni rezultat. Nova provera je u toku.",
  },

  result: {
    explanationModel:
      "Objašnjenje je sastavio jezički model. Kod je proverio citate i brojeve; statuse kriterijuma određuje kod, ne model.",
    explanationTemplate:
      "Objašnjenje iz šablona: tekst modela nije prošao proveru ili nije korišćen.",
    eyebrow: "Rezultat provere",
    eyebrowHypothesis: "Rezultat promene profila",
    excludedLabel: "Isključene studije",
    excludedHeading: "Isključene studije i razlozi",
    headingOk: "Provera je završena",
    headingClarification: "Potrebna je dopuna",
    headingNoMatch: "Nijedna studija iz skupa ne odgovara profilu",
    headingNotInSources: "Tražena informacija nije u dostupnim izvorima",
    headingRejected: "Zahtev nije podržan",
    noMatchBody:
      "Prema unetim podacima profil ne ispunjava kriterijume nijedne studije iz dostupnog skupa. TrialMatch ne predlaže studije van tog skupa i ne nagađa.",
    noMatchDetail:
      "Ispod su prikazane studije koje su isključene i kriterijumi koji to potkrepljuju.",
    notInSourcesBody:
      "Odgovor na ovo pitanje ne nalazi se u dostupnim izvorima studija. TrialMatch ne odgovara iz opšteg znanja.",
    rejectedBody:
      "TrialMatch ne postavlja dijagnozu, ne daje savet o lečenju i ne odlučuje o uključivanju u studiju.",
    rejectedNext:
      "Može da uporedi sintetički profil sa kriterijumima studija i da pokaže na kojim se podacima i izvorima to poređenje zasniva. Unesite sintetički profil ili pitanje o kriterijumima studije.",
    systemExplanation: "Obrazloženje sistema:",
    hypothesisBanner:
      "Ova provera koristi izmenjeni podatak; početni profil ostaje sačuvan.",
    hypothesisChange: (text: string) => `Promena: „${text}“`,
  },

  profile: {
    heading: "Podaci profila",
    sourceLabel: "Izvorni tekst",
    extractedLabel: "Podaci iz unosa",
    noneExtracted: "Iz teksta nije prepoznata nijedna vrednost profila.",
    derivedLabel: "Izračunato",
    derivedSuffix: "izračunao kod",
    formula: (name: string, source: string) => `${name}. Izvor: ${source}`,
    missingLabel: "Nije uneto",
    ambiguousLabel: "Nejasno u unosu",
    originAnswer: "iz dopune",
    originHypothesis: "hipotetički",
    fields: {
      age: "starost",
      sex: "pol",
      hba1c: "HbA1c",
      creatinine: "kreatinin",
      height: "visina",
      weight: "težina",
      insulin_last_3_months: "upotreba insulina",
      medications: "terapije",
      stated_diagnoses: "navedena dijagnoza",
      egfr: "eGFR",
      bmi: "BMI",
    },
    sexMale: "M",
    sexFemale: "Ž",
  },

  overview: {
    heading: "Pregled studija",
    count: (total: number) =>
      `Broj studija: ${total}. Redosled je odredio deterministički kod.`,
  },

  trial: {
    details: "Detalji studije",
    technical: "Tehnički detalji",
    reviewGroup: (count: number) => `Potrebna provera lekara (${count})`,
    reviewCount: (count: number) =>
      count === 1
        ? "kriterijum čeka proveru lekara"
        : "kriterijuma čeka proveru lekara",
    registryLink: (trialId: string) =>
      `Otvori ${trialId} na ClinicalTrials.gov`,
    newTab: "(otvara se u novoj kartici)",
    noCriteria: "Kriterijumi ove studije nisu dostupni u odgovoru.",
    recruitment: "Status regrutacije:",
    phase: "Faza:",
    // Vrednosti registra (plan.md, odeljak 6). Tačan skup potvrđuje Uloga C (REQ-C2);
    // vrednost koje nema u tabeli prikazuje se doslovno.
    recruitmentValues: {
      RECRUITING: "regrutuje učesnike",
      NOT_YET_RECRUITING: "još ne regrutuje",
      ACTIVE_NOT_RECRUITING: "aktivna, ne regrutuje",
      ENROLLING_BY_INVITATION: "uključivanje po pozivu",
      COMPLETED: "završena",
      SUSPENDED: "privremeno zaustavljena",
      TERMINATED: "prekinuta",
      WITHDRAWN: "povučena",
      UNKNOWN: "status nije poznat",
    } as Record<string, string>,
    phaseValues: {
      EARLY_PHASE1: "rana faza 1",
      PHASE1: "faza 1",
      "PHASE1/PHASE2": "faza 1/2",
      PHASE2: "faza 2",
      "PHASE2/PHASE3": "faza 2/3",
      PHASE3: "faza 3",
      PHASE4: "faza 4",
      NA: "nije primenljivo",
    } as Record<string, string>,
    verdict: {
      candidate: "Kandidat za dalju proveru",
      pending: "Čeka dopunu ili proveru lekara",
      excluded: "Ne ispunjava kriterijume",
    },
  },

  summary: {
    sentence: (
      trials: number,
      excluded: number,
      met: number,
      notMet: number,
      unknown: number,
    ) =>
      `Provereno studija: ${trials}; isključeno: ${excluded}; kriterijumi — ispunjeno: ${met}, nije ispunjeno: ${notMet}, čeka proveru lekara: ${unknown}.`,
  },

  criterion: {
    short: { met: "Ispunjen", not_met: "Nije ispunjen", unknown: "Nepoznato" },
    note: {
      met: "prema dostupnim podacima",
      not_met: "prema dostupnim podacima",
      unknown: "potrebna je dopuna ili ručna provera",
    },
    icon: { met: "✓", not_met: "✕", unknown: "?" },
    // Kod uslova isključenja "met" znači da isključenje NE važi za pacijenta.
    exclusionShort: {
      met: "Ne odnosi se",
      not_met: "Odnosi se",
      unknown: "Nepoznato",
    },
    exclusionNote: {
      met: "uslov isključenja nije prisutan prema dostupnim podacima",
      not_met: "uslov isključenja je prisutan prema dostupnim podacima",
      unknown: "potrebna je dopuna ili ručna provera",
    },
    kindTag: {
      inclusion: "Uslov uključenja",
      exclusion: "Uslov isključenja",
    },
    unitNames: { year: "godina", years: "godina" } as Record<string, string>,
    value: "Vrednost:",
    source: "Izvor:",
    missing: "nije uneto",
    computed: "izračunao kod",
    yes: "da",
    no: "ne",
    male: "muški",
    female: "ženski",
  },

  clarify: {
    heading: "Potrebna dopuna",
    optionsLabel: "Ponuđeni odgovori",
    hint: "Izaberite ponuđeni odgovor ili upišite svoj.",
    submit: "Pošalji dopunu",
  },

  hypothesis: {
    heading: "Šta ako?",
    label: "Promenite jedan podatak",
    placeholder: "Na primer: Šta ako je HbA1c 9,0%?",
    submit: "Proveri izmenu",
    note: "Izmena važi samo za ovu proveru.",
  },

  meta: {
    dataVersion: (version: string) => `Skup podataka: ${version}`,
    snapshot: (date: string) => `Datum snimka: ${date}`,
    syntheticData: "Sintetički skup",
    realData: "Snimak studija",
    demo: "DEMO režim — bez poziva stvarnom modelu",
    retrieval: (mode: string) =>
      `Retrieval: ${mode === "hybrid" ? "hibridni" : mode === "lexical_fallback" ? "lexical fallback" : "lexical-only"}`,
    retrievalFallback: (reason: string) =>
      `RAG indeks nije dostupan (${reason === "index_missing" ? "indeks nedostaje" : reason === "embedding_unconfigured" ? "embedding ključ nije podešen" : "indeks nije validan"}); korišćena je lexical pretraga.`,
    live: (modelId: string) => `Stvarni model: ${modelId}`,
    liveNoId: "Stvarni model",
  },

  footer: { note: "Sintetički profili · Nije medicinski savet" },

  errors: {
    network: {
      title: "Server nije dostupan",
      body: "Server nije odgovorio; proverite vezu i pokušajte ponovo.",
    },
    client_timeout: {
      title: "Servis nije odgovorio na vreme",
      body: "Servis nije odgovorio na vreme; pokušajte ponovo.",
    },
    model_timeout: {
      title: "Servis nije odgovorio na vreme",
      body: "Servis nije odgovorio na vreme; pokušajte ponovo.",
    },
    bad_response: {
      title: "Odgovor servera nije čitljiv",
      body: "Odgovor nije čitljiv; pokušajte ponovo.",
    },
    invalid_response: {
      title: "Odgovor servera nije u očekivanom obliku",
      body: "Odgovor nije u očekivanom obliku; pokušajte ponovo.",
    },
    rate_limited: {
      title: "Poslato je previše zahteva",
      body: "Server trenutno ograničava broj zahteva; sačekajte odbrojavanje pre novog pokušaja.",
    },
    service: {
      title: "Provera nije završena",
      body: "Provera nije završena zbog greške u servisu; pokušajte ponovo.",
    },
    processing_limit: {
      title: "Provera je dostigla ograničenje obrade",
      body: "Provera je dostigla ograničenje obrade; počnite novu proveru.",
    },
    question_limit: {
      title: "Dostignut je najveći broj dopuna",
      body: "Dostigli ste broj dozvoljenih dopuna; počnite novu proveru sa svim poznatim podacima.",
    },
    input_invalid: {
      title: "Unos nije prihvaćen",
      body: "Unos nije jasan; proverite vrednosti i jedinice pa ga izmenite.",
    },
    input_too_large: {
      title: "Unos je predugačak",
      body: "Unos je predugačak; skratite ga.",
    },
    hypothesis_invalid: {
      title: "Nismo prepoznali promenu",
      body: "Navedite jednu konkretnu promenu, na primer: „Šta ako je HbA1c 9,0%?“",
    },
    hypothesis_forbidden: {
      title: "Ova promena nije podržana",
      body: "Možete proveriti promenu podatka, ali ne tražiti dijagnozu, savet o lečenju ili odluku o uključivanju.",
    },
    run_expired: {
      title: "Provera više nije dostupna",
      body: "Ova provera više nije dostupna; počnite novu.",
    },
    request_rejected: {
      title: "Zahtev nije prihvaćen",
      body: "Zahtev nije prihvaćen; proverite unos pa pokušajte ponovo.",
    },
    hintRetry: "Pokušajte ponovo.",
    hintRestart: "Počnite iznova.",
    waitSeconds: (seconds: number) => `Možete pokušati ponovo za ${seconds} s.`,
    waitDone: "Možete pokušati ponovo.",
    waitForScreenReader: (seconds: number) =>
      `Sačekajte oko ${seconds} sekundi pre ponovnog pokušaja.`,
    previousKept: "Ispod je poslednji potvrđeni rezultat ove provere.",
    serverMessage: "Poruka servera:",
    retry: "Pokušaj ponovo",
    editInput: "Izmeni unos",
    startOver: "Počni iznova",
  },
} as const;
