import { describe, it, expect } from "vitest"
import { toMs, formatDate } from "@/utils/firestore"

// ─── toMs ────────────────────────────────────────────────────────────────────

describe("toMs", () => {
  it("retourne 0 pour une valeur falsy", () => {
    expect(toMs(null)).toBe(0)
    expect(toMs(undefined)).toBe(0)
    expect(toMs(0)).toBe(0)
  })

  it("retourne la valeur telle quelle si c'est déjà un number", () => {
    expect(toMs(1700000000000)).toBe(1700000000000)
    expect(toMs(42)).toBe(42)
  })

  it("convertit un objet Date en millisecondes", () => {
    const date = new Date("2024-01-15T00:00:00.000Z")
    expect(toMs(date)).toBe(date.getTime())
  })

  it("appelle toMillis() si disponible (Admin SDK Timestamp)", () => {
    const fakeTimestamp = { toMillis: () => 1705276800000 }
    expect(toMs(fakeTimestamp)).toBe(1705276800000)
  })

  it("convertit un objet plain { seconds, nanoseconds }", () => {
    const ts = { seconds: 1700000000, nanoseconds: 0 }
    expect(toMs(ts)).toBe(1700000000 * 1000)
  })

  it("retourne 0 pour un objet sans seconds ni toMillis", () => {
    expect(toMs({ foo: "bar" })).toBe(0)
  })
})

// ─── formatDate ──────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("retourne '—' pour 0", () => {
    expect(formatDate(0)).toBe("—")
  })

  it("formate une date en français (JJ mois AAAA)", () => {
    // 15 janvier 2024 à minuit UTC
    const ms = new Date("2024-01-15T00:00:00.000Z").getTime()
    const result = formatDate(ms)
    // Le format exact dépend de la locale système mais doit contenir "2024"
    expect(result).toContain("2024")
    expect(result).not.toBe("—")
  })

  it("produit une chaîne non vide pour un timestamp valide", () => {
    expect(formatDate(1700000000000).length).toBeGreaterThan(0)
  })
})
