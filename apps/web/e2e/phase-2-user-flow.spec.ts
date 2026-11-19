import { expect, test } from "@playwright/test";

test("synthetic profile → real-study corpus → visible citation and unknown criteria", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Proverite profil prema studijama",
    }),
  ).toBeVisible();
  await page
    .getByLabel("Opišite profil")
    .fill(
      "Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, bez insulina.",
    );
  await page.getByRole("button", { name: "Proveri kriterijume" }).click();

  await expect(page.locator("#results-heading")).toBeVisible({
    timeout: 25_000,
  });
  await expect(page.locator(".trial-card").first()).toBeVisible();
  await page
    .locator(".trial-card")
    .first()
    .locator(".trial-details > summary")
    .click();
  await expect(page.locator(".criterion").first()).toBeVisible();
  await expect(page.locator(".trial-unknown-count").first()).toBeVisible();
  await expect(page.locator(".trial-card .mono").first()).toContainText("NCT");
  await expect(page.locator(".technical-meta")).toContainText("Snimak studija");
  await expect(page.locator(".technical-meta")).toContainText(
    "Retrieval: lexical-only",
  );
  await expect(page.locator(".technical-meta")).not.toHaveAttribute("open", "");
  await expect(page.locator(".mode-badge.mode-demo")).toBeVisible();
});

test("invalid profile response is shown as an accessible error", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Opišite profil").fill("HbA1c neispravno");
  await page.getByRole("button", { name: "Proveri kriterijume" }).click();
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
});
