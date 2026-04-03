import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { z } from "zod"
import { requireAdminSession } from "@/lib/session"

const schema = z.object({ ids: z.array(z.string()).min(1) })

export async function POST(request: Request) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const { ids } = schema.parse(await request.json())

    // Delete each spot and its sectors sub-collection atomically (one batch per spot)
    await Promise.all(
      ids.map(async (id) => {
        const spotRef = adminDb.collection("climbingSpots").doc(id)
        const sectorsSnap = await spotRef.collection("sectors").get()

        const batch = adminDb.batch()
        sectorsSnap.docs.forEach((doc) => batch.delete(doc.ref))
        batch.delete(spotRef)
        await batch.commit()
      })
    )

    revalidateTag("spots", { expire: 0 })
    return NextResponse.json({ deleted: ids.length })
  } catch (err) {
    console.error("[POST /api/spots/delete]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
