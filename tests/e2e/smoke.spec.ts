import { expect, test } from "@playwright/test";

test.describe("página de voto", () => {
  test("mostra uma popup de estado antes da votação", async ({ page }) => {
    await page.goto("/");
    // Qual aparece depende do horário configurado: sem votação, por abrir ou aberta.
    const popup = page.getByRole("alertdialog").or(page.getByRole("dialog"));
    await expect(popup).toBeVisible();
    await expect(popup).toContainText(
      /Não há nenhuma votação aberta|A votação ainda não abriu|A votação está aberta/,
    );
  });

  test("tem rodapé com ligação à privacidade", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("Engenharia Informática");
    await footer.getByRole("link", { name: "Privacidade" }).click();
    await expect(page).toHaveURL(/\/privacidade$/);
  });

  test("tem imagem de pré-visualização para partilhar o link", async ({ page, request }) => {
    await page.goto("/");
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toContain("/opengraph-image");
    const response = await request.get("/opengraph-image");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  });
});

test("a página de privacidade explica o que é guardado", async ({ page }) => {
  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { level: 1, name: "Privacidade" })).toBeVisible();
  await expect(page.getByText("identificação anónima do dispositivo", { exact: false }).first()).toBeVisible();
});

test("endereços inexistentes mostram a página 404 do site", async ({ page }) => {
  const response = await page.goto("/nao-existe");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  await page.getByRole("link", { name: "Ir para a votação" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test.describe("área de administração sem sessão", () => {
  test("/admincp redireciona para o login", async ({ page }) => {
    await page.goto("/admincp");
    await expect(page).toHaveURL(/\/admincp\/login\?from=%2Fadmincp$/);
    await expect(page.getByRole("heading", { name: "Área reservada" })).toBeVisible();
  });

  for (const path of ["/api/admin/export", "/api/admin/qr"]) {
    test(`${path} recusa o acesso`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(401);
    });
  }
});

test("o rodapé leva à página de contacto, com o formulário", async ({ page }) => {
  await page.goto("/privacidade");
  await page.getByRole("contentinfo").getByRole("link", { name: "Contacto" }).click();
  await expect(page).toHaveURL(/\/contacto$/);
  await expect(page.getByRole("heading", { level: 1, name: "Contacta-nos" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Assunto")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar mensagem" })).toBeVisible();
});

test("a página de privacidade indica o contacto para exercer os direitos", async ({ page }) => {
  await page.goto("/privacidade");
  await page.getByRole("link", { name: "página de contacto" }).click();
  await expect(page).toHaveURL(/\/contacto$/);
});

test("envia os cabeçalhos de segurança", async ({ request }) => {
  const response = await request.get("/privacidade");
  const headers = response.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
});

test("o rodapé tem a ligação ao Instagram", async ({ page }) => {
  await page.goto("/privacidade");
  const link = page.getByRole("contentinfo").getByRole("link", { name: /Instagram/ });
  await expect(link).toHaveAttribute("href", "https://www.instagram.com/isepinformatica/");
  await expect(link).toHaveAttribute("target", "_blank");
});
