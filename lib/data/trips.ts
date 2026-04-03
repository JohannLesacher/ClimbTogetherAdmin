import { cache } from "react"
import { unstable_cache } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { toMs } from "@/utils/firestore"

export type TripStatus = "planning" | "confirmed" | "done" | "cancelled"

export type TripRow = {
  id: string
  title: string
  teamId: string
  createdBy: string
  status: TripStatus
  durationDays: number
  participantCount: number
  routeCount: number
  expenseCount: number
  hasUnsettledCosts: boolean
  createdAt: number
}

const _getTrips = unstable_cache(
  async (): Promise<TripRow[]> => {
    const snapshot = await adminDb
      .collection("trips")
      .orderBy("createdAt", "desc")
      .get()

    return snapshot.docs.map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        title: d.title ?? "—",
        teamId: d.teamId ?? "—",
        createdBy: d.createdBy ?? "—",
        status: d.status ?? "planning",
        durationDays: d.durationDays ?? 1,
        participantCount: (d.participantUids as string[] | undefined)?.length ?? 0,
        routeCount: d.routeCount ?? 0,
        expenseCount: d.expenseCount ?? 0,
        hasUnsettledCosts: d.hasUnsettledCosts ?? false,
        createdAt: toMs(d.createdAt),
      }
    })
  },
  ["trips"],
  { tags: ["trips"], revalidate: 300 }
)

export const getTrips = cache(_getTrips)
