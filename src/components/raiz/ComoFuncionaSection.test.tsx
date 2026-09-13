import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComoFuncionaSection } from "./ComoFuncionaSection";

describe("ComoFuncionaSection", () => {
  it("informa que a tribo sai na hora da inscrição", () => {
    render(<ComoFuncionaSection />);

    expect(screen.getByText("Descubra sua tribo")).toBeInTheDocument();
    expect(
      screen.getByText(/ao terminar a inscrição você já descobre a sua tribo/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Receba sua tribo")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/no sabado voce descobre sua tribo/i),
    ).not.toBeInTheDocument();
  });
});
