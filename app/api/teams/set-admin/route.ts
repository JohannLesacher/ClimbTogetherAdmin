import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { z } from "zod"
import { requireAdminSession } from "@/lib/session"

const schema = z.object({
  teamId: z.string().min(1),
  newAdminUid: z.string().min(1),
})

export async function POST(request: Request) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const { teamId, newAdminUid } = schema.parse(await request.json())

    const teamRef = adminDb.collection("teams").doc(teamId)
    const teamDoc = await teamRef.get()

    if (!teamDoc.exists) {
      return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 })
    }

    const members = (teamDoc.data()?.members ?? []) as { uid: string; role: string; joinedAt: unknown }[]

    if (!members.some((m) => m.uid === newAdminUid)) {
      return NextResponse.json({ error: "Utilisateur non membre de l'équipe" }, { status: 400 })
    }

    const updatedMembers = members.map((m) => ({
      ...m,
      role: m.uid === newAdminUid ? "admin" : "member",
    }))

    await teamRef.update({ members: updatedMembers })

    revalidateTag("teams", { expire: 0 } as never)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/teams/set-admin]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
