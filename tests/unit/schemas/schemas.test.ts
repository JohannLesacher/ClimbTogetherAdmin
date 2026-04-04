import { describe, it, expect } from "vitest"
import {
  spotSchema,
  sectorSchema,
  userSchema,
  teamSchema,
  tripSchema,
} from "@/types/schemas"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NOW = Date.now()

const validSpot = {
  name: "Fontainebleau",
  description: "Forêt mythique du bloc",
  location: { lat: 48.4167, lng: 2.6833, address: "Forêt de Fontainebleau", country: "France" },
  styles: ["boulder" as const],
  sectorCount: 5,
  addedBy: "admin",
  createdAt: NOW,
}

const validSector = {
  name: "Secteur A",
  style: ["sport" as const],
  grades: { min: "5a", max: "7b" },
  orientation: "S" as const,
  addedBy: "admin",
  createdAt: NOW,
}

const validUser = {
  uid: "user123",
  displayName: "Alice Dupont",
  email: "alice@example.com",
  photoURL: null,
  createdAt: NOW,
}

const validTeam = {
  name: "Team Bloc",
  createdBy: "user123",
  members: {
    user123: { role: "admin" as const, joinedAt: NOW },
  },
  memberUids: ["user123"],
  inviteCode: "ABC123",
  createdAt: NOW,
}

const validTrip = {
  title: "Week-end à Font",
  teamId: "team123",
  createdBy: "user123",
  memberUids: ["user123"],
  participantUids: ["user123"],
  status: "planning" as const,
  durationDays: 3,
  hasUnsettledCosts: false,
  expenseCount: 0,
  routeCount: 0,
  createdAt: NOW,
}

// ─── spotSchema ───────────────────────────────────────────────────────────────

describe("spotSchema", () => {
  it("valide un spot complet", () => {
    expect(() => spotSchema.parse(validSpot)).not.toThrow()
  })

  it("rejette un nom trop court (< 2 caractères)", () => {
    const result = spotSchema.safeParse({ ...validSpot, name: "A" })
    expect(result.success).toBe(false)
  })

  it("accepte le champ parking optionnel", () => {
    const spotWithParking = {
      ...validSpot,
      parking: { lat: 48.42, lng: 2.69, note: "Gratuit" },
    }
    expect(() => spotSchema.parse(spotWithParking)).not.toThrow()
  })

  it("applique les valeurs par défaut (styles=[], sectorCount=0)", () => {
    const { styles, sectorCount, ...minimal } = validSpot
    const result = spotSchema.parse(minimal)
    expect(result.styles).toEqual([])
    expect(result.sectorCount).toBe(0)
  })

  it("rejette un style invalide", () => {
    const result = spotSchema.safeParse({ ...validSpot, styles: ["freestyle"] })
    expect(result.success).toBe(false)
  })

  it("accepte un createdAt sous forme d'objet { seconds, nanoseconds }", () => {
    const result = spotSchema.safeParse({
      ...validSpot,
      createdAt: { seconds: 1700000000, nanoseconds: 0 },
    })
    expect(result.success).toBe(true)
  })
})

// ─── sectorSchema ─────────────────────────────────────────────────────────────

describe("sectorSchema", () => {
  it("valide un secteur complet", () => {
    expect(() => sectorSchema.parse(validSector)).not.toThrow()
  })

  it("rejette un nom vide", () => {
    const result = sectorSchema.safeParse({ ...validSector, name: "" })
    expect(result.success).toBe(false)
  })

  it("accepte orientation optionnelle", () => {
    const { orientation, ...noOrientation } = validSector
    expect(() => sectorSchema.parse(noOrientation)).not.toThrow()
  })

  it("rejette une orientation invalide", () => {
    const result = sectorSchema.safeParse({ ...validSector, orientation: "NORTH" })
    expect(result.success).toBe(false)
  })

  it("accepte toutes les orientations valides", () => {
    const orientations = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const
    orientations.forEach((o) => {
      const result = sectorSchema.safeParse({ ...validSector, orientation: o })
      expect(result.success, `orientation ${o} devrait être valide`).toBe(true)
    })
  })
})

// ─── userSchema ───────────────────────────────────────────────────────────────

describe("userSchema", () => {
  it("valide un utilisateur complet", () => {
    expect(() => userSchema.parse(validUser)).not.toThrow()
  })

  it("rejette un email invalide", () => {
    const result = userSchema.safeParse({ ...validUser, email: "pas-un-email" })
    expect(result.success).toBe(false)
  })

  it("accepte photoURL null", () => {
    expect(() => userSchema.parse({ ...validUser, photoURL: null })).not.toThrow()
  })

  it("rejette un displayName vide", () => {
    const result = userSchema.safeParse({ ...validUser, displayName: "" })
    expect(result.success).toBe(false)
  })
})

// ─── teamSchema ───────────────────────────────────────────────────────────────

describe("teamSchema", () => {
  it("valide une équipe complète", () => {
    expect(() => teamSchema.parse(validTeam)).not.toThrow()
  })

  it("rejette un inviteCode dont la longueur ≠ 6", () => {
    const result = teamSchema.safeParse({ ...validTeam, inviteCode: "AB" })
    expect(result.success).toBe(false)
  })

  it("accepte les rôles admin et member", () => {
    const teamWithMember = {
      ...validTeam,
      members: {
        ...validTeam.members,
        user456: { role: "member" as const, joinedAt: NOW },
      },
      memberUids: ["user123", "user456"],
    }
    expect(() => teamSchema.parse(teamWithMember)).not.toThrow()
  })
})

// ─── tripSchema ───────────────────────────────────────────────────────────────

describe("tripSchema", () => {
  it("valide un trip complet", () => {
    expect(() => tripSchema.parse(validTrip)).not.toThrow()
  })

  it("applique les valeurs par défaut (durationDays=1, expenseCount=0, etc.)", () => {
    const { durationDays, expenseCount, routeCount, hasUnsettledCosts, ...minimal } = validTrip
    const result = tripSchema.parse(minimal)
    expect(result.durationDays).toBe(1)
    expect(result.expenseCount).toBe(0)
    expect(result.routeCount).toBe(0)
    expect(result.hasUnsettledCosts).toBe(false)
  })

  it("rejette un status invalide", () => {
    const result = tripSchema.safeParse({ ...validTrip, status: "archived" })
    expect(result.success).toBe(false)
  })

  it("accepte tous les statuts valides", () => {
    const statuses = ["planning", "confirmed", "done", "cancelled"] as const
    statuses.forEach((s) => {
      const result = tripSchema.safeParse({ ...validTrip, status: s })
      expect(result.success, `status ${s} devrait être valide`).toBe(true)
    })
  })

  it("rejette durationDays < 1", () => {
    const result = tripSchema.safeParse({ ...validTrip, durationDays: 0 })
    expect(result.success).toBe(false)
  })
})
