import { NextResponse } from "next/server"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { revalidateTag } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { z } from "zod"
import { requireAdminSession } from "@/lib/session"

const stylesEnum = z.enum(["sport", "trad", "boulder"])
const orientationEnum = z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"])

// Import schemas are intentionally lenient: they must accept whatever the
// export endpoint produces, including empty strings or missing optional fields.

const sectorImportSchema = z.object({
  id: z.string().optional(),
  name: z.string().default(""),
  style: z.array(stylesEnum).default([]),
  grades: z
    .object({ min: z.string().default(""), max: z.string().default("") })
    .default({ min: "", max: "" }),
  description: z.string().optional(),
  orientation: orientationEnum.optional(),
  // z.url() rejects empty strings — use plain string for round-trip compat
  photoUrl: z.string().nullable().optional(),
  addedBy: z.string().optional(),
  createdAt: z.number().optional(),
})

const spotImportSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().default(""),
  location: z.object({
    lat: z.number().default(0),
    lng: z.number().default(0),
    // Allow empty strings — scrapers may not have the address yet
    address: z.string().default(""),
    country: z.string().default(""),
  }),
  styles: z.array(stylesEnum).default([]),
  teamId: z.string().min(1, "L'équipe est requise"),
  parking: z
    .object({ lat: z.number(), lng: z.number(), note: z.string().optional() })
    .optional(),
  photoUrl: z.string().nullable().optional(),
  addedBy: z.string().default("admin"),
  createdAt: z.number().optional(),
  sectors: z.array(sectorImportSchema).default([]),
  // Fields present in the export format but ignored on import
  sectorCount: z.number().optional(),
  exportedAt: z.string().optional(),
})

const importBodySchema = z.object({
  // Also accept the export envelope { exportedAt, count, data: [...] }
  data: z.array(spotImportSchema).min(1),
  exportedAt: z.string().optional(),
  count: z.number().optional(),
})

function toTimestamp(ms?: number): FieldValue | Timestamp {
  if (!ms) return FieldValue.serverTimestamp()
  return Timestamp.fromMillis(ms)
}

export async function POST(request: Request) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const body: unknown = await request.json()
    const parsed = importBodySchema.safeParse(body)

    if (!parsed.success) {
      // Return the full issue list so the client can display precise paths
      return NextResponse.json(
        {
          error: "Données invalides",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      )
    }

    const importedIds: string[] = []

    // One batch per spot (spot doc + its sectors) → atomic per spot,
    // parallel across spots. Stays well under the 500-op Firestore limit.
    await Promise.all(
      parsed.data.data.map(async (spot) => {
        const batch = adminDb.batch()

        const spotRef = spot.id
          ? adminDb.collection("climbingSpots").doc(spot.id)
          : adminDb.collection("climbingSpots").doc()

        importedIds.push(spotRef.id)

        const { id: _id, sectors, sectorCount: _sc, exportedAt: _ea, ...spotFields } = spot

        batch.set(spotRef, {
          ...spotFields,
          sectorCount: sectors.length,
          createdAt: toTimestamp(spot.createdAt),
        })

        for (const sector of sectors) {
          const sectorRef = sector.id
            ? spotRef.collection("sectors").doc(sector.id)
            : spotRef.collection("sectors").doc()

          const { id: _sid, ...sectorFields } = sector

          batch.set(sectorRef, {
            ...sectorFields,
            teamId: spot.teamId,
            createdAt: toTimestamp(sector.createdAt),
          })
        }

        await batch.commit()
      })
    )

    revalidateTag("spots", { expire: 0 })
    return NextResponse.json(
      { imported: importedIds.length, ids: importedIds },
      { status: 201 }
    )
  } catch (err) {
    console.error("[POST /api/spots/import]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
