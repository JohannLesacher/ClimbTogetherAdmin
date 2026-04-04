import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Environnement par défaut : node (routes API, utilitaires)
    // Les tests de composants utilisent le docblock /** @vitest-environment jsdom */ au niveau fichier
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        ".next/",
        "tests/",
        "**/*.config.{ts,mjs}",
        "**/__mocks__/**",
        "app/layout.tsx",
        "app/page.tsx",
        "components/ui/**",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
