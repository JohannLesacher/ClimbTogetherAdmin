import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { z } from "zod"
import { requireAdminSession } from "@/lib/session"

const schema = z.object({ ids: z.array(z.string()).min(1) })

export async function POST(request: Request) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const { ids } = schema.parse(await request.json())

    // Delete from Firebase Auth (allSettled: a user may not have an Auth account)
    await Promise.allSettled(ids.map((id) => adminAuth.deleteUser(id)))

    // Delete Firestore documents in batch
    const batch = adminDb.batch()
    ids.forEach((id) => batch.delete(adminDb.collection("users").doc(id)))
    await batch.commit()

    revalidateTag("users", { expire: 0 })
    return NextResponse.json({ deleted: ids.length })
  } catch (err) {
    console.error("[POST /api/users/delete]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
