import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signSession, verifySessionToken } from "@/lib/jwt";

describe("sessões JWT do painel", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "x".repeat(40);
  });
  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it("aceita um token válido e devolve o conteúdo", async () => {
    const token = await signSession({ username: "org", version: 3 });
    expect(await verifySessionToken(token)).toEqual({ username: "org", version: 3 });
  });

  it("recusa tokens adulterados, em falta ou assinados com outro segredo", async () => {
    const token = await signSession({ username: "org", version: 1 });
    expect(await verifySessionToken(token.slice(0, -2) + "xx")).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();
    process.env.SESSION_SECRET = "y".repeat(40);
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("exige um segredo com pelo menos 32 caracteres", async () => {
    process.env.SESSION_SECRET = "curto";
    await expect(signSession({ username: "org", version: 1 })).rejects.toThrow(/SESSION_SECRET/);
  });
});
