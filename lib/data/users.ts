import { cache } from "react"
import { unstable_cache } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { toMs } from "@/utils/firestore"

export type UserRow = {
  id: string
  displayName: string
  email: string
  photoURL: string | null
  createdAt: number
}

const _getUsers = unstable_cache(
  async (): Promise<UserRow[]> => {
    const snapshot = await adminDb
      .collection("users")
      .orderBy("createdAt", "desc")
      .get()

    return snapshot.docs.map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        displayName: d.displayName ?? "—",
        email: d.email ?? "—",
        photoURL: d.photoURL ?? null,
        createdAt: toMs(d.createdAt),
      }
    })
  },
  ["users"],
  { tags: ["users"], revalidate: 300 }
)

export const getUsers = cache(_getUsers)
