/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { DataTable, type Column } from "@/components/dashboard/data-table"

// ─── Types & données de test ─────────────────────────────────────────────────

type User = { id: number; name: string; email: string }

const COLUMNS: Column<User>[] = [
  { header: "ID", cell: (row) => row.id },
  { header: "Nom", cell: (row) => row.name },
  { header: "Email", cell: (row) => <a href={`mailto:${row.email}`}>{row.email}</a> },
]

const USERS: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
  { id: 3, name: "Charlie", email: "charlie@example.com" },
]

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("DataTable", () => {
  describe("en-têtes", () => {
    it("affiche toutes les colonnes définies", () => {
      render(<DataTable columns={COLUMNS} data={USERS} />)
      expect(screen.getByText("ID")).toBeInTheDocument()
      expect(screen.getByText("Nom")).toBeInTheDocument()
      expect(screen.getByText("Email")).toBeInTheDocument()
    })
  })

  describe("données", () => {
    it("affiche une ligne par élément du tableau", () => {
      render(<DataTable columns={COLUMNS} data={USERS} />)
      expect(screen.getByText("Alice")).toBeInTheDocument()
      expect(screen.getByText("Bob")).toBeInTheDocument()
      expect(screen.getByText("Charlie")).toBeInTheDocument()
    })

    it("rend le JSX produit par les fonctions cell", () => {
      render(<DataTable columns={COLUMNS} data={USERS} />)
      const link = screen.getByRole("link", { name: "alice@example.com" })
      expect(link).toHaveAttribute("href", "mailto:alice@example.com")
    })

    it("affiche les valeurs numériques", () => {
      render(<DataTable columns={COLUMNS} data={USERS} />)
      // Les IDs 1, 2, 3 doivent apparaître
      expect(screen.getByText("1")).toBeInTheDocument()
      expect(screen.getByText("2")).toBeInTheDocument()
    })
  })

  describe("état vide", () => {
    it("affiche le message par défaut si data est vide", () => {
      render(<DataTable columns={COLUMNS} data={[]} />)
      expect(screen.getByText("Aucune donnée.")).toBeInTheDocument()
    })

    it("affiche un message personnalisé si emptyMessage est fourni", () => {
      render(
        <DataTable
          columns={COLUMNS}
          data={[]}
          emptyMessage="Aucun utilisateur trouvé."
        />
      )
      expect(screen.getByText("Aucun utilisateur trouvé.")).toBeInTheDocument()
    })

    it("le colspan de la cellule vide correspond au nombre de colonnes", () => {
      const { container } = render(<DataTable columns={COLUMNS} data={[]} />)
      const emptyCell = container.querySelector("td[colspan]")
      expect(emptyCell).toHaveAttribute("colspan", String(COLUMNS.length))
    })
  })

  describe("colonne avec className", () => {
    it("applique la className de la colonne sur l'en-tête", () => {
      const cols: Column<User>[] = [
        { header: "ID", className: "w-16 text-right", cell: (r) => r.id },
      ]
      const { container } = render(<DataTable columns={cols} data={USERS} />)
      const th = container.querySelector("th.w-16")
      expect(th).not.toBeNull()
    })

    it("applique la className de la colonne sur les cellules", () => {
      const cols: Column<User>[] = [
        { header: "ID", className: "text-mono", cell: (r) => r.id },
      ]
      const { container } = render(<DataTable columns={cols} data={USERS} />)
      const tds = container.querySelectorAll("td.text-mono")
      expect(tds.length).toBe(USERS.length)
    })
  })

  describe("généricité", () => {
    it("fonctionne avec n'importe quel type de données", () => {
      type Product = { sku: string; price: number }
      const products: Product[] = [{ sku: "A001", price: 29.99 }]
      const cols: Column<Product>[] = [
        { header: "SKU", cell: (p) => p.sku },
        { header: "Prix", cell: (p) => `${p.price} €` },
      ]
      render(<DataTable columns={cols} data={products} />)
      expect(screen.getByText("A001")).toBeInTheDocument()
      expect(screen.getByText("29.99 €")).toBeInTheDocument()
    })
  })
})
