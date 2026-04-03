import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"

/**
 * À appeler en tête de chaque route handler protégé.
 * Retourne une NextResponse 401 si la session est absente ou invalide, null sinon.
 *
 * Usage :
 *   const authError = await requireAdminSession()
 *   if (authError) return authError
 */
export async function requireAdminSession(): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("__session")?.value

  if (!sessionCookie) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  try {
    // checkRevoked: true — invalide immédiatement les sessions révoquées
    await adminAuth.verifySessionCookie(sessionCookie, true)
    return null
  } catch {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 })
  }
}
