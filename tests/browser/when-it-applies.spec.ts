import { expect, test } from "@playwright/test";

test("hypothesis feedback identifies the corner route while the smooth route is selected", async ({ page }) => {
  await page.goto("/?screens=2&ea");
  await page.getByRole("button", { name: "Change route" }).press("Enter");
  const details = page.getByRole("paragraph").filter({ hasText: /^Steady acceleration\./ });

  await page.getByRole("button", { name: "Differentiability" }).press("Enter");
  await expect(details).toContainText(
    "On the corner route, position is continuous. The one-sided slopes differ at 5 s.",
  );

  await page.getByRole("button", { name: "Continuity", exact: true }).press("Enter");
  await expect(details).toContainText("On the corner route, both sides of the position graph meet at 5 s.");
});
