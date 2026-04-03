import { NextResponse } from "next/server"
import { parseClimbingPage } from "@/lib/scraper/parser"
import { requireAdminSession } from "@/lib/session"

export async function POST(request: Request) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const { url } = (await request.json()) as { url: string }

    if (!url || !URL.canParse(url)) {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 })
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Impossible de récupérer la page (HTTP ${res.status})` },
        { status: 502 }
      )
    }

    const html = await res.text()
    const result = parseClimbingPage(html)

    return NextResponse.json({ ...result, sourceUrl: url })
  } catch (err) {
    console.error("[POST /api/scraper/parse]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
