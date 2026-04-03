import * as cheerio from "cheerio"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScrapedSpot = {
  name: string
  description: string
  location: { lat: number; lng: number; address: string; country: string }
  styles: string[]
  parking?: { lat: number; lng: number; note: string }
  addedBy: string
  sectors: never[]
}

export type ScrapedSector = {
  name: string
  description: string
  style: string[]
  grades: { min: string; max: string }
  orientation?: string
  addedBy: string
}

export type ParseResult = {
  spot: ScrapedSpot
  sector: ScrapedSector
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORIENTATION_MAP: Record<string, string> = {
  N: "N", NE: "NE", E: "E", SE: "SE",
  S: "S", SO: "SW", O: "W", NO: "NW",
  SW: "SW", W: "W", NW: "NW",
}

function norm(s: string): string {
  return s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()
}

function parseGrades(text: string): { min: string; max: string } {
  const t = text.replace(/\u00a0/g, " ")
  const range = t.match(/(?:du|de)\s+([3-9][abc][+]?)\s+(?:au|à)\s+([3-9][abc][+]?)/i)
  if (range) return { min: range[1].toLowerCase(), max: range[2].toLowerCase() }
  const single = t.match(/([3-9][abc][+]?)/)
  if (single) return { min: single[1].toLowerCase(), max: "" }
  return { min: "", max: "" }
}

function parseStyles(text: string): string[] {
  const t = text.toLowerCase()
  const styles: string[] = []
  if (t.includes("sportif") || t.includes("sport")) styles.push("sport")
  if (t.includes("trad")) styles.push("trad")
  if (t.includes("bloc") || t.includes("boulder")) styles.push("boulder")
  return styles.length ? styles : ["sport"]
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseClimbingPage(html: string): ParseResult {
  const $ = cheerio.load(html)

  // ── Name
  const name =
    norm($("h1.titre span").last().text()) ||
    norm($("h1.titre").text()) ||
    norm($("h1").first().text())

  // ── GPS markers
  const siteLat = parseFloat($(".js-marker-site").attr("data-lat") ?? "0")
  const siteLng = parseFloat($(".js-marker-site").attr("data-lng") ?? "0")
  const parkLat = parseFloat($(".js-marker-parc").attr("data-lat") ?? "0")
  const parkLng = parseFloat($(".js-marker-parc").attr("data-lng") ?? "0")

  // ── Location (span.bold "Lieu :" → "France, Occitanie, ..., Saint-Antonin-Noble-Val.")
  let country = "France"
  let address = ""
  $("span.bold").each((_, el) => {
    if ($(el).text().includes("Lieu")) {
      const raw = norm($(el).parent().text()).replace(/^Lieu\s*:?\s*/i, "")
      const parts = raw.split(",").map((s) => norm(s).replace(/\.$/, ""))
      country = parts[0] ?? "France"
      address = parts.at(-1) ?? ""
      return false // break
    }
  })

  // ── Orientation (first word after "Orientation(s) :" in page text)
  const pageText = norm($("body").text())
  const orientMatch = pageText.match(/Orientation\(s\)\s*:\s*([A-Z]+)/i)
  const orientation = orientMatch
    ? ORIENTATION_MAP[orientMatch[1].toUpperCase()] ?? undefined
    : undefined

  // ── Climbing description div (right after h2 "Description de l'escalade")
  let climbingText = ""
  $("h2.h2site").each((_, el) => {
    if ($(el).text().includes("Description")) {
      climbingText = norm($(el).next("div").text())
      return false
    }
  })

  // ── Intro blurb (.center.margin_bottom)
  const introText = norm($(".center.margin_bottom").text())

  // ── Rock/profile div (span.bold "Rocher :")
  let rockText = ""
  $("span.bold").each((_, el) => {
    if ($(el).text().includes("Rocher")) {
      const clone = $(el).parent().clone()
      clone.find("img").remove()
      rockText = norm(clone.text())
      return false
    }
  })

  // ── Approach text for parking note
  let parkingNote = ""
  $("span.bold").each((_, el) => {
    if ($(el).text().includes("Marche")) {
      const t = norm($(el).parent().text())
      const m = t.match(/Marche d'approche\s*:\s*([^.]+)/i)
      parkingNote = norm(m?.[1] ?? "")
      return false
    }
  })

  // ── Grades + styles from combined text
  const combined = [climbingText, introText].join(" ")
  const grades = parseGrades(combined)
  const styles = parseStyles(combined)

  // ── Build description: intro + first sentence of climbing div + rock details
  const climbingSummary = climbingText.split(/Equipement\s*:/i)[0].trim()
  const description = [introText, climbingSummary, rockText]
    .map(norm)
    .filter(Boolean)
    .join(" ")

  // ── Assemble
  const spot: ScrapedSpot = {
    name,
    description,
    location: { lat: siteLat, lng: siteLng, address, country },
    styles,
    ...(parkLat && parkLng
      ? { parking: { lat: parkLat, lng: parkLng, note: parkingNote } }
      : {}),
    addedBy: "admin",
    sectors: [],
  }

  const sector: ScrapedSector = {
    name,
    description: climbingSummary || description,
    style: styles,
    grades,
    ...(orientation ? { orientation } : {}),
    addedBy: "admin",
  }

  return { spot, sector }
}
