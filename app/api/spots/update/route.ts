import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { revalidateTag } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { requireAdminSession } from "@/lib/session"
import { z } from "zod"

const stylesEnum = z.enum(["sport", "trad", "boulder"])

const schema = z.object({
  spotId: z.string().min(1),
  data: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    location: z
      .object({
        lat: z.number(),
        lng: z.number(),
        address: z.string(),
        country: z.string(),
      })
      .optional(),
    styles: z.array(stylesEnum).optional(),
    teamId: z.string().min(1).optional(),
    // null = supprimer le champ parking
    parking: z
      .object({ lat: z.number(), lng: z.number(), note: z.string().optional() })
      .nullable()
      .optional(),
    photoUrl: z.string().nullable().optional(),
  }),
})

export async function POST(request: Request) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const { spotId, data } = schema.parse(await request.json())

    const spotRef = adminDb.collection("climbingSpots").doc(spotId)

    // Construire le payload en gérant parking: null → FieldValue.delete()
    const { parking, teamId, ...rest } = data
    const payload: Record<string, unknown> = { ...rest }

    if (parking === null) {
      payload.parking = FieldValue.delete()
    } else if (parking !== undefined) {
      payload.parking = parking
    }

    if (teamId) {
      // Cascade : mettre à jour teamId sur le spot ET tous ses secteurs atomiquement
      const sectorsSnap = await spotRef.collection("sectors").get()
      const batch = adminDb.batch()
      batch.update(spotRef, { ...payload, teamId })
      sectorsSnap.docs.forEach((doc) => batch.update(doc.ref, { teamId }))
      await batch.commit()
    } else {
      await spotRef.update(payload)
    }

    revalidateTag("spots", { expire: 0 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/spots/update]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
