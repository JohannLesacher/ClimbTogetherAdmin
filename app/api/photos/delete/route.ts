import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { adminStorage } from "@/lib/firebase-admin"
import { z } from "zod"
import { requireAdminSession } from "@/lib/session"

const schema = z.object({ paths: z.array(z.string()).min(1) })

export async function POST(request: Request) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const { paths } = schema.parse(await request.json())
    const bucket = adminStorage.bucket()

    await Promise.all(paths.map((path) => bucket.file(path).delete()))

    revalidateTag("photos", { expire: 0 })
    return NextResponse.json({ deleted: paths.length })
  } catch (err) {
    console.error("[POST /api/photos/delete]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
