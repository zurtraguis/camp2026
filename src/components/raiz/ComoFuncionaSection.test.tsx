import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComoFuncionaSection } from "./ComoFuncionaSection";

describe("ComoFuncionaSection", () => {
  it("informa que a tribo sera revelada perto do acampamento", () => {
    render(<ComoFuncionaSection />);

    expect(screen.getByText("Descubra sua tribo")).toBeInTheDocument();
    expect(
      screen.getByText(/perto do acampamento você saberá qual é a sua tribo/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Receba sua tribo")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/no sabado voce descobre sua tribo/i),
    ).not.toBeInTheDocument();
  });
});
