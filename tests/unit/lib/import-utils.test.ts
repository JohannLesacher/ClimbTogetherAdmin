import { describe, it, expect } from "vitest"
import { parseImportJson, buildFormPayload, type FormState } from "@/lib/import-utils"

// ─── parseImportJson ──────────────────────────────────────────────────────────

describe("parseImportJson", () => {
  const validSpot = {
    name: "Amazonia",
    description: "Spot brésilien",
    location: { lat: -3.4, lng: -62.2, address: "Amazonie", country: "Brésil" },
    styles: ["sport"],
    sectors: [],
  }

  it("parse un JSON valide avec un spot sans secteurs", () => {
    const json = JSON.stringify({ data: [validSpot] })
    const result = parseImportJson(json)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.count).toBe(1)
    expect(result.sectorCount).toBe(0)
  })

  it("compte les secteurs dans plusieurs spots", () => {
    const spotWithSectors = {
      ...validSpot,
      sectors: [
        { name: "Secteur A", style: ["sport"], grades: { min: "5a", max: "7b" } },
        { name: "Secteur B", style: ["sport"], grades: { min: "6a", max: "8a" } },
      ],
    }
    const json = JSON.stringify({ data: [validSpot, spotWithSectors] })
    const result = parseImportJson(json)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.count).toBe(2)
    expect(result.sectorCount).toBe(2)
  })

  it("accepte l'enveloppe d'export { exportedAt, count, data: [...] }", () => {
    const json = JSON.stringify({
      exportedAt: "2025-01-15T10:30:00Z",
      count: 1,
      data: [validSpot],
    })
    const result = parseImportJson(json)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.count).toBe(1)
  })

  it("retourne ok:false si la clé 'data' est absente", () => {
    const json = JSON.stringify({ spots: [validSpot] })
    const result = parseImportJson(json)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('"data"')
  })

  it("retourne ok:false si data est un tableau vide", () => {
    const json = JSON.stringify({ data: [] })
    const result = parseImportJson(json)

    expect(result.ok).toBe(false)
  })

  it("retourne ok:false pour un JSON syntaxiquement invalide", () => {
    const result = parseImportJson("{invalide}")
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("JSON invalide")
  })

  it("retourne ok:false pour une chaîne vide", () => {
    // Les fonctions appelantes évitent les chaînes vides, mais on teste quand même
    const result = parseImportJson("")
    expect(result.ok).toBe(false)
  })

  it("préserve l'objet raw pour la soumission API", () => {
    const payload = { data: [validSpot] }
    const result = parseImportJson(JSON.stringify(payload))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.raw).toEqual(payload)
  })
})

// ─── buildFormPayload ─────────────────────────────────────────────────────────

const baseForm: FormState = {
  name: "Font",
  description: "Forêt de Fontainebleau",
  address: "Forêt de Font",
  country: "France",
  lat: "48.4167",
  lng: "2.6833",
  styles: ["boulder"],
  parkingLat: "",
  parkingLng: "",
  parkingNote: "",
  photoUrl: "",
  addedBy: "admin",
}

describe("buildFormPayload", () => {
  it("construit un payload valide depuis un formulaire complet", () => {
    const payload = buildFormPayload(baseForm)

    expect(payload).not.toBeNull()
    expect(payload?.data).toHaveLength(1)

    const spot = (payload?.data as unknown[])[0] as Record<string, unknown>
    expect(spot.name).toBe("Font")
    expect(spot.styles).toEqual(["boulder"])
    expect((spot.location as Record<string, unknown>).lat).toBeCloseTo(48.4167)
  })

  it("retourne null si latitude invalide", () => {
    expect(buildFormPayload({ ...baseForm, lat: "invalid" })).toBeNull()
    expect(buildFormPayload({ ...baseForm, lat: "" })).toBeNull()
  })

  it("retourne null si longitude invalide", () => {
    expect(buildFormPayload({ ...baseForm, lng: "abc" })).toBeNull()
  })

  it("inclut le parking si les deux coordonnées sont renseignées", () => {
    const form = { ...baseForm, parkingLat: "48.42", parkingLng: "2.69" }
    const payload = buildFormPayload(form)
    const spot = (payload?.data as unknown[])[0] as Record<string, unknown>
    expect(spot.parking).toBeDefined()
    expect((spot.parking as Record<string, unknown>).lat).toBeCloseTo(48.42)
  })

  it("inclut la note de parking si renseignée", () => {
    const form = { ...baseForm, parkingLat: "48.42", parkingLng: "2.69", parkingNote: "Gratuit" }
    const payload = buildFormPayload(form)
    const spot = (payload?.data as unknown[])[0] as Record<string, unknown>
    expect((spot.parking as Record<string, unknown>).note).toBe("Gratuit")
  })

  it("retourne null si une seule coordonnée parking est invalide", () => {
    const form = { ...baseForm, parkingLat: "48.42", parkingLng: "invalid" }
    expect(buildFormPayload(form)).toBeNull()
  })

  it("n'inclut pas le champ parking si les deux coordonnées sont vides", () => {
    const payload = buildFormPayload(baseForm) // parkingLat et parkingLng vides
    const spot = (payload?.data as unknown[])[0] as Record<string, unknown>
    expect(spot.parking).toBeUndefined()
  })

  it("inclut photoUrl si renseignée", () => {
    const form = { ...baseForm, photoUrl: "https://example.com/img.jpg" }
    const payload = buildFormPayload(form)
    const spot = (payload?.data as unknown[])[0] as Record<string, unknown>
    expect(spot.photoUrl).toBe("https://example.com/img.jpg")
  })

  it("n'inclut pas photoUrl si vide", () => {
    const payload = buildFormPayload(baseForm)
    const spot = (payload?.data as unknown[])[0] as Record<string, unknown>
    expect(spot.photoUrl).toBeUndefined()
  })

  it("utilise 'admin' comme valeur par défaut pour addedBy", () => {
    const form = { ...baseForm, addedBy: "" }
    const payload = buildFormPayload(form)
    const spot = (payload?.data as unknown[])[0] as Record<string, unknown>
    expect(spot.addedBy).toBe("admin")
  })
})
