/**
 * Fonctions pures extraites de SpotImportDialog.
 * Aucune dépendance browser / React — testables unitairement en environnement node.
 */

export type SpotStyle = "sport" | "trad" | "boulder"

export type FormState = {
  name: string
  description: string
  address: string
  country: string
  lat: string
  lng: string
  styles: SpotStyle[]
  parkingLat: string
  parkingLng: string
  parkingNote: string
  photoUrl: string
  addedBy: string
  teamId: string
}

export type ParsedPreview =
  | { ok: true; count: number; sectorCount: number; raw: unknown }
  | { ok: false; error: string }

/** Parse et valide le texte JSON collé dans le dialog d'import. */
export function parseImportJson(text: string): ParsedPreview {
  try {
    const json = JSON.parse(text) as Record<string, unknown>

    const data = json.data
    if (!Array.isArray(data)) {
      return { ok: false, error: 'Le JSON doit contenir une clé "data" avec un tableau.' }
    }
    if (data.length === 0) {
      return { ok: false, error: "Le tableau data est vide." }
    }

    const sectorCount = data.reduce((acc: number, spot: unknown) => {
      const s = spot as Record<string, unknown>
      return acc + (Array.isArray(s.sectors) ? (s.sectors as unknown[]).length : 0)
    }, 0)

    return { ok: true, count: data.length, sectorCount, raw: json }
  } catch {
    return { ok: false, error: "JSON invalide. Vérifiez la syntaxe." }
  }
}

/** Construit le payload API à partir de l'état du formulaire. Retourne null si les coordonnées sont invalides. */
export function buildFormPayload(form: FormState): Record<string, unknown> | null {
  const lat = parseFloat(form.lat)
  const lng = parseFloat(form.lng)
  if (isNaN(lat) || isNaN(lng)) return null

  const hasParking = form.parkingLat !== "" || form.parkingLng !== ""
  const parkingLat = parseFloat(form.parkingLat)
  const parkingLng = parseFloat(form.parkingLng)
  if (hasParking && (isNaN(parkingLat) || isNaN(parkingLng))) return null

  return {
    data: [
      {
        name: form.name,
        description: form.description,
        location: { lat, lng, address: form.address, country: form.country },
        styles: form.styles,
        ...(hasParking && {
          parking: {
            lat: parkingLat,
            lng: parkingLng,
            ...(form.parkingNote && { note: form.parkingNote }),
          },
        }),
        ...(form.photoUrl && { photoUrl: form.photoUrl }),
        addedBy: form.addedBy || "admin",
        teamId: form.teamId,
      },
    ],
  }
}
