import { expect, test } from "@playwright/test";

test("synthetic profile → real-study corpus → visible citation and unknown criteria", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Uporedite sintetički profil sa studijama",
    }),
  ).toBeVisible();
  await page
    .getByLabel("Opis profila ili pitanje")
    .fill(
      "Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, bez insulina.",
    );
  await page.getByRole("button", { name: "Proveri kriterijume" }).click();

  await expect(page.locator("#results-heading")).toBeVisible({
    timeout: 25_000,
  });
  await expect(
    page.getByRole("heading", { name: "Pregled studija" }),
  ).toBeVisible();
  await expect(page.locator(".trial-card").first()).toBeVisible();
  await expect(page.locator(".criterion").first()).toBeVisible();
  await expect(page.locator(".criterion blockquote q").first()).toBeVisible();
  await expect(page.locator(".trial-card .mono").first()).toContainText("NCT");
  await expect(page.locator(".criterion-unknown").first()).toBeVisible();
  await expect(page.getByText("Snimak studija")).toBeVisible();
  await expect(page.locator(".mode-badge.mode-demo")).toBeVisible();
});

test("invalid profile response is shown as an accessible error", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Opis profila ili pitanje").fill("HbA1c neispravno");
  await page.getByRole("button", { name: "Proveri kriterijume" }).click();
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
});
