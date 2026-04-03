import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { revalidateTag } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { z } from "zod"
import { requireAdminSession } from "@/lib/session"

const schema = z.object({
  spotId: z.string().min(1),
  sectorIds: z.array(z.string()).min(1),
})

export async function POST(request: Request) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const { spotId, sectorIds } = schema.parse(await request.json())

    const spotRef = adminDb.collection("climbingSpots").doc(spotId)
    const batch = adminDb.batch()

    for (const sectorId of sectorIds) {
      batch.delete(spotRef.collection("sectors").doc(sectorId))
    }
    batch.update(spotRef, { sectorCount: FieldValue.increment(-sectorIds.length) })

    await batch.commit()

    revalidateTag("spots", { expire: 0 })
    return NextResponse.json({ deleted: sectorIds.length })
  } catch (err) {
    console.error("[POST /api/sectors/delete]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
