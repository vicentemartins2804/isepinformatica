import { describe, expect, it } from "vitest";
import { MESSAGE_MAX, parseContactForm } from "@/lib/contact";
import { csvField, toCsv } from "@/lib/csv";
import { formatRemaining } from "@/lib/countdown";
import { mockupKey } from "@/lib/options";
import { mockupImageBox } from "@/lib/mockup-view";
import { safeRedirectTarget } from "@/lib/redirect";
import { fillHours, HOUR_MS } from "@/lib/timeline";

describe("safeRedirectTarget (destino depois do login)", () => {
  it.each(["/admincp", "/admincp/", "/admincp?tab=1"])("aceita %s", (from) => {
    expect(safeRedirectTarget(from)).toBe(from);
  });

  it.each([
    ["um site externo", "https://mau.example"],
    ["um URL relativo ao protocolo", "//mau.example/admincp"],
    ["outra página do site", "/privacidade"],
    ["um caminho parecido", "/admincpx"],
    ["a própria página de login", "/admincp/login"],
    ["um valor que não é texto", null],
  ])("recusa %s", (_label, from) => {
    expect(safeRedirectTarget(from)).toBe("/admincp");
  });
});

describe("CSV", () => {
  it("põe os campos entre aspas e duplica as aspas internas", () => {
    expect(csvField('Design "1"')).toBe('"Design ""1"""');
  });

  it("começa com o BOM e usa ';' e CRLF", () => {
    const csv = toCsv([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('"a";"b"\r\n"1";"2"\r\n');
  });
});

describe("fillHours (gráfico de votos por hora)", () => {
  const h = (n: number) => new Date(Date.UTC(2026, 9, 1, n));

  it("preenche as horas sem votos com zero", () => {
    const filled = fillHours(
      [
        { hour: h(10), votes: 3 },
        { hour: h(13), votes: 1 },
      ],
      100,
    );
    expect(filled.map((x) => x.votes)).toEqual([3, 0, 0, 1]);
    expect(filled[1].hour.getTime() - filled[0].hour.getTime()).toBe(HOUR_MS);
  });

  it("limita às últimas horas pedidas", () => {
    const filled = fillHours(
      [
        { hour: h(0), votes: 1 },
        { hour: h(20), votes: 2 },
      ],
      5,
    );
    expect(filled).toHaveLength(5);
    expect(filled.at(-1)).toEqual({ hour: h(20), votes: 2 });
  });

  it("sem votos devolve uma lista vazia", () => {
    expect(fillHours([], 10)).toEqual([]);
  });
});

describe("mockupImageBox (ver frente e costas)", () => {
  it("'ambos' encaixa a imagem inteira, como object-fit: contain", () => {
    expect(mockupImageBox(2, "both")).toEqual({ left: 0, top: 25, width: 100, height: 50 });
  });

  it("'frente' mostra a metade esquerda centrada", () => {
    // Imagem 1,2:1 → cada metade é 0,6:1 e ocupa a altura toda.
    const box = mockupImageBox(1.2, "front");
    expect(box.height).toBe(100);
    expect(box.width).toBeCloseTo(120);
    expect(box.left).toBeCloseTo(20); // (100 - 60) / 2
  });

  it("'costas' mostra a metade direita centrada", () => {
    expect(mockupImageBox(1.2, "back").left).toBeCloseTo(-40); // 20 - 60
  });

  it("metades mais largas do que altas ocupam a largura toda", () => {
    expect(mockupImageBox(4, "back")).toEqual({ left: -100, top: 25, width: 200, height: 50 });
  });
});

describe("parseContactForm (formulário de contacto)", () => {
  const valid = { name: " Ana ", email: "ana@isep.ipp.pt", topic: "rgpd", message: " Quero apagar os meus dados. " };

  it("aceita uma mensagem válida e limpa os espaços", () => {
    expect(parseContactForm(valid)).toEqual({
      ok: true,
      value: { name: "Ana", email: "ana@isep.ipp.pt", topic: "rgpd", message: "Quero apagar os meus dados." },
    });
  });

  it("o nome é opcional", () => {
    const result = parseContactForm({ ...valid, name: "  " });
    expect(result.ok && result.value.name).toBeNull();
  });

  it.each([
    ["sem email", { email: "" }],
    ["um email inválido", { email: "ana@isep" }],
    ["um assunto desconhecido", { topic: "spam" }],
    ["uma mensagem vazia", { message: "   " }],
    ["uma mensagem longa demais", { message: "x".repeat(MESSAGE_MAX + 1) }],
    ["um nome longo demais", { name: "x".repeat(101) }],
  ])("recusa %s", (_label, change) => {
    expect(parseContactForm({ ...valid, ...change }).ok).toBe(false);
  });
});

describe("formatRemaining (contagem decrescente)", () => {
  const s = 1000;
  const min = 60 * s;
  const h = 60 * min;
  const d = 24 * h;

  it.each([
    [2 * d + 4 * h + 30 * min, "2 dias e 4 h"],
    [1 * d + 5 * min, "1 dia"],
    [1 * d + 1 * h, "1 dia e 1 h"],
    [4 * h + 12 * min + 59 * s, "4 h e 12 min"],
    [3 * h, "3 h"],
    [12 * min + 5 * s, "12 min e 05 s"],
    [45 * s + 999, "45 s"],
    [-5 * s, "0 s"],
  ])("%i ms → %s", (ms, expected) => {
    expect(formatRemaining(ms)).toBe(expected);
  });
});

describe("mockupKey (nome do ficheiro do mockup)", () => {
  it("versão normal e versão finalista", () => {
    expect(mockupKey("design-1", "verde")).toBe("design-1-verde");
    expect(mockupKey("design-1", "verde", true)).toBe("design-1-verde-finalista");
  });
});
