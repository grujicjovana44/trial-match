export type Measurement = { value: number; unit: string };

function finiteValue(value: number): void {
  if (!Number.isFinite(value))
    throw new RangeError("Vrednost mora biti konačan broj.");
}

export function parseLocalizedNumber(input: string): number | undefined {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

export function normalizeCreatinine(measurement: Measurement): Measurement {
  finiteValue(measurement.value);
  const unit = measurement.unit.trim().toLowerCase().replaceAll("μ", "µ");
  if (unit === "mg/dl" || unit === "mg/dL".toLowerCase()) {
    return { value: measurement.value, unit: "mg/dL" };
  }
  if (unit === "µmol/l" || unit === "umol/l") {
    return { value: measurement.value / 88.4, unit: "mg/dL" };
  }
  throw new RangeError("Nepodržana jedinica kreatinina.");
}

export function normalizeHba1c(measurement: Measurement): Measurement {
  finiteValue(measurement.value);
  const unit = measurement.unit.trim().toLowerCase();
  if (unit === "%" || unit === "ngsp %")
    return { value: measurement.value, unit: "%" };
  if (unit === "mmol/mol" || unit === "mmol/mol ifcc") {
    return { value: 0.09148 * measurement.value + 2.152, unit: "%" };
  }
  throw new RangeError("Nepodržana jedinica HbA1c.");
}

export function normalizeHeight(measurement: Measurement): Measurement {
  finiteValue(measurement.value);
  const unit = measurement.unit.trim().toLowerCase();
  if (unit === "cm") return { value: measurement.value, unit: "cm" };
  if (unit === "m") return { value: measurement.value * 100, unit: "cm" };
  throw new RangeError("Nepodržana jedinica visine.");
}

export function normalizeWeight(measurement: Measurement): Measurement {
  finiteValue(measurement.value);
  const unit = measurement.unit.trim().toLowerCase();
  if (unit === "kg") return { value: measurement.value, unit: "kg" };
  if (unit === "g") return { value: measurement.value / 1000, unit: "kg" };
  throw new RangeError("Nepodržana jedinica težine.");
}
