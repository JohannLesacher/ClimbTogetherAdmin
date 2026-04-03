import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { revalidateTag } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import type { ScrapedSpot, ScrapedSector } from "@/lib/scraper/parser"
import { requireAdminSession } from "@/lib/session"

type ApplySpotBody = { type: "spot"; data: ScrapedSpot }
type ApplySectorBody = { type: "sector"; spotId: string; data: ScrapedSector }
type Body = ApplySpotBody | ApplySectorBody

export async function POST(request: Request) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const body = (await request.json()) as Body

    if (body.type === "spot") {
      const { sectors: _s, ...spotFields } = body.data
      const spotRef = adminDb.collection("climbingSpots").doc()
      await spotRef.set({
        ...spotFields,
        sectorCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      })
      revalidateTag("spots", { expire: 0 })
      return NextResponse.json({ id: spotRef.id }, { status: 201 })
    }

    if (body.type === "sector") {
      const { spotId, data } = body
      if (!spotId) {
        return NextResponse.json({ error: "spotId requis" }, { status: 400 })
      }

      const spotRef = adminDb.collection("climbingSpots").doc(spotId)
      const sectorRef = spotRef.collection("sectors").doc()

      // Atomic: add sector + increment count
      const batch = adminDb.batch()
      batch.set(sectorRef, {
        ...data,
        createdAt: FieldValue.serverTimestamp(),
      })
      batch.update(spotRef, { sectorCount: FieldValue.increment(1) })
      await batch.commit()

      revalidateTag("spots", { expire: 0 })
      return NextResponse.json({ id: sectorRef.id }, { status: 201 })
    }

    return NextResponse.json({ error: "type invalide" }, { status: 400 })
  } catch (err) {
    console.error("[POST /api/scraper/apply]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
