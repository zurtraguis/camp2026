import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("junta classes truthy e ignora falsy", () => {
    expect(cn("a", false, "b", null, undefined, "c")).toBe("a b c");
  });

  it("retorna string vazia sem argumentos", () => {
    expect(cn()).toBe("");
  });
});
