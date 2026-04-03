import { cache } from "react"
import { unstable_cache } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"

export type DashboardStats = {
  userCount: number
  spotCount: number
  teamCount: number
  tripCount: number
}

// Les stats agrègent toutes les entités → invalider dès qu'une d'elles change.
const _getDashboardStats = unstable_cache(
  async (): Promise<DashboardStats> => {
    const [users, spots, teams, trips] = await Promise.all([
      adminDb.collection("users").count().get(),
      adminDb.collection("climbingSpots").count().get(),
      adminDb.collection("teams").count().get(),
      adminDb.collection("trips").count().get(),
    ])

    return {
      userCount: users.data().count,
      spotCount: spots.data().count,
      teamCount: teams.data().count,
      tripCount: trips.data().count,
    }
  },
  ["dashboard-stats"],
  // Tous les tags entité : invalidé automatiquement dès qu'une mutation touche
  // users, spots, teams ou trips.
  { tags: ["users", "spots", "teams", "trips"], revalidate: 300 }
)

export const getDashboardStats = cache(_getDashboardStats)
