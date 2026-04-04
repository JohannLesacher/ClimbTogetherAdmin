import { describe, it, expect } from "vitest"
import { parseClimbingPage } from "@/lib/scraper/parser"

// ─── Fixture HTML (structure inspirée de grimper.com) ────────────────────────

function buildHtml({
  name = "Les Gorges du Tarn",
  siteLat = "44.2005",
  siteLng = "3.3891",
  parkLat = "44.1990",
  parkLng = "3.3870",
  lieu = "France, Occitanie, Loz\u00e8re, Sainte-Enimie",
  orientation = "S",
  climbingDesc = "Site de bloc du 6a au 8a. Equipement : parfait.",
  intro = "Un magnifique site sportif au bord du Tarn.",
  rocher = "granite, profil vertical",
  marche = "5 minutes",
} = {}) {
  // Chaque span.bold doit \u00eatre dans son propre conteneur isol\u00e9 pour que
  // $(el).parent().text() ne r\u00e9cup\u00e8re que le contenu de CET \u00e9l\u00e9ment.
  return `
    <html><body>
      <h1 class="titre"><span>Escalade</span><span>${name}</span></h1>
      <div class="js-marker-site" data-lat="${siteLat}" data-lng="${siteLng}"></div>
      <div class="js-marker-parc" data-lat="${parkLat}" data-lng="${parkLng}"></div>
      <div><span class="bold">Lieu : </span>${lieu}</div>
      <p>Orientation(s) : ${orientation}</p>
      <div class="center margin_bottom">${intro}</div>
      <h2 class="h2site">Description de l'escalade</h2>
      <div>${climbingDesc}</div>
      <div><span class="bold">Rocher : </span>${rocher}</div>
      <div><span class="bold">Marche d'approche : </span>Marche d'approche : ${marche}</div>
    </body></html>
  `
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("parseClimbingPage", () => {
  describe("extraction du nom", () => {
    it("extrait le nom depuis h1.titre span:last-child", () => {
      const { spot } = parseClimbingPage(buildHtml({ name: "Amazonia" }))
      expect(spot.name).toBe("Amazonia")
    })

    it("gère les espaces insécables dans le nom", () => {
      const html = `<html><body><h1 class="titre"><span>Titre</span><span>Mon\u00a0Spot</span></h1></body></html>`
      const { spot } = parseClimbingPage(html)
      expect(spot.name).toBe("Mon Spot")
    })
  })

  describe("coordonnées GPS", () => {
    it("extrait les coordonnées du site", () => {
      const { spot } = parseClimbingPage(buildHtml({ siteLat: "44.2005", siteLng: "3.3891" }))
      expect(spot.location.lat).toBeCloseTo(44.2005)
      expect(spot.location.lng).toBeCloseTo(3.3891)
    })

    it("extrait les coordonnées du parking", () => {
      const { spot } = parseClimbingPage(buildHtml({ parkLat: "44.1990", parkLng: "3.3870" }))
      expect(spot.parking).toBeDefined()
      expect(spot.parking?.lat).toBeCloseTo(44.199)
      expect(spot.parking?.lng).toBeCloseTo(3.387)
    })

    it("omet le parking si coordonnées absentes (0,0)", () => {
      const { spot } = parseClimbingPage(buildHtml({ parkLat: "0", parkLng: "0" }))
      expect(spot.parking).toBeUndefined()
    })
  })

  describe("localisation", () => {
    it("extrait le pays depuis le premier élément du lieu", () => {
      const { spot } = parseClimbingPage(buildHtml({ lieu: "France, Occitanie, Lozère, Sainte-Enimie" }))
      expect(spot.location.country).toBe("France")
    })

    it("extrait l'adresse depuis le dernier élément du lieu", () => {
      const { spot } = parseClimbingPage(buildHtml({ lieu: "France, Occitanie, Lozère, Sainte-Enimie." }))
      expect(spot.location.address).toBe("Sainte-Enimie")
    })
  })

  describe("orientation", () => {
    it("mappe 'S' → 'S'", () => {
      const { sector } = parseClimbingPage(buildHtml({ orientation: "S" }))
      expect(sector.orientation).toBe("S")
    })

    it("mappe 'SO' (français) → 'SW'", () => {
      const { sector } = parseClimbingPage(buildHtml({ orientation: "SO" }))
      expect(sector.orientation).toBe("SW")
    })

    it("mappe 'NO' (français) → 'NW'", () => {
      const { sector } = parseClimbingPage(buildHtml({ orientation: "NO" }))
      expect(sector.orientation).toBe("NW")
    })

    it("retourne undefined si orientation absente", () => {
      const html = `<html><body><h1 class="titre"><span>X</span></h1></body></html>`
      const { sector } = parseClimbingPage(html)
      expect(sector.orientation).toBeUndefined()
    })
  })

  describe("grades", () => {
    it("extrait une plage de grades 'du 6a au 8a'", () => {
      const { sector } = parseClimbingPage(buildHtml({ climbingDesc: "Site du 6a au 8a. Sportif." }))
      expect(sector.grades.min).toBe("6a")
      expect(sector.grades.max).toBe("8a")
    })

    it("extrait une plage avec 'de … à …'", () => {
      const { sector } = parseClimbingPage(buildHtml({ climbingDesc: "De 5c à 7b+ topoguide." }))
      expect(sector.grades.min).toBe("5c")
      expect(sector.grades.max).toBe("7b+")
    })

    it("retourne des chaînes vides si aucun grade détecté", () => {
      const { sector } = parseClimbingPage(buildHtml({ climbingDesc: "Belle falaise calcaire." }))
      expect(sector.grades.min).toBe("")
      expect(sector.grades.max).toBe("")
    })
  })

  describe("styles", () => {
    it("détecte 'sportif' → ['sport']", () => {
      const { spot } = parseClimbingPage(buildHtml({ climbingDesc: "Site sportif de qualité." }))
      expect(spot.styles).toContain("sport")
    })

    it("détecte 'bloc' → ['boulder']", () => {
      const { spot } = parseClimbingPage(buildHtml({ climbingDesc: "Site de bloc varié." }))
      expect(spot.styles).toContain("boulder")
    })

    it("détecte 'trad'", () => {
      const { spot } = parseClimbingPage(buildHtml({ climbingDesc: "Escalade trad et sportive." }))
      expect(spot.styles).toContain("trad")
      expect(spot.styles).toContain("sport")
    })

    it("défaut ['sport'] si aucun style détecté", () => {
      const { spot } = parseClimbingPage(buildHtml({ climbingDesc: "Belle voie." }))
      expect(spot.styles).toEqual(["sport"])
    })
  })

  describe("structure du résultat", () => {
    it("retourne un spot avec addedBy = 'admin' et sectors = []", () => {
      const { spot } = parseClimbingPage(buildHtml())
      expect(spot.addedBy).toBe("admin")
      expect(spot.sectors).toEqual([])
    })

    it("retourne un secteur avec addedBy = 'admin'", () => {
      const { sector } = parseClimbingPage(buildHtml())
      expect(sector.addedBy).toBe("admin")
    })

    it("tronque la description du secteur avant 'Equipement :'", () => {
      const { sector } = parseClimbingPage(
        buildHtml({ climbingDesc: "Beau site du 6a au 8a. Equipement : parfait." })
      )
      expect(sector.description).not.toContain("Equipement")
    })
  })
})
