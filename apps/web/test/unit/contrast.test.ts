import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(process.cwd(), "apps/web/src/styles.css"),
  "utf8",
);

// Blok :root { … } (prvi blok u datoteci).
function rootBlock(source: string): string {
  const start = source.indexOf(":root {");
  const end = source.indexOf("}", start);
  return source.slice(start, end + 1);
}

// Sve posle prvog bloka :root { … } (tokeni su jedini dozvoljeni izvor boja).
function outsideRoot(source: string): string {
  const end = source.indexOf("}", source.indexOf(":root {"));
  return source.slice(end + 1);
}

// Čita parove --naziv: #vrednost; iz bloka :root.
function tokens(source: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of rootBlock(source).matchAll(
    /--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g,
  )) {
    const name = match[1];
    const value = match[2];
    if (name !== undefined && value !== undefined) result[name] = value;
  }
  return result;
}

const colors = tokens(css);

function token(name: string): string {
  const value = colors[name];
  if (value === undefined) throw new Error(`Nedostaje token --${name}`);
  return value;
}

// Relativna luminansa po WCAG 2.x.
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Odnos kontrasta po WCAG 2.x, između dve boje tokena.
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("boje u styles.css", () => {
  it("styles.css nema doslovnih boja van :root", () => {
    const rest = outsideRoot(css);
    expect(rest).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // „white-space“ nije boja; traži se samo reč white kao vrednost.
    expect(rest).not.toMatch(/(?<![\w-])white(?![\w-])/);
    expect(rest).not.toContain("rgb(");
  });
});

describe("poluprečnici i oblik", () => {
  it("poluprečnici su samo iz tokena", () => {
    const values = [
      ...outsideRoot(css).matchAll(/border-radius:\s*([^;]+);/g),
    ].map((match) => (match[1] ?? "").trim());
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      const allowed =
        value === "0" ||
        value === "50%" ||
        value === "3px" ||
        /^var\(--radius-[\w-]+\)$/.test(value);
      expect(allowed, `border-radius: ${value}`).toBe(true);
    }
  });
});

describe("kontrast tokena", () => {
  const textPairs: [string, string][] = [
    ["met-ink", "met-bg"],
    ["not-met-ink", "not-met-bg"],
    ["unknown-ink", "unknown-bg"],
    ["pending-ink", "pending-bg"],
    ["demo-ink", "demo-bg"],
    ["live-ink", "live-bg"],
    ["notice-ink", "notice-bg"],
    ["ink", "bg"],
    ["ink-muted", "surface"],
    ["ink-muted", "live-bg"],
    ["ink-subtle", "bg"],
    ["ink-subtle", "surface"],
    ["ink-eyebrow", "surface"],
    ["ink-quote", "surface"],
    ["on-accent", "accent"],
    ["accent", "surface"],
  ];

  it("tekst na pozadini ima najmanje 4,5", () => {
    for (const [ink, bg] of textPairs) {
      const ratio = contrast(token(ink), token(bg));
      expect(ratio, `--${ink} na --${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("ivice, fokus i statusne boje imaju najmanje 3", () => {
    const nonTextPairs: [string, string][] = [
      ["focus", "bg"],
      ["focus", "surface"],
      ["focus", "notice-bg"],
      ["focus", "met-bg"],
      ["border-input", "surface"],
      ["met", "surface"],
      ["met", "border-soft"],
      ["not-met", "surface"],
      ["not-met", "border-soft"],
      ["unknown", "surface"],
      ["unknown", "border-soft"],
    ];
    for (const [part, bg] of nonTextPairs) {
      const ratio = contrast(token(part), token(bg));
      expect(ratio, `--${part} na --${bg}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("tačne vrednosti odobrenih tokena", () => {
    expect(token("focus")).toBe("#9a6700");
    expect(token("met-ink")).toBe("#15583f");
    expect(token("not-met-ink")).toBe("#842e24");
    expect(token("unknown-ink")).toBe("#4f5b70");
    expect(token("border-input")).toBe("#6f877b");
  });
});
