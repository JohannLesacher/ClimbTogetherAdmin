import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/session", () => ({
  requireAdminSession: vi.fn().mockResolvedValue(null),
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldPath: {
    documentId: vi.fn().mockReturnValue("__name__"),
  },
}))

// ─── Données de test ─────────────────────────────────────────────────────────

const MOCK_SECTOR_1 = {
  id: "sector1",
  data: () => ({
    name: "Secteur A",
    style: ["sport"],
    grades: { min: "5a", max: "7b" },
    orientation: "S",
    addedBy: "admin",
    createdAt: { seconds: 1700000000, nanoseconds: 0 },
  }),
}

const MOCK_SECTOR_2 = {
  id: "sector2",
  data: () => ({
    name: "Secteur B",
    style: ["boulder"],
    grades: { min: "6a", max: "8a" },
    addedBy: "admin",
    createdAt: { seconds: 1700001000, nanoseconds: 0 },
  }),
}

function makeSpotDoc(id: string, name: string, sectors: typeof MOCK_SECTOR_1[]) {
  return {
    id,
    data: () => ({
      name,
      description: `Description de ${name}`,
      location: { lat: 44.2, lng: 3.4, address: "Gorges du Tarn", country: "France" },
      styles: ["sport"],
      sectorCount: sectors.length,
      addedBy: "admin",
      createdAt: { seconds: 1700000000, nanoseconds: 0 },
    }),
    ref: {
      collection: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ docs: sectors }),
      }),
    },
  }
}

// Mock Firestore principal
const mockCollectionBuilder = {
  orderBy: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  get: vi.fn(),
}

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn().mockReturnValue(mockCollectionBuilder),
  },
}))

// ─── Import du handler APRÈS les mocks ───────────────────────────────────────

const { POST } = await import("@/app/api/spots/export/route")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/spots/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/spots/export", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Rétablit le mock orderBy/where/get après clearAllMocks
    mockCollectionBuilder.orderBy.mockReturnThis()
    mockCollectionBuilder.where.mockReturnThis()
  })

  it("exporte tous les spots si ids est vide", async () => {
    const spotDocs = [
      makeSpotDoc("spot1", "Amazonia", [MOCK_SECTOR_1]),
      makeSpotDoc("spot2", "Fontainebleau", [MOCK_SECTOR_2]),
    ]
    mockCollectionBuilder.get.mockResolvedValue({ docs: spotDocs })

    const response = await POST(makeRequest({ ids: [] }))
    const json = await response.json() as { count: number; data: unknown[]; exportedAt: string }

    expect(response.status).toBe(200)
    expect(json.count).toBe(2)
    expect(json.data).toHaveLength(2)
    expect(json.exportedAt).toBeDefined()
  })

  it("inclut les secteurs dans chaque spot exporté", async () => {
    const spotDocs = [makeSpotDoc("spot1", "Amazonia", [MOCK_SECTOR_1, MOCK_SECTOR_2])]
    mockCollectionBuilder.get.mockResolvedValue({ docs: spotDocs })

    const response = await POST(makeRequest({ ids: [] }))
    const json = await response.json() as { data: Array<{ sectors: unknown[] }> }

    expect(json.data[0].sectors).toHaveLength(2)
  })

  it("inclut l'id, le nom, la location, les styles et le sectorCount", async () => {
    const spotDocs = [makeSpotDoc("spot1", "Amazonia", [MOCK_SECTOR_1])]
    mockCollectionBuilder.get.mockResolvedValue({ docs: spotDocs })

    const response = await POST(makeRequest({ ids: [] }))
    const json = await response.json() as { data: Array<Record<string, unknown>> }
    const spot = json.data[0]

    expect(spot.id).toBe("spot1")
    expect(spot.name).toBe("Amazonia")
    expect(spot.location).toBeDefined()
    expect(spot.styles).toBeDefined()
    expect(spot.sectorCount).toBe(1)
  })

  it("utilise une requête 'in' si des ids sont fournis", async () => {
    const { adminDb } = await import("@/lib/firebase-admin")
    const spotDocs = [makeSpotDoc("spot1", "Amazonia", [])]

    // Mock pour la requête par IDs
    const inQueryBuilder = {
      get: vi.fn().mockResolvedValue({ docs: spotDocs }),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCollectionBuilder.where.mockReturnValue(inQueryBuilder as any)

    const response = await POST(makeRequest({ ids: ["spot1"] }))
    const json = await response.json() as { count: number }

    expect(mockCollectionBuilder.where).toHaveBeenCalled()
    expect(json.count).toBe(1)
    // adminDb.collection doit bien avoir été appelé
    expect(adminDb.collection).toHaveBeenCalledWith("climbingSpots")
  })

  it("applique le défaut ids=[] si le champ est absent du corps", async () => {
    mockCollectionBuilder.get.mockResolvedValue({ docs: [] })

    // Corps sans le champ ids
    const response = await POST(makeRequest({}))
    expect(response.status).toBe(200)
    // Doit passer par la branche "export all" (orderBy)
    expect(mockCollectionBuilder.orderBy).toHaveBeenCalledWith("createdAt", "desc")
  })

  it("retourne exportedAt au format ISO 8601", async () => {
    mockCollectionBuilder.get.mockResolvedValue({ docs: [] })

    const response = await POST(makeRequest({ ids: [] }))
    const json = await response.json() as { exportedAt: string }

    expect(() => new Date(json.exportedAt)).not.toThrow()
    expect(json.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("retourne 401 si non authentifié", async () => {
    const { requireAdminSession } = await import("@/lib/session")
    const { NextResponse } = await import("next/server")
    vi.mocked(requireAdminSession).mockResolvedValueOnce(
      NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    )

    const response = await POST(makeRequest({ ids: [] }))
    expect(response.status).toBe(401)
  })

  it("retourne 500 si Firestore échoue", async () => {
    mockCollectionBuilder.get.mockRejectedValueOnce(new Error("Firestore down"))

    const response = await POST(makeRequest({ ids: [] }))
    expect(response.status).toBe(500)
  })

  it("convertit les timestamps Firestore en millisecondes (createdAt)", async () => {
    const spotDocs = [makeSpotDoc("spot1", "Amazonia", [])]
    mockCollectionBuilder.get.mockResolvedValue({ docs: spotDocs })

    const response = await POST(makeRequest({ ids: [] }))
    const json = await response.json() as { data: Array<{ createdAt: unknown }> }

    // toMs({ seconds: 1700000000 }) = 1700000000 * 1000
    expect(json.data[0].createdAt).toBe(1700000000 * 1000)
  })
})
