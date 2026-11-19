import { expect, test } from "@playwright/test";
import { okResponse } from "../test/helpers/responses.js";

test("captures the redesigned empty, desktop, mobile, and error states", async ({
  page,
}) => {
  let responseMode: "ok" | "error" = "ok";
  await page.route("**/api/runs", async (route) => {
    if (responseMode === "error") {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          error: {
            category: "tool_error",
            message: "Internal technical detail",
            retryable: true,
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(okResponse()),
    });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Rezultati provere" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/trialmatch-empty-desktop.png",
    fullPage: true,
  });

  await page
    .getByLabel("Opišite profil")
    .fill(
      "Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL.",
    );
  await page.getByRole("button", { name: "Proveri kriterijume" }).click();
  await expect(
    page.getByRole("heading", { name: "Provera je završena" }),
  ).toBeVisible();
  await expect(page.locator(".result-summary")).toContainText(
    "Provereno studija: 3",
  );
  await page
    .locator(".trial-details")
    .first()
    .locator("summary")
    .first()
    .click();
  await page.screenshot({
    path: "docs/screenshots/trialmatch-results-desktop.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".trial-details")
    .first()
    .locator("summary")
    .first()
    .click();
  await page.screenshot({
    path: "docs/screenshots/trialmatch-results-mobile.png",
    fullPage: true,
  });

  responseMode = "error";
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await page.getByLabel("Opišite profil").fill("Sintetički profil");
  await page.getByRole("button", { name: "Proveri kriterijume" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert").locator("button")).toHaveCount(1);
  await page.screenshot({
    path: "docs/screenshots/trialmatch-error-desktop.png",
    fullPage: true,
  });
});
