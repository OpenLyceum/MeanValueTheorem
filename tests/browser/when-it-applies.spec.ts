import { expect, test } from "@playwright/test";

test("the failing hypothesis follows the function and the interval", async ({ page }) => {
  await page.goto("/?screens=2&ea");
  // x³ − 3x on [−2, 2] satisfies both hypotheses.
  await page.getByRole("button", { name: "Neither", exact: true }).press("Enter");
  await expect(page.getByText(/Right\. Both hypotheses hold on \[a, b\]/)).toBeAttached();
  await page.getByRole("button", { name: "Continuity", exact: true }).press("Enter");
  await expect(page.getByText(/Not quite\. Both hypotheses hold/)).toBeAttached();
});

test("moving an endpoint across a corner changes the answer", async ({ page }) => {
  await page.goto("/?screens=2&ea");
  const functionBox = page.getByRole("button", { name: /^Function/ });
  await functionBox.press("Enter");
  await page.getByRole("option", { name: "f(x) = |x|" }).press("Enter");
  await page.getByRole("button", { name: "Differentiability", exact: true }).press("Enter");
  await expect(page.getByText(/Right\. f is continuous, but it has a corner at x = 0/)).toBeAttached();
  const a = page.getByText("Checkpoint a", { exact: true });
  for (let i = 0; i < 12; i++) {
    await a.press("ArrowRight");
  }
  await page.getByRole("button", { name: "Neither", exact: true }).press("Enter");
  await expect(page.getByText(/Right\. Both hypotheses hold/)).toBeAttached();
});
