import { test, expect } from "@playwright/test";

/**
 * Smoke tests RAIZ 2026 — rotas que não dependem de banco de dados.
 *
 * Cobre: landing (/), admin login (/admin/login), páginas legadas (/login, /register).
 * NÃO submete formulários que requerem BD.
 */
test.describe("raiz smoke", () => {
  /* ─── Landing (/) ─────────────────────────────────────────────── */

  test("landing: responde OK", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.ok()).toBeTruthy();
  });

  test("landing: html lang é pt-BR", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBe("pt-BR");
  });

  test("landing: contém exatamente um h1", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("landing: h1 contém RAIZ 2026", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("RAIZ");
    // O texto "2026" aparece dentro do mesmo h1 (em um <span>)
    await expect(page.locator("h1")).toContainText("2026");
  });

  test("landing: link/botão de inscrição aponta para /inscricao", async ({ page }) => {
    await page.goto("/");
    // Home em arte: o CTA é um link de overlay (aria-label "Quero participar")
    // que aponta para /inscricao. Localiza pelo href, robusto ao design.
    const inscricaoLink = page.locator('a[href="/inscricao"]').first();
    await expect(inscricaoLink).toBeVisible();
    const href = await inscricaoLink.getAttribute("href");
    expect(href).toMatch(/\/inscricao/);
  });

  test("landing: skip link 'Pular para o conteúdo' existe no DOM", async ({ page }) => {
    await page.goto("/");
    // O skip link é visualmente oculto mas deve existir no DOM (sr-only)
    const skipLink = page.getByRole("link", { name: /pular para o conteúdo/i });
    await expect(skipLink).toBeAttached();
    const href = await skipLink.getAttribute("href");
    expect(href).toBe("#main-content");
  });

  test("landing: texto 'RAIZ 2026' visível na página", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("RAIZ 2026").first()).toBeVisible();
  });

  /* ─── Admin login (/admin/login) ──────────────────────────────── */

  test("admin/login: responde OK", async ({ page }) => {
    const res = await page.goto("/admin/login");
    expect(res?.ok()).toBeTruthy();
  });

  test("admin/login: heading 'Entrar no Painel RAIZ'", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(
      page.getByRole("heading", { name: /entrar no painel/i }),
    ).toBeVisible();
  });

  test("admin/login: campo de e-mail visível", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("textbox", { name: /e-mail/i })).toBeVisible();
  });

  test("admin/login: campo de senha visível", async ({ page }) => {
    await page.goto("/admin/login");
    // <input type="password"> não é 'textbox'; usa locator pelo label associado via Field
    await expect(page.locator("input[type='password']")).toBeVisible();
  });

  test("admin/login: botão de submit 'Entrar' visível", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(
      page.getByRole("button", { name: /^entrar$/i }),
    ).toBeVisible();
  });

  /* ─── /login (legado) ─────────────────────────────────────────── */

  test("/login: responde OK e menciona inscrição", async ({ page }) => {
    const res = await page.goto("/login");
    expect(res?.ok()).toBeTruthy();
    await expect(page.getByText(/inscri[çc]/i).first()).toBeVisible();
  });

  test("/login: contém link para /inscricao", async ({ page }) => {
    await page.goto("/login");
    const link = page.getByRole("link", { name: /insc[a-zçã]*/i }).first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/\/inscricao/);
  });

  /* ─── /register (legado) ──────────────────────────────────────── */

  test("/register: carrega e menciona inscrição", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    expect(page.url()).toMatch(/register/);
    await expect(page.getByText(/inscri[çc]/i).first()).toBeVisible();
  });

  test("/register: contém link para /inscricao", async ({ page }) => {
    await page.goto("/register");
    const link = page.getByRole("link", { name: /insc[a-zçã]*/i }).first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/\/inscricao/);
  });
});
