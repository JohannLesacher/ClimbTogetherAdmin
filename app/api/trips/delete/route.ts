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

    const batch = adminDb.batch()
    ids.forEach((id) => batch.delete(adminDb.collection("trips").doc(id)))
    await batch.commit()

    revalidateTag("trips", { expire: 0 })
    return NextResponse.json({ deleted: ids.length })
  } catch (err) {
    console.error("[POST /api/trips/delete]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
