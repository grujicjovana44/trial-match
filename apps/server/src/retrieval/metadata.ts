import type { Trial } from "../../../../packages/shared/src/index.js";

export type RetrievalMetadataFilters = { state?: string; status?: string };

const states: Readonly<Record<string, string>> = {
  al: "alabama",
  alabama: "alabama",
  alaska: "alaska",
  ak: "alaska",
  az: "arizona",
  arizona: "arizona",
  ar: "arkansas",
  arkansas: "arkansas",
  ca: "california",
  california: "california",
  co: "colorado",
  colorado: "colorado",
  ct: "connecticut",
  connecticut: "connecticut",
  de: "delaware",
  delaware: "delaware",
  fl: "florida",
  florida: "florida",
  ga: "georgia",
  georgia: "georgia",
  hi: "hawaii",
  hawaii: "hawaii",
  id: "idaho",
  idaho: "idaho",
  il: "illinois",
  illinois: "illinois",
  in: "indiana",
  indiana: "indiana",
  ia: "iowa",
  iowa: "iowa",
  ks: "kansas",
  kansas: "kansas",
  ky: "kentucky",
  kentucky: "kentucky",
  la: "louisiana",
  louisiana: "louisiana",
  me: "maine",
  maine: "maine",
  md: "maryland",
  maryland: "maryland",
  ma: "massachusetts",
  massachusetts: "massachusetts",
  mi: "michigan",
  michigan: "michigan",
  mn: "minnesota",
  minnesota: "minnesota",
  ms: "mississippi",
  mississippi: "mississippi",
  mo: "missouri",
  missouri: "missouri",
  mt: "montana",
  montana: "montana",
  ne: "nebraska",
  nebraska: "nebraska",
  nv: "nevada",
  nevada: "nevada",
  nh: "new hampshire",
  "new hampshire": "new hampshire",
  nj: "new jersey",
  "new jersey": "new jersey",
  nm: "new mexico",
  "new mexico": "new mexico",
  ny: "new york",
  "new york": "new york",
  nc: "north carolina",
  "north carolina": "north carolina",
  nd: "north dakota",
  "north dakota": "north dakota",
  oh: "ohio",
  ohio: "ohio",
  ok: "oklahoma",
  oklahoma: "oklahoma",
  or: "oregon",
  oregon: "oregon",
  pa: "pennsylvania",
  pennsylvania: "pennsylvania",
  ri: "rhode island",
  "rhode island": "rhode island",
  sc: "south carolina",
  "south carolina": "south carolina",
  sd: "south dakota",
  "south dakota": "south dakota",
  tn: "tennessee",
  tennessee: "tennessee",
  tx: "texas",
  texas: "texas",
  ut: "utah",
  utah: "utah",
  vt: "vermont",
  vermont: "vermont",
  va: "virginia",
  virginia: "virginia",
  wa: "washington",
  washington: "washington",
  wv: "west virginia",
  "west virginia": "west virginia",
  wi: "wisconsin",
  wisconsin: "wisconsin",
  wy: "wyoming",
  wyoming: "wyoming",
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en").replace(/\s+/gu, " ");
}

function canonicalState(value: string): string | undefined {
  return states[normalize(value)];
}

function locationStates(trial: Trial): string[] {
  return trial.locations.flatMap((location) =>
    location
      .split(/[;,]/u)
      .map((part) => canonicalState(part))
      .filter((state): state is string => state !== undefined),
  );
}

export function filterKnownMetadata(
  trials: readonly Trial[],
  filters?: RetrievalMetadataFilters,
): { trials: Trial[]; applied: RetrievalMetadataFilters } {
  const knownStates = new Set(trials.flatMap(locationStates));
  const knownStatuses = new Set(
    trials
      .map((trial) => trial.overallStatus)
      .filter((status): status is string => status !== null)
      .map(normalize),
  );
  const requestedState = filters?.state
    ? canonicalState(filters.state)
    : undefined;
  const activeState =
    requestedState && knownStates.has(requestedState) ? requestedState : undefined;
  const requestedStatus = filters?.status ? normalize(filters.status) : undefined;
  const activeStatus =
    requestedStatus && knownStatuses.has(requestedStatus)
      ? requestedStatus
      : undefined;

  return {
    trials: trials.filter((trial) => {
      if (
        activeState &&
        !locationStates(trial).includes(activeState)
      )
        return false;
      if (
        activeStatus &&
        (!trial.overallStatus || normalize(trial.overallStatus) !== activeStatus)
      )
        return false;
      return true;
    }),
    applied: {
      ...(activeState ? { state: activeState } : {}),
      ...(activeStatus ? { status: activeStatus } : {}),
    },
  };
}
