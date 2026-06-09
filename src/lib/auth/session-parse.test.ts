import { describe, it, expect } from "vitest";
import { parseSessionPayload } from "./session-parse";

const base = {
  userId: "u1",
  name: "Fulano",
  email: "fulano@example.com",
  roles: ["gerente"],
};

const future = Math.floor(Date.now() / 1000) + 3600;
const past = Math.floor(Date.now() / 1000) - 3600;

describe("parseSessionPayload", () => {
  it("aceita payload válido e não expirado", () => {
    const session = parseSessionPayload({ ...base, exp: future });
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("u1");
    expect(session?.roles).toEqual(["gerente"]);
  });

  it("rejeita payload expirado", () => {
    expect(parseSessionPayload({ ...base, exp: past })).toBeNull();
  });

  it("rejeita payload sem exp (sessão legada)", () => {
    expect(parseSessionPayload(base)).toBeNull();
  });

  it("rejeita payload sem campos de identidade", () => {
    expect(parseSessionPayload({ exp: future })).toBeNull();
  });

  it("rejeita payload sem nenhum papel válido", () => {
    expect(
      parseSessionPayload({ ...base, roles: ["inexistente"], exp: future }),
    ).toBeNull();
  });

  it("aceita sessão legada de papel único (role)", () => {
    const session = parseSessionPayload({
      userId: "u2",
      name: "Beltrano",
      email: "beltrano@example.com",
      role: "medidor",
      exp: future,
    });
    expect(session?.roles).toEqual(["medidor"]);
  });
});
