/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SpotImportDialog } from "@/components/dashboard/spot-import-dialog"

// ─── Mocks Next.js ───────────────────────────────────────────────────────────

const mockRefresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_JSON = JSON.stringify({
  data: [
    {
      name: "Amazonia",
      description: "Spot brésilien",
      location: { lat: -3.4, lng: -62.2, address: "Amazonie", country: "Brésil" },
      styles: ["sport"],
      sectors: [],
    },
  ],
})

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: /importer un spot/i }))
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SpotImportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe("rendu initial", () => {
    it("affiche le bouton 'Importer un spot'", () => {
      render(<SpotImportDialog />)
      expect(screen.getByRole("button", { name: /importer un spot/i })).toBeInTheDocument()
    })

    it("le dialog est fermé par défaut", () => {
      render(<SpotImportDialog />)
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("ouvre le dialog au clic sur le bouton", () => {
      render(<SpotImportDialog />)
      openDialog()
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    it("affiche les onglets JSON et Formulaire", () => {
      render(<SpotImportDialog />)
      openDialog()
      expect(screen.getByText("JSON")).toBeInTheDocument()
      expect(screen.getByText("Formulaire")).toBeInTheDocument()
    })

    it("démarre en mode JSON par défaut", () => {
      render(<SpotImportDialog />)
      openDialog()
      expect(screen.getByPlaceholderText(/data/i)).toBeInTheDocument()
    })
  })

  describe("mode JSON", () => {
    it("affiche un aperçu positif pour un JSON valide", async () => {
      render(<SpotImportDialog />)
      openDialog()

      fireEvent.change(screen.getByRole("textbox"), { target: { value: VALID_JSON } })

      await waitFor(() => {
        expect(screen.getByText(/1 spot détecté/i)).toBeInTheDocument()
      })
    })

    it("affiche une erreur pour un JSON syntaxiquement invalide", async () => {
      render(<SpotImportDialog />)
      openDialog()

      fireEvent.change(screen.getByRole("textbox"), { target: { value: "{pas du json" } })

      await waitFor(() => {
        expect(screen.getByText(/JSON invalide/i)).toBeInTheDocument()
      })
    })

    it("affiche une erreur si la clé 'data' est absente", async () => {
      render(<SpotImportDialog />)
      openDialog()

      fireEvent.change(screen.getByRole("textbox"), { target: { value: JSON.stringify({ spots: [] }) } })

      await waitFor(() => {
        expect(screen.getByText(/clé "data"/i)).toBeInTheDocument()
      })
    })

    it("le bouton Importer est désactivé tant qu'il n'y a pas de JSON valide", () => {
      render(<SpotImportDialog />)
      openDialog()
      const importBtn = screen.getByRole("button", { name: /^importer/i })
      expect(importBtn).toBeDisabled()
    })

    it("soumet le JSON valide à l'API et appelle router.refresh()", async () => {
      const user = userEvent.setup()
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ imported: 1, ids: ["id1"] }),
      } as Response)

      render(<SpotImportDialog />)
      openDialog()

      fireEvent.change(screen.getByRole("textbox"), { target: { value: VALID_JSON } })

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /importer \(1\)/i })).not.toBeDisabled()
      })

      await user.click(screen.getByRole("button", { name: /importer \(1\)/i }))

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/spots/import",
          expect.objectContaining({ method: "POST" })
        )
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it("affiche les erreurs de validation renvoyées par l'API", async () => {
      const user = userEvent.setup()
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: "Données invalides",
          issues: [{ path: "data.0.name", message: "Requis" }],
        }),
      } as Response)

      render(<SpotImportDialog />)
      openDialog()

      fireEvent.change(screen.getByRole("textbox"), { target: { value: VALID_JSON } })

      await waitFor(() =>
        expect(screen.getByRole("button", { name: /importer \(1\)/i })).not.toBeDisabled()
      )

      await user.click(screen.getByRole("button", { name: /importer \(1\)/i }))

      await waitFor(() => {
        expect(screen.getByText(/Requis/i)).toBeInTheDocument()
      })
    })
  })

  describe("mode Formulaire", () => {
    async function switchToForm() {
      const user = userEvent.setup()
      await user.click(screen.getByText("Formulaire"))
    }

    it("bascule vers le formulaire au clic sur l'onglet", async () => {
      render(<SpotImportDialog />)
      openDialog()
      await switchToForm()
      expect(screen.getByLabelText(/nom/i)).toBeInTheDocument()
    })

    it("affiche les champs obligatoires (nom, description, adresse, lat, lng)", async () => {
      render(<SpotImportDialog />)
      openDialog()
      await switchToForm()

      expect(screen.getByLabelText(/nom/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/adresse/i)).toBeInTheDocument()
      // Plusieurs champs latitude/longitude (spot + parking) — on vérifie qu'au moins un existe
      expect(screen.getAllByLabelText(/latitude/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByLabelText(/longitude/i).length).toBeGreaterThanOrEqual(1)
    })

    it("affiche les checkboxes de style (Sportive, Trad, Bloc)", async () => {
      render(<SpotImportDialog />)
      openDialog()
      await switchToForm()

      expect(screen.getByText("Sportive")).toBeInTheDocument()
      expect(screen.getByText("Trad")).toBeInTheDocument()
      expect(screen.getByText("Bloc")).toBeInTheDocument()
    })

    it("affiche une erreur si aucun style n'est sélectionné à la soumission", async () => {
      const user = userEvent.setup()
      render(<SpotImportDialog />)
      openDialog()
      await switchToForm()

      // Remplit les champs obligatoires
      await user.type(screen.getByLabelText(/nom/i), "Test Spot")
      await user.type(screen.getByLabelText(/description/i), "Une description")
      await user.type(screen.getByLabelText(/adresse/i), "Adresse test")
      await user.type(screen.getByLabelText(/pays/i), "France")

      // Cherche les champs latitude/longitude (il peut en avoir plusieurs - prend le premier)
      const latInputs = screen.getAllByLabelText(/latitude/i)
      const lngInputs = screen.getAllByLabelText(/longitude/i)
      await user.type(latInputs[0], "48.4")
      await user.type(lngInputs[0], "2.6")

      await user.click(screen.getByRole("button", { name: /importer le spot/i }))

      await waitFor(() => {
        expect(screen.getByText(/style d'escalade/i)).toBeInTheDocument()
      })
    })

    it("soumet le formulaire et appelle l'API avec le bon payload", async () => {
      const user = userEvent.setup()
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ imported: 1, ids: ["id1"] }),
      } as Response)

      render(<SpotImportDialog />)
      openDialog()
      await switchToForm()

      await user.type(screen.getByLabelText(/nom/i), "Font")
      await user.type(screen.getByLabelText(/description/i), "Site mythique")
      await user.type(screen.getByLabelText(/adresse/i), "Forêt")
      await user.type(screen.getByLabelText(/pays/i), "France")

      const latInputs = screen.getAllByLabelText(/latitude/i)
      const lngInputs = screen.getAllByLabelText(/longitude/i)
      await user.type(latInputs[0], "48.4")
      await user.type(lngInputs[0], "2.6")

      // Coche le style "Bloc" via click sur le label
      await user.click(screen.getByText("Bloc"))

      await user.click(screen.getByRole("button", { name: /importer le spot/i }))

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/spots/import",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("Font"),
          })
        )
      })
    })
  })

  describe("réinitialisation", () => {
    it("réinitialise le formulaire à la fermeture du dialog", async () => {
      const user = userEvent.setup()
      render(<SpotImportDialog />)
      openDialog()

      fireEvent.change(screen.getByRole("textbox"), { target: { value: VALID_JSON } })

      await waitFor(() => screen.getByText(/1 spot détecté/i))

      // Ferme via le bouton Annuler
      await user.click(screen.getByRole("button", { name: /annuler/i }))

      // Réouvre
      openDialog()
      expect(screen.getByRole("textbox")).toHaveValue("")
    })
  })
})
