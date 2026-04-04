import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/session", () => ({
  requireAdminSession: vi.fn().mockResolvedValue(null),
}))

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: vi.fn().mockReturnValue("SERVER_TIMESTAMP"),
    increment: vi.fn().mockImplementation((n: number) => `increment(${n})`),
  },
}))

const mockSectorRef = { id: "new-sector-id" }
const mockSpotRef = {
  collection: vi.fn().mockReturnValue({
    doc: vi.fn().mockReturnValue(mockSectorRef),
  }),
}
const mockBatch = {
  set: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  commit: vi.fn().mockResolvedValue(undefined),
}

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    batch: vi.fn().mockReturnValue(mockBatch),
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(mockSpotRef),
    }),
  },
}))

// ─── Import du handler APRÈS les mocks ───────────────────────────────────────

const { POST } = await import("@/app/api/sectors/create/route")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/sectors/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const validBody = {
  spotId: "spot-123",
  data: {
    name: "Secteur A",
    style: ["sport"],
    grades: { min: "5a", max: "7b" },
    orientation: "S",
    addedBy: "admin",
  },
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/sectors/create", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockBatch.commit.mockResolvedValue(undefined)
    // Rétablit les mocks de chaîne après clearAllMocks
    mockSpotRef.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(mockSectorRef) })
    const { adminDb } = await import("@/lib/firebase-admin")
    vi.mocked(adminDb.batch).mockReturnValue(mockBatch)
  })

  it("crée un secteur et retourne 201 avec l'id", async () => {
    const response = await POST(makeRequest(validBody))
    const json = await response.json() as { id: string }

    expect(response.status).toBe(201)
    expect(json.id).toBe("new-sector-id")
  })

  it("utilise un batch atomique (set + update)", async () => {
    await POST(makeRequest(validBody))

    // batch.set() pour le secteur
    expect(mockBatch.set).toHaveBeenCalledTimes(1)
    // batch.update() pour incrémenter sectorCount sur le spot
    expect(mockBatch.update).toHaveBeenCalledTimes(1)
    // commit() appelé une fois
    expect(mockBatch.commit).toHaveBeenCalledTimes(1)
  })

  it("incrémente sectorCount de +1 sur le spot parent", async () => {
    await POST(makeRequest(validBody))

    const updateCall = mockBatch.update.mock.calls[0]
    // Le second argument de update() doit contenir increment(1)
    expect(updateCall[1]).toMatchObject({ sectorCount: "increment(1)" })
  })

  it("ajoute createdAt avec serverTimestamp()", async () => {
    await POST(makeRequest(validBody))

    const setCall = mockBatch.set.mock.calls[0]
    // Les données passées à set() doivent contenir createdAt
    expect(setCall[1]).toMatchObject({ createdAt: "SERVER_TIMESTAMP" })
  })

  it("cible le bon spot via adminDb.collection('climbingSpots').doc(spotId)", async () => {
    const { adminDb } = await import("@/lib/firebase-admin")

    await POST(makeRequest(validBody))

    expect(adminDb.collection).toHaveBeenCalledWith("climbingSpots")
    // Le doc() doit être appelé avec le spotId
    const collectionResult = vi.mocked(adminDb.collection).mock.results[0].value
    expect(collectionResult.doc).toHaveBeenCalledWith("spot-123")
  })

  it("accepte orientation optionnelle absente", async () => {
    const { data: { orientation: _, ...dataWithoutOrientation }, ...rest } = validBody
    const response = await POST(makeRequest({ ...rest, data: dataWithoutOrientation }))
    expect(response.status).toBe(201)
  })

  it("retourne 500 (via Zod parse error pour spotId vide)", async () => {
    const response = await POST(makeRequest({ ...validBody, spotId: "" }))
    expect(response.status).toBe(500)
  })

  it("retourne 500 si le nom du secteur est absent", async () => {
    const { data: { name: _, ...rest }, ...body } = validBody
    const response = await POST(makeRequest({ ...body, data: rest }))
    expect(response.status).toBe(500)
  })

  it("retourne 500 si Firestore échoue", async () => {
    mockBatch.commit.mockRejectedValueOnce(new Error("Firestore timeout"))

    const response = await POST(makeRequest(validBody))
    expect(response.status).toBe(500)
  })

  it("retourne 401 si non authentifié", async () => {
    const { requireAdminSession } = await import("@/lib/session")
    const { NextResponse } = await import("next/server")
    vi.mocked(requireAdminSession).mockResolvedValueOnce(
      NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    )

    const response = await POST(makeRequest(validBody))
    expect(response.status).toBe(401)
  })

  it("appelle revalidateTag('spots') après le commit", async () => {
    const { revalidateTag } = await import("next/cache")
    await POST(makeRequest(validBody))
    expect(revalidateTag).toHaveBeenCalledWith("spots", expect.anything())
  })
})
