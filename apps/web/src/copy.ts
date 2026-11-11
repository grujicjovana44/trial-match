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
    eyebrow: "Preliminarna provera kriterijuma",
    title: "Uporedite sintetički profil sa studijama",
    lead: "Unesite samo izmišljene podatke. Rezultat prikazuje dokaze i nepoznanice za pregled zdravstvenog radnika.",
  },

  safety: {
    label: "Važno medicinsko upozorenje",
    strong: "Važno:",
    body: "TrialMatch ne postavlja dijagnozu, ne preporučuje lečenje i ne odlučuje o uključivanju u studiju. Jezički model čita pravila i objašnjava rezultat. Odluku donosi deterministički kod. Konačnu odluku uvek donosi lekar. Unosite isključivo sintetičke (izmišljene) profile; ne unosite stvarne podatke pacijenata.",
    demo: "U demo režimu i studije su sintetički primeri.",
  },

  form: {
    heading: "Sintetički profil ili pitanje o studiji",
    label: "Opis profila ili pitanje",
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
    note: "Diktiranje koristi prepoznavanje govora vašeg pregledača, koji zvuk može obrađivati na svom servisu. Diktirajte samo sintetičke podatke.",
    listening: "Slušam. Govorite sada.",
    added: "Tekst je dodat u polje. Proverite ga i ispravite pre slanja.",
    noSpeech: "Govor nije prepoznat. Pokušajte ponovo ili unesite tekst.",
    denied:
      "Pristup mikrofonu nije dozvoljen. Unos tekstom radi kao i do sada.",
    failed: "Diktiranje nije uspelo. Unos tekstom radi kao i do sada.",
  },

  processing: {
    line: "Provera je u toku…",
    slow: "Provera sa stvarnim modelom može trajati do jednog minuta. Zahtev je poslat jednom i ne treba ga ponavljati.",
    stale: "Prethodni rezultat. Nova provera je u toku.",
  },

  result: {
    eyebrow: "Rezultat provere",
    eyebrowHypothesis: "Rezultat hipotetičke izmene",
    headingOk: "Preliminarna provera završena",
    headingClarification: "Potrebna je dopuna",
    headingNoMatch: "Nijedna studija iz skupa ne odgovara profilu",
    headingNotInSources: "Tražena informacija nije u dostupnim izvorima",
    headingRejected: "Zahtev nije podržan",
    noMatchBody:
      "Prema unetim podacima profil ne ispunjava kriterijume nijedne studije iz dostupnog skupa. TrialMatch ne predlaže studije van tog skupa i ne nagađa.",
    noMatchDetail: "Razlozi po studiji trenutno nisu deo odgovora.",
    notInSourcesBody:
      "Odgovor na ovo pitanje ne nalazi se u dostupnim izvorima studija. TrialMatch ne odgovara iz opšteg znanja.",
    rejectedBody:
      "TrialMatch ne postavlja dijagnozu, ne daje savet o lečenju i ne odlučuje o uključivanju u studiju.",
    rejectedNext:
      "Može da uporedi sintetički profil sa kriterijumima studija i da pokaže na kojim se podacima i izvorima to poređenje zasniva. Unesite sintetički profil ili pitanje o kriterijumima studije.",
    systemExplanation: "Obrazloženje sistema:",
    hypothesisBanner: "Hipotetička izmena. Ovo nije izvorni profil.",
    hypothesisChange: (text: string) => `Izmena: „${text}“`,
  },

  profile: {
    heading: "Prepoznati podaci iz unosa",
    sourceLabel: "Izvorni tekst",
    extractedLabel: "Prepoznato iz teksta",
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
    registryLink: (trialId: string) =>
      `Otvori ${trialId} na ClinicalTrials.gov`,
    newTab: "(otvara se u novoj kartici)",
    noCriteria: "Kriterijumi ove studije nisu dostupni u odgovoru.",
    recruitment: "Status regrutacije:",
    phase: "Faza:",
    verdict: {
      candidate: "Kandidat za dalju proveru",
      pending: "Čeka dopunu podataka",
      excluded: "Ne ispunjava kriterijume",
    },
  },

  criterion: {
    short: { met: "Ispunjen", not_met: "Nije ispunjen", unknown: "Nepoznato" },
    note: {
      met: "prema dostupnim podacima",
      not_met: "prema dostupnim podacima",
      unknown: "potrebna je dopuna ili ručna provera",
    },
    icon: { met: "✓", not_met: "✕", unknown: "?" },
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
    label: "Unesite samo hipotetičku izmenu profila",
    placeholder: "Na primer: A šta ako je HbA1c 9,0%?",
    submit: "Ponovi proveru",
    note: "Izmena se proverava u okviru iste provere i ne menja izvorni profil.",
  },

  meta: {
    dataVersion: (version: string) => `Skup podataka: ${version}`,
    snapshot: (date: string) => `Datum snimka: ${date}`,
    demo: "DEMO režim — bez poziva stvarnom modelu",
    live: (modelId: string) => `Stvarni model: ${modelId}`,
    liveNoId: "Stvarni model",
  },

  footer: { note: "Sintetički profili · Nije medicinski savet" },

  errors: {
    network: {
      title: "Server nije dostupan",
      body: "Zahtev nije stigao do servera ili odgovor nije stigao nazad. Proverite internet vezu.",
    },
    client_timeout: {
      title: "Servis nije odgovorio na vreme",
      body: "Odgovor nije stigao u predviđenom roku. Rezultat nije izračunat.",
    },
    model_timeout: {
      title: "Servis nije odgovorio na vreme",
      body: "Jezički model nije odgovorio u predviđenom roku. Rezultat nije izračunat i nijedna studija nije ocenjena.",
    },
    bad_response: {
      title: "Odgovor servera nije čitljiv",
      body: "Server je vratio odgovor koji aplikacija ne može da pročita. Rezultat nije prikazan.",
    },
    invalid_response: {
      title: "Odgovor servera nije u očekivanom obliku",
      body: "Odgovor nije prošao proveru formata, pa nije prikazan ni delimično.",
    },
    rate_limited: {
      title: "Poslato je previše zahteva",
      body: "Server ograničava broj zahteva u minuti po korisniku. Ovo nije greška modela i provera nije izgubljena.",
    },
    service: {
      title: "Provera nije završena",
      body: "Došlo je do greške u servisu tokom provere. Rezultat nije izračunat i nijedna studija nije ocenjena.",
    },
    processing_limit: {
      title: "Provera je dostigla ograničenje obrade",
      body: "Ova provera je potrošila dozvoljen broj koraka obrade. Rezultat nije izračunat.",
    },
    question_limit: {
      title: "Dostignut je najveći broj dopuna",
      body: "Broj dopuna u jednoj proveri je ograničen. U novom opisu navedite sve poznate podatke.",
    },
    input_invalid: {
      title: "Unos nije prihvaćen",
      body: "Server nije mogao da obradi uneti tekst. Proverite da li su vrednosti i jedinice jasno napisane, pa pošaljite ponovo.",
    },
    input_too_large: {
      title: "Unos je predugačak",
      body: "Tekst je duži od dozvoljene granice. Skratite ga i pošaljite ponovo.",
    },
    hypothesis_invalid: {
      title: "Hipotetička izmena nije primenjena",
      body: "Izmena nije dovoljno jasna ili nije u podržanom obliku. Sačuvana provera nije promenjena. Navedite jednu konkretnu izmenu, na primer: „A šta ako je HbA1c 9,0%?“",
    },
    hypothesis_forbidden: {
      title: "Hipotetička izmena nije primenjena",
      body: "Izmena ne može da traži dijagnozu, savet o lečenju ili odluku o uključivanju. Sačuvana provera nije promenjena.",
    },
    run_expired: {
      title: "Provera više nije dostupna",
      body: "Server više nema ovu proveru ili ona ne može da se nastavi, na primer posle ponovnog pokretanja servera.",
    },
    request_rejected: {
      title: "Zahtev nije prihvaćen",
      body: "Server je odbio zahtev.",
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
    startOver: "Počni iznova",
  },
} as const;
