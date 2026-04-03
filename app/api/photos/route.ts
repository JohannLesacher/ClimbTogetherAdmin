import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/session"
import { getPhotos, type PhotoFile } from "@/lib/data/photos"

// Re-export du type pour les composants clients qui l'importent depuis cette route
export type { PhotoFile }

export async function GET() {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const photos = await getPhotos()
    return NextResponse.json({ photos })
  } catch (err) {
    console.error("[GET /api/photos]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
