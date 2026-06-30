import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeArtExperience } from "./HomeArtExperience";

describe("HomeArtExperience", () => {
  it("renders the provided home artwork and corrected tribe reveal copy", () => {
    render(<HomeArtExperience />);

    expect(screen.getByAltText(/arte principal do acampamento raiz/i)).toHaveAttribute(
      "src",
      expect.stringContaining("home.webp"),
    );
    expect(screen.getByAltText(/como funciona/i)).toHaveAttribute(
      "src",
      expect.stringContaining("home-2.webp"),
    );
    expect(screen.queryByText(/serão reveladas perto do acamp/i)).toBeNull();
    expect(
      screen.getByText(/perto do acampamento você saberá qual é a sua tribo/i),
    ).toBeInTheDocument();
  });

  it("reveals a navigation menu from the artwork menu icon", () => {
    const { container } = render(<HomeArtExperience />);
    const view = within(container);

    const trigger = view.getByRole("button", {
      name: /abrir menu de navegação/i,
    });
    expect(view.queryByRole("link", { name: /^tribos$/i })).toBeNull();

    fireEvent.click(trigger);

    expect(view.getByRole("link", { name: /como funciona/i })).toHaveAttribute(
      "href",
      "#como-funciona",
    );
    expect(view.getByRole("link", { name: /^tribos$/i })).toHaveAttribute(
      "href",
      "#tribos",
    );
    expect(
      view.getByRole("link", { name: /quero me inscrever/i }),
    ).toHaveAttribute("href", "/inscricao");
  });

  it("uses compact art frames and green hover overlays on participation links", () => {
    render(<HomeArtExperience />);

    const sections = screen.getAllByRole("region");
    expect(sections[0]).toHaveClass("max-w-[1360px]");

    const links = screen.getAllByRole("link", { name: /quero participar/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveClass("hover:bg-verde-limao");
    }
  });

  it("opens FAQ answers from the artwork overlay", () => {
    render(<HomeArtExperience />);

    expect(screen.getAllByTestId("faq-answer-0")[0]).toHaveStyle({
      gridTemplateRows: "0fr",
    });

    fireEvent.click(
      screen.getAllByRole("button", {
        name: /qual a faixa etária do acampamento/i,
      })[0],
    );

    expect(screen.getAllByText(/adolescentes de 12 a 19 anos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("faq-answer-0")[0]).toHaveStyle({
      gridTemplateRows: "1fr",
    });
    expect(
      screen.getAllByRole("button", { name: /preciso de autoriza/i }).length,
    ).toBeGreaterThan(0);
  });
});
