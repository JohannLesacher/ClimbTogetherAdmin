import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Bypass auth pour tous les tests de cette suite
vi.mock("@/lib/session", () => ({
  requireAdminSession: vi.fn().mockResolvedValue(null),
}))

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}))

// Mock des types Firestore (serverTimestamp, Timestamp, FieldValue)
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: vi.fn().mockReturnValue("SERVER_TIMESTAMP"),
    increment: vi.fn().mockImplementation((n: number) => `increment(${n})`),
  },
  Timestamp: {
    fromMillis: vi.fn().mockImplementation((ms: number) => ({ _ms: ms })),
  },
}))

// Factory pour les refs Firestore
function makeSectorRef(id = "sector-id") {
  return { id }
}

function makeSpotRef(id = "spot-auto-id") {
  return {
    id,
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockImplementation((sId?: string) => makeSectorRef(sId ?? "sector-id")),
    }),
  }
}

const mockBatch = {
  set: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  commit: vi.fn().mockResolvedValue(undefined),
}

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    batch: vi.fn().mockReturnValue(mockBatch),
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockImplementation((id?: string) => makeSpotRef(id ?? "spot-auto-id")),
    }),
  },
}))

// ─── Import du handler APRÈS les mocks ───────────────────────────────────────

const { POST } = await import("@/app/api/spots/import/route")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/spots/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const validSpotPayload = {
  data: [
    {
      name: "Amazonia",
      description: "Spot brésilien",
      location: { lat: -3.4, lng: -62.2, address: "Amazonie", country: "Brésil" },
      styles: ["sport"],
      teamId: "team-abc",
      sectors: [],
    },
  ],
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/spots/import", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Réinitialise le mock batch à chaque test
    mockBatch.commit.mockResolvedValue(undefined)
  })

  it("importe un spot simple et retourne 201", async () => {
    const response = await POST(makeRequest(validSpotPayload))
    const json = await response.json() as { imported: number; ids: string[] }

    expect(response.status).toBe(201)
    expect(json.imported).toBe(1)
    expect(json.ids).toHaveLength(1)
  })

  it("appelle batch.set() et batch.commit() pour chaque spot", async () => {
    await POST(makeRequest(validSpotPayload))
    expect(mockBatch.set).toHaveBeenCalled()
    expect(mockBatch.commit).toHaveBeenCalledTimes(1)
  })

  it("importe plusieurs spots en parallèle", async () => {
    const multiPayload = {
      data: [
        { ...validSpotPayload.data[0], name: "Spot A" },
        { ...validSpotPayload.data[0], name: "Spot B" },
        { ...validSpotPayload.data[0], name: "Spot C" },
      ],
    }

    const response = await POST(makeRequest(multiPayload))
    const json = await response.json() as { imported: number }

    expect(response.status).toBe(201)
    expect(json.imported).toBe(3)
  })

  it("crée des secteurs pour chaque spot si présents", async () => {
    const payload = {
      data: [
        {
          ...validSpotPayload.data[0],
          sectors: [
            { name: "Secteur A", style: ["sport"], grades: { min: "5a", max: "7b" } },
            { name: "Secteur B", style: ["sport"], grades: { min: "6a", max: "8a" } },
          ],
        },
      ],
    }

    await POST(makeRequest(payload))
    // 1 appel set() pour le spot + 2 pour les secteurs
    expect(mockBatch.set).toHaveBeenCalledTimes(3)
  })

  it("utilise l'ID fourni si présent dans les données", async () => {
    const { adminDb } = await import("@/lib/firebase-admin")
    const docMock = vi.fn().mockReturnValue(makeSpotRef("custom-id"))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(adminDb.collection as any).mockReturnValue({ doc: docMock })

    await POST(makeRequest({ data: [{ ...validSpotPayload.data[0], id: "custom-id" }] }))
    expect(docMock).toHaveBeenCalledWith("custom-id")
  })

  it("accepte l'enveloppe d'export { exportedAt, count, data }", async () => {
    const exportEnvelope = {
      exportedAt: "2025-01-15T10:30:00Z",
      count: 1,
      data: validSpotPayload.data,
    }

    const response = await POST(makeRequest(exportEnvelope))
    expect(response.status).toBe(201)
  })

  it("retourne 400 si le tableau data est vide", async () => {
    const response = await POST(makeRequest({ data: [] }))
    const json = await response.json() as { error: string }

    expect(response.status).toBe(400)
    expect(json.error).toBeDefined()
  })

  it("retourne 400 si le nom du spot est absent", async () => {
    const payload = {
      data: [{ ...validSpotPayload.data[0], name: "" }],
    }

    const response = await POST(makeRequest(payload))
    expect(response.status).toBe(400)
  })

  it("retourne 400 pour un corps JSON invalide (non-objet)", async () => {
    const request = new Request("http://localhost/api/spots/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("not an object"),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it("retourne 400 avec la liste des issues en cas d'erreur de validation", async () => {
    const response = await POST(makeRequest({ data: [] }))
    const json = await response.json() as { issues?: { path: string; message: string }[] }

    expect(response.status).toBe(400)
    expect(Array.isArray(json.issues)).toBe(true)
  })

  it("retourne 500 si Firestore échoue", async () => {
    mockBatch.commit.mockRejectedValueOnce(new Error("Firestore unavailable"))

    const response = await POST(makeRequest(validSpotPayload))
    expect(response.status).toBe(500)
  })

  it("retourne 401 si la session est invalide", async () => {
    const { requireAdminSession } = await import("@/lib/session")
    const { NextResponse } = await import("next/server")
    vi.mocked(requireAdminSession).mockResolvedValueOnce(
      NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    )

    const response = await POST(makeRequest(validSpotPayload))
    expect(response.status).toBe(401)
  })
})
