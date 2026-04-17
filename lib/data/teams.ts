import { cache } from "react"
import { unstable_cache } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { toMs } from "@/utils/firestore"

export type TeamMember = {
  uid: string
  name: string
}

export type TeamRow = {
  id: string
  name: string
  createdBy: string
  memberCount: number
  adminUid: string
  members: TeamMember[]
  inviteCode: string
  createdAt: number
}

export type TeamName = { id: string; name: string }

const _getTeams = unstable_cache(
  async (): Promise<TeamRow[]> => {
    const snapshot = await adminDb
      .collection("teams")
      .orderBy("createdAt", "desc")
      .get()

    // Collect all unique member UIDs across all teams
    const allUids = new Set<string>()
    snapshot.docs.forEach((doc) => {
      const members = doc.data().members as { uid: string }[] | undefined
      members?.forEach((m) => allUids.add(m.uid))
    })

    // Batch-fetch user display names
    const userNameMap = new Map<string, string>()
    if (allUids.size > 0) {
      const userRefs = [...allUids].map((uid) => adminDb.collection("users").doc(uid))
      const userDocs = await adminDb.getAll(...userRefs)
      userDocs.forEach((doc) => {
        if (doc.exists) {
          const d = doc.data()!
          userNameMap.set(doc.id, d.displayName ?? d.email ?? doc.id)
        }
      })
    }

    return snapshot.docs.map((doc) => {
      const d = doc.data()
      const membersArr = (d.members ?? []) as { uid: string; role: string }[]
      const memberUids = membersArr.map((m) => m.uid)
      const adminUid = membersArr.find((m) => m.role === "admin")?.uid ?? ""

      return {
        id: doc.id,
        name: d.name ?? "—",
        createdBy: d.createdBy ?? "—",
        memberCount: memberUids.length,
        adminUid,
        members: memberUids.map((uid) => ({
          uid,
          name: userNameMap.get(uid) ?? uid,
        })),
        inviteCode: d.inviteCode ?? "—",
        createdAt: toMs(d.createdAt),
      }
    })
  },
  ["teams"],
  { tags: ["teams"], revalidate: 300 }
)

export const getTeams = cache(_getTeams)

// ─── getTeamNames ──────────────────────────────────────────────────────────
// Projection minimale (id + name) pour les selects/dropdowns.

const _getTeamNames = unstable_cache(
  async (): Promise<TeamName[]> => {
    const snap = await adminDb
      .collection("teams")
      .orderBy("name")
      .select("name")
      .get()
    return snap.docs.map((doc) => ({
      id: doc.id,
      name: (doc.data().name as string) ?? doc.id,
    }))
  },
  ["team-names"],
  { tags: ["teams"], revalidate: 300 }
)

/** Liste id+name uniquement. Pour les dropdowns. */
export const getTeamNames = cache(_getTeamNames)
