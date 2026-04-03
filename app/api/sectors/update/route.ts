import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { requireAdminSession } from "@/lib/session"
import { z } from "zod"

const schema = z.object({
  spotId: z.string().min(1),
  sectorId: z.string().min(1),
  data: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    style: z.array(z.enum(["sport", "trad", "boulder"])).optional(),
    grades: z
      .object({ min: z.string(), max: z.string() })
      .optional(),
    // null = supprimer l'orientation
    orientation: z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]).nullable().optional(),
    // null = supprimer la photo
    photoUrl: z.string().nullable().optional(),
  }),
})

export async function POST(request: Request) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const { spotId, sectorId, data } = schema.parse(await request.json())

    const sectorRef = adminDb
      .collection("climbingSpots")
      .doc(spotId)
      .collection("sectors")
      .doc(sectorId)

    await sectorRef.update(data as Record<string, unknown>)

    revalidateTag("spots", { expire: 0 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/sectors/update]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
