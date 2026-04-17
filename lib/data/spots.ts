import { cache } from "react"
import { unstable_cache } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { toMs } from "@/utils/firestore"

export type SpotRow = {
  id: string
  name: string
  description: string
  address: string
  country: string
  lat: number
  lng: number
  styles: string[]
  sectorCount: number
  teamId: string
  addedBy: string
  createdAt: number
  parking?: { lat: number; lng: number; note?: string }
  photoUrl: string | null
}

export type SectorRow = {
  id: string
  name: string
  description: string
  style: string[]
  grades: { min: string; max: string }
  teamId: string
  orientation?: string
  photoUrl: string | null
  addedBy: string
  createdAt: number
}

export type SpotWithSectors = SpotRow & { sectors: SectorRow[] }

export type SpotName = { id: string; name: string; teamId: string }

// TTL de base : 5 minutes. Les mutations appellent revalidateTag("spots") pour
// invalider immédiatement sans attendre l'expiration.
const SPOTS_TTL = 300

// ─── getSpots ──────────────────────────────────────────────────────────────
// Utilisé quand on n'a pas besoin des secteurs (stats, listes légères).

const _getSpots = unstable_cache(
  async (): Promise<SpotRow[]> => {
    const snapshot = await adminDb
      .collection("climbingSpots")
      .orderBy("createdAt", "desc")
      .get()

    return snapshot.docs.map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        name: d.name ?? "—",
        description: d.description ?? "",
        address: d.location?.address ?? "—",
        country: d.location?.country ?? "—",
        lat: d.location?.lat ?? 0,
        lng: d.location?.lng ?? 0,
        styles: d.styles ?? [],
        sectorCount: d.sectorCount ?? 0,
        teamId: d.teamId ?? "",
        addedBy: d.addedBy ?? "—",
        createdAt: toMs(d.createdAt),
        parking: d.parking
          ? { lat: d.parking.lat, lng: d.parking.lng, note: d.parking.note }
          : undefined,
        photoUrl: d.photoUrl ?? null,
      }
    })
  },
  ["spots"],
  { tags: ["spots"], revalidate: SPOTS_TTL }
)

/** Liste des spots sans secteurs. Dédupliquée intra-requête + mise en cache cross-requête. */
export const getSpots = cache(_getSpots)

// ─── getSpotsWithSectors ───────────────────────────────────────────────────
// Optimisation clé : collectionGroup("sectors") → 2 requêtes Firestore au lieu
// de 1 + N (une par spot). Sur 50 spots : 51 requêtes → 2.

const _getSpotsWithSectors = unstable_cache(
  async (): Promise<SpotWithSectors[]> => {
    // 2 requêtes parallèles au lieu de 1 + N
    // collectionGroup sans orderBy → pas d'index collection group requis.
    // Le tri par createdAt se fait en mémoire après regroupement.
    const [spotsSnap, sectorsSnap] = await Promise.all([
      adminDb.collection("climbingSpots").orderBy("createdAt", "desc").get(),
      adminDb.collectionGroup("sectors").get(),
    ])

    // Grouper les secteurs par spotId via la référence parente
    const sectorsBySpotId = new Map<string, SectorRow[]>()
    for (const doc of sectorsSnap.docs) {
      const spotId = doc.ref.parent.parent!.id
      const sd = doc.data()
      const sector: SectorRow = {
        id: doc.id,
        name: sd.name ?? "—",
        description: sd.description ?? "",
        style: sd.style ?? [],
        grades: sd.grades ?? { min: "", max: "" },
        teamId: sd.teamId ?? "",
        orientation: sd.orientation,
        photoUrl: sd.photoUrl ?? null,
        addedBy: sd.addedBy ?? "—",
        createdAt: toMs(sd.createdAt),
      }
      const existing = sectorsBySpotId.get(spotId)
      if (existing) {
        existing.push(sector)
      } else {
        sectorsBySpotId.set(spotId, [sector])
      }
    }

    return spotsSnap.docs.map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        name: d.name ?? "—",
        description: d.description ?? "",
        address: d.location?.address ?? "—",
        country: d.location?.country ?? "—",
        lat: d.location?.lat ?? 0,
        lng: d.location?.lng ?? 0,
        styles: d.styles ?? [],
        sectorCount: d.sectorCount ?? 0,
        teamId: d.teamId ?? "",
        addedBy: d.addedBy ?? "—",
        createdAt: toMs(d.createdAt),
        parking: d.parking
          ? { lat: d.parking.lat, lng: d.parking.lng, note: d.parking.note }
          : undefined,
        photoUrl: d.photoUrl ?? null,
        // Tri en mémoire (orderBy Firestore nécessiterait un index collection group)
        sectors: (sectorsBySpotId.get(doc.id) ?? []).sort((a, b) => a.createdAt - b.createdAt),
      }
    })
  },
  ["spots-with-sectors"],
  { tags: ["spots"], revalidate: SPOTS_TTL }
)

/** Spots avec leurs secteurs. Utilise collectionGroup → 2 requêtes Firestore seulement. */
export const getSpotsWithSectors = cache(_getSpotsWithSectors)

// ─── getSpotNames ──────────────────────────────────────────────────────────
// Projection minimale (id + name) pour les selects/dropdowns (ex: scraper).
// Évite de charger les secteurs juste pour un menu déroulant.

const _getSpotNames = unstable_cache(
  async (): Promise<SpotName[]> => {
    const snap = await adminDb
      .collection("climbingSpots")
      .orderBy("name")
      .select("name", "teamId")
      .get()

    return snap.docs.map((doc) => ({
      id: doc.id,
      name: (doc.data().name as string) ?? doc.id,
      teamId: (doc.data().teamId as string) ?? "",
    }))
  },
  ["spot-names"],
  { tags: ["spots"], revalidate: SPOTS_TTL }
)

/** Liste id+name uniquement (projection Firestore). Pour les dropdowns. */
export const getSpotNames = cache(_getSpotNames)
