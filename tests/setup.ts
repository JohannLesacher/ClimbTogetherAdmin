import "@testing-library/jest-dom"
import { expect, afterEach, vi } from "vitest"
import * as matchers from "@testing-library/jest-dom/matchers"
import { cleanup } from "@testing-library/react"

// Radix UI (react-use-size) utilise ResizeObserver — non disponible dans jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Étend les matchers Vitest avec ceux de jest-dom (toBeInTheDocument, etc.)
expect.extend(matchers)

// Nettoie le DOM après chaque test de composant
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
