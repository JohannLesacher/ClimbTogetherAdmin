import { cache } from "react"
import { unstable_cache } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { toMs } from "@/utils/firestore"

export type TeamRow = {
  id: string
  name: string
  createdBy: string
  memberCount: number
  inviteCode: string
  createdAt: number
}

const _getTeams = unstable_cache(
  async (): Promise<TeamRow[]> => {
    const snapshot = await adminDb
      .collection("teams")
      .orderBy("createdAt", "desc")
      .get()

    return snapshot.docs.map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        name: d.name ?? "—",
        createdBy: d.createdBy ?? "—",
        memberCount: (d.memberUids as string[] | undefined)?.length ?? 0,
        inviteCode: d.inviteCode ?? "—",
        createdAt: toMs(d.createdAt),
      }
    })
  },
  ["teams"],
  { tags: ["teams"], revalidate: 300 }
)

export const getTeams = cache(_getTeams)
