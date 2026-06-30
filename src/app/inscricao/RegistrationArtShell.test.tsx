import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegistrationArtShell } from "./RegistrationArtShell";

describe("RegistrationArtShell", () => {
  it("renders the RAIZ artwork-inspired form shell", () => {
    render(
      <RegistrationArtShell>
        <div data-testid="form-content">PAGAMENTO</div>
      </RegistrationArtShell>,
    );

    const page = screen.getByTestId("registration-art-shell");
    expect(page).toHaveClass("registration-scene");
    expect(page).not.toHaveClass("bg-[url('/raiz-art/forms.png')]");
    expect(screen.getByTestId("registration-header-art")).toBeInTheDocument();
    expect(screen.getByTestId("registration-panel")).toHaveClass("root-card");
    expect(screen.getByText("PAGAMENTO")).toBeInTheDocument();
  });
});
