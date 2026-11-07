// @vitest-environment jsdom
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App.js";

describe("pristupačnost osnovnog ekrana", () => {
  it("imenuje glavne kontrole i zadržava tastaturni fokusni indikator", async () => {
    render(<App />);
    expect(screen.getByRole("main")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Uporedite sintetički profil sa studijama",
      }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Opis profila ili pitanje")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Proveri kriterijume" })
        .getAttribute("type"),
    ).toBe("submit");
    const styles = await readFile(
      resolve(process.cwd(), "apps/web/src/styles.css"),
      "utf8",
    );
    expect(styles).toContain(":focus-visible");
  });
});
