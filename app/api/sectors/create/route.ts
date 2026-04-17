import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { revalidateTag } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { z } from "zod"
import { requireAdminSession } from "@/lib/session"

const schema = z.object({
  spotId: z.string().min(1),
  teamId: z.string().min(1),
  data: z.object({
    name: z.string().min(1),
    style: z.array(z.enum(["sport", "trad", "boulder"])).default([]),
    grades: z.object({ min: z.string().default(""), max: z.string().default("") }).default({ min: "", max: "" }),
    orientation: z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]).optional(),
    description: z.string().optional(),
    addedBy: z.string().default("admin"),
  }),
})

export async function POST(request: Request) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const { spotId, teamId, data } = schema.parse(await request.json())

    const spotRef = adminDb.collection("climbingSpots").doc(spotId)
    const sectorRef = spotRef.collection("sectors").doc()

    const batch = adminDb.batch()
    batch.set(sectorRef, { ...data, teamId, createdAt: FieldValue.serverTimestamp() })
    batch.update(spotRef, { sectorCount: FieldValue.increment(1) })
    await batch.commit()

    revalidateTag("spots", { expire: 0 })
    return NextResponse.json({ id: sectorRef.id }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/sectors/create]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
