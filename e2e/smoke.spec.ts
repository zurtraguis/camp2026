import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("home responde", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.ok()).toBeTruthy();
  });

  test("login responde", async ({ page }) => {
    const res = await page.goto("/login");
    expect(res?.ok()).toBeTruthy();
  });

  test("register carrega", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    expect(page.url()).toMatch(/register/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("dashboard requer sessao ou redireciona", async ({ page }) => {
    const res = await page.goto("/dashboard");
    expect(res).not.toBeNull();
    const ok = res!.ok();
    const redirect = res!.status() >= 300 && res!.status() < 400;
    expect(ok || redirect).toBeTruthy();
  });
});
