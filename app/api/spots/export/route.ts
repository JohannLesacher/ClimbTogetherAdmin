import { NextResponse } from "next/server"
import { FieldPath } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import { toMs } from "@/utils/firestore"
import { z } from "zod"
import { requireAdminSession } from "@/lib/session"

const requestSchema = z.object({
  // Empty array means "export all"
  ids: z.array(z.string()).default([]),
})

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, (i + 1) * size)
  )
}

export async function POST(request: Request) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const body: unknown = await request.json()
    const { ids } = requestSchema.parse(body)

    // Fetch spot documents
    let spotDocs: FirebaseFirestore.QueryDocumentSnapshot[]

    if (ids.length === 0) {
      const snapshot = await adminDb
        .collection("climbingSpots")
        .orderBy("createdAt", "desc")
        .get()
      spotDocs = snapshot.docs
    } else {
      // Firestore "in" query is limited to 30 values per chunk
      const chunks = chunkArray(ids, 30)
      const results = await Promise.all(
        chunks.map((chunk) =>
          adminDb
            .collection("climbingSpots")
            .where(FieldPath.documentId(), "in", chunk)
            .get()
        )
      )
      spotDocs = results.flatMap((r) => r.docs)
    }

    // Fetch sectors for every spot in parallel
    const data = await Promise.all(
      spotDocs.map(async (doc) => {
        const d = doc.data()

        const sectorsSnap = await doc.ref
          .collection("sectors")
          .orderBy("createdAt", "asc")
          .get()

        const sectors = sectorsSnap.docs.map((s) => {
          const sd = s.data()
          return {
            id: s.id,
            name: sd.name ?? "—",
            style: sd.style ?? [],
            grades: sd.grades ?? { min: "", max: "" },
            ...(sd.description && { description: sd.description }),
            ...(sd.orientation && { orientation: sd.orientation }),
            photoUrl: sd.photoUrl ?? null,
            addedBy: sd.addedBy ?? "—",
            createdAt: toMs(sd.createdAt),
          }
        })

        return {
          id: doc.id,
          name: d.name ?? "—",
          description: d.description ?? "",
          location: d.location ?? {},
          styles: d.styles ?? [],
          sectorCount: sectors.length,
          ...(d.parking && { parking: d.parking }),
          photoUrl: d.photoUrl ?? null,
          addedBy: d.addedBy ?? "—",
          createdAt: toMs(d.createdAt),
          sectors,
        }
      })
    )

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      count: data.length,
      data,
    })
  } catch (err) {
    console.error("[POST /api/spots/export]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
