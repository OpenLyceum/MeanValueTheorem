import { expect, test } from "@playwright/test";

for (const screen of [1]) {
  test(`the car is directly keyboard-draggable on screen ${screen}`, async ({ page }) => {
    await page.goto(`/?ea&screens=${screen}`);
    const car = page.getByText("Car on the road", { exact: true });
    const time = page.getByRole("slider", { name: "Time (s)", exact: true });
    await car.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(car).toBeFocused();
    const start = Number(await time.getAttribute("aria-valuenow"));
    await page.keyboard.press("ArrowRight");
    const afterMove = Number(await time.getAttribute("aria-valuenow"));
    expect(afterMove).toBeGreaterThan(start);
    await page.keyboard.press("Shift+ArrowLeft");
    const afterFineMove = Number(await time.getAttribute("aria-valuenow"));
    expect(afterFineMove).toBeLessThan(afterMove);
    expect(afterFineMove).toBeGreaterThan(start);
    await expect(car).toBeFocused();
  });
}

test("keyboard focus can enter and leave the Simulation preferences panel", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?ea&screens=1");
  await page.getByRole("button", { name: "Preferences", exact: true }).press("Enter");
  const dialog = page.getByRole("dialog", { name: "Preferences" });
  await dialog.getByRole("tab", { name: "Overview", exact: true }).press("ArrowRight");
  const simulationTab = dialog.getByRole("tab", { name: "Simulation", exact: true });
  await expect(simulationTab).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(simulationTab).not.toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(simulationTab).toBeFocused();
  expect(errors).toEqual([]);
});
