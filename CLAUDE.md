# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

# Back-Office Admin (Next.js + Firebase)

## 🎯 Présentation

Espace administrateur dédié à une application mobile **Expo/React Native**. Il permet de piloter les données de production via Firebase : consultation, import/export, suppression de données, gestion des photos Firebase Storage, et scraping de pages web pour créer des spots/secteurs.

---

## 🛠️ Stack Technique

| Domaine | Outil | Version |
|---|---|---|
| Framework | Next.js App Router | `16.2.2` |
| UI | React | `19.2.4` |
| Langage | TypeScript strict | `^5` |
| Styling | Tailwind CSS v4 (CSS-first, pas de tailwind.config.js) | `^4` |
| Composants | shadcn/ui v4 + Radix UI (package unifié `radix-ui`) + Lucide React | `^4` |
| Validation | Zod v4 | `^4.3.6` |
| Base de données | Firebase Admin SDK (Firestore) | `^13.7.0` |
| Auth | Firebase Admin SDK + Firebase SDK client | `^13.7.0` / `^12.11.0` |
| Storage | Firebase Admin SDK (Storage) | `^13.7.0` |
| Traitement image | sharp | `^0.34.5` |
| Scraping HTML | cheerio | `^1.x` |
| Package Manager | npm | — |

### Variables d'environnement requises (`.env.local`)

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=          # Les \n doivent être des vrais sauts de ligne → .replace(/\\n/g, "\n")
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=   # Ex: mon-projet.firebasestorage.app (utilisé aussi côté Admin SDK)
# + variables Firebase client SDK (NEXT_PUBLIC_FIREBASE_API_KEY, etc.)
```

---

## 🛠 Principes de Développement & Règles

1. **Code lisible > commentaires.** Le nommage doit suffire. Commente uniquement les décisions métier non-évidentes ou les hacks techniques.
2. **Pragmatisme avant tout.** Pas de Design Patterns complexes si un simple fichier suffit. Éviter l'over-engineering.
3. **Server Components par défaut** pour la récupération de données. `'use client'` uniquement pour l'interactivité (état, events, hooks browser).
4. **Frontière Server/Client stricte.** Ne jamais passer de fonctions (ex : column `cell` en JSX) en props d'un Server Component vers un Client Component — elles ne sont pas sérialisables. Les column definitions vivent dans les fichiers client (`*-table.tsx`).
5. **Zod v4** pour valider toute donnée entrante (imports JSON, formulaires). Les schemas d'import sont **intentionnellement permissifs** (pas de `.min(1)` sur des champs potentiellement vides en base) pour garantir le round-trip export → import. Utiliser `error.issues` plutôt que `error.flatten().fieldErrors` pour des messages d'erreur précis avec leur chemin complet.
6. **Firebase Admin SDK** pour toutes les opérations critiques dans les API routes (batch writes, suppressions, Storage).
7. **`router.refresh()`** après toute mutation (suppression, import, ajout secteur) pour re-déclencher le fetch des Server Components sans rechargement complet.
8. **shadcn/ui** comme base pour tous les composants UI. Ne pas réinventer ce qui existe.
9. **`any` interdit.** Utiliser `unknown` ou des génériques stricts. Typer les réponses `fetch` explicitement.
10. **Imports groupés :** react → next → libraries → local.

---

## 🏗 Architecture du Projet

```text
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                   # Sidebar sticky + header
│   │   ├── dashboard/page.tsx           # Vue d'ensemble / stats
│   │   ├── spots/page.tsx               # Server Component → SpotsTable + SpotImportDialog
│   │   ├── users/page.tsx               # Server Component → UsersTable
│   │   ├── teams/page.tsx               # Server Component → TeamsTable
│   │   ├── trips/page.tsx               # Server Component → TripsTable
│   │   ├── photos/page.tsx              # Server Component → PhotosManager
│   │   └── scraper/page.tsx             # Server Component → ScraperTool
│   └── api/
│       ├── auth/session/route.ts
│       ├── photos/
│       │   ├── route.ts                 # GET : liste fichiers bucket (signed URLs 1h)
│       │   ├── upload/route.ts          # POST : resize+compress sharp, upload Storage
│       │   └── delete/route.ts          # POST : supprime fichiers Storage
│       ├── scraper/
│       │   ├── parse/route.ts           # POST : fetch URL + parse HTML (cheerio)
│       │   └── apply/route.ts           # POST : crée spot ou ajoute secteur dans Firestore
│       ├── sectors/
│       │   ├── create/route.ts          # POST : crée secteur + increment sectorCount (batch)
│       │   └── delete/route.ts          # POST : supprime secteur(s) + decrement sectorCount (batch)
│       └── spots/
│           ├── export/route.ts          # POST : exporte spots + secteurs (sous-collections)
│           ├── import/route.ts          # POST : importe spots + secteurs en batch
│           └── delete/route.ts          # POST : supprime spots + leurs secteurs
│       ├── teams/delete/route.ts
│       ├── trips/delete/route.ts
│       └── users/delete/route.ts
│
├── components/
│   ├── ui/                              # Composants shadcn/ui
│   │   ├── badge, button, card, table
│   │   └── checkbox, dialog, input, label, select, textarea
│   └── dashboard/
│       ├── data-table.tsx               # Table statique (Server-compatible), type Column<T>
│       ├── export-table.tsx             # Table client générique : sélection + export + suppression
│       ├── spots-table.tsx              # Table hiérarchique spots+secteurs (expandable rows)
│       ├── users-table.tsx              # 'use client' — columns users + delete
│       ├── teams-table.tsx              # 'use client' — columns teams + delete
│       ├── trips-table.tsx              # 'use client' — columns trips + delete
│       ├── spot-import-dialog.tsx       # Import JSON (multi-spots+secteurs) ou formulaire
│       ├── sector-add-dialog.tsx        # Dialog ajout secteur (nom, style, grades, orientation)
│       ├── photos-manager.tsx           # Upload drag&drop, grille/liste, lightbox, suppression
│       ├── scraper-tool.tsx             # Scraper URL → preview + import direct
│       ├── nav-links.tsx
│       └── sign-out-button.tsx
│
├── lib/
│   ├── firebase-admin.ts                # adminDb, adminAuth, adminStorage (+ storageBucket)
│   ├── firebase.ts                      # Client SDK
│   ├── scraper/
│   │   └── parser.ts                   # Parsing cheerio : nom, GPS, grades, style, orientation…
│   └── data/                            # Fonctions de fetch server-side (React.cache)
│       ├── spots.ts  → getSpots(): SpotRow[]
│       │              getSpotsWithSectors(): SpotWithSectors[]
│       ├── users.ts  → getUsers(): UserRow[]
│       ├── teams.ts  → getTeams(): TeamRow[]
│       ├── trips.ts  → getTrips(): TripRow[]
│       └── stats.ts
│
├── types/
│   └── schemas.ts                       # Schemas Zod + types inférés (User, Spot, Sector…)
└── utils/
    └── firestore.ts                     # toMs(), formatDate()
```

---

## 📋 Features Développées

### `/spots` — Table hiérarchique Spots + Secteurs

La page spots utilise `getSpotsWithSectors()` qui charge spots **et** secteurs en parallèle côté serveur.

**Table hiérarchique (`SpotsTable`) :**
- Lignes spots : checkbox de sélection, toggle `▶/▼` pour déplier, nom + badge count secteurs, localisation, styles, date
- Lignes secteurs (quand dépliées) : nom, badges style, grades (`6a → 7b`), orientation, bouton 🗑
- Ligne `+ Ajouter un secteur` en bas de chaque spot déplié → ouvre `SectorAddDialog`
- Toolbar : export JSON (spots + secteurs inclus) + suppression en masse des spots

**`SectorAddDialog` :** formulaire nom / style (checkboxes) / grades min-max / orientation (select optionnel)

**API secteurs :**
- `POST /api/sectors/create` → batch atomique : `set(sectorRef)` + `update(spotRef, { sectorCount: increment(+1) })`
- `POST /api/sectors/delete` → batch atomique : `delete(sectorRef[])` + `update(spotRef, { sectorCount: increment(-n) })`

### `/spots` — Import JSON (`SpotImportDialog`)
- Deux modes : **JSON** (défaut) et **formulaire** (spot unique)
- JSON : textarea paste + file upload, parsing live avec preview `"N spots · M secteurs"`
- Format accepté : `{ data: [...] }` — compatible avec le format d'export (round-trip)
- Champs `id` / `sectors[].id` optionnels → Firestore génère les IDs si absents
- `router.refresh()` après succès

### `/users`, `/teams`, `/trips` — Tables standard
Pattern identique : Server Component fetch → `ExportTable<T>` client avec sélection + export + suppression.

### `/photos` — Gestion Firebase Storage
- Listing server-side avec signed URLs (valables 1h)
- Vue grille (thumbnails) ou liste (tableau)
- Lightbox au clic sur la miniature
- Upload drag & drop → **sharp** : resize `fit: inside` max 1280px, JPEG quality 75 + mozjpeg, dossier `admin-uploads/`
- Suppression avec confirmation
- `unoptimized` sur `<Image>` (signed URLs changent à chaque render)

### `/scraper` — Scraping web → import direct

**Flux :**
1. URL + mode (Spot / Secteur) + spot cible si secteur
2. `POST /api/scraper/parse` → fetch HTML + cheerio → retourne `{ spot, sector }`
3. Preview card + JSON textarea éditable
4. `POST /api/scraper/apply` → écrit dans Firestore

**Champs extraits (site type grimper.com) :**
| Champ | Sélecteur / méthode |
|---|---|
| Nom | `h1.titre span:last-child` |
| GPS site | `.js-marker-site` data-lat/lng |
| GPS parking | `.js-marker-parc` data-lat/lng |
| Pays + Adresse | span "Lieu :" → split virgule |
| Orientation | regex `Orientation(s) : NW` → map FR↔EN |
| Grades | regex `du 7c au 9a` dans le div climbing |
| Style | "sportif" → `sport`, "trad", "bloc" → `boulder` |
| Note parking | span "Marche d'approche :" |
| Description | intro + résumé climbing + roche/profil |

---

## 🔑 Patterns Importants

### Frontière Server/Client

```
Server Component (page.tsx)
  └─ fetch data (Admin SDK, React.cache)
  └─ render <ClientTable data={rows} />   ← uniquement données sérialisables

Client Component (*-table.tsx)
  └─ définit les columns (cell: JSX)      ← ne peut PAS traverser la frontière
  └─ gère sélection, expansion, dialogs
  └─ appelle router.refresh() après mutation
```

### Sidebar sticky
```tsx
// app/(dashboard)/layout.tsx
<aside className="hidden w-56 shrink-0 flex-col border-r bg-card lg:flex sticky top-0 h-screen">
```

### Radix UI (package unifié `radix-ui` v1.4+)
```ts
import { Checkbox, Dialog, Label, Select } from "radix-ui"
// usage : Checkbox.Root, Dialog.Root, Dialog.Content, etc.
```

### Zod v4 — pièges
- `z.url()` rejette les chaînes vides `""` → utiliser `z.string()` pour les champs potentiellement vides
- `error.flatten().fieldErrors` remonte les erreurs imbriquées sous la clé parente → utiliser `error.issues` avec leur `.path` pour des messages précis
- `.min(1)` sur les schemas d'import peut bloquer les round-trips → préférer `.default("")`

### Firebase Admin Storage
```ts
// Toujours spécifier storageBucket dans initializeApp
admin.initializeApp({
  credential: admin.credential.cert({ ... }),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
})
const [url] = await file.getSignedUrl({ action: "read", expires: Date.now() + 3_600_000 })
await bucket.file(path).save(buffer, { metadata: { contentType: "image/jpeg" } })
```

### Mutations secteurs — batch atomique
```ts
// Toujours mettre à jour sectorCount en même temps que le secteur
const batch = adminDb.batch()
batch.set(sectorRef, { ...data, createdAt: FieldValue.serverTimestamp() })
batch.update(spotRef, { sectorCount: FieldValue.increment(1) })
await batch.commit()
```

### Suppression spots avec sous-collections
```ts
// Firestore ne supprime pas les sous-collections automatiquement
await Promise.all(ids.map(async (id) => {
  const spotRef = adminDb.collection("climbingSpots").doc(id)
  const sectorsSnap = await spotRef.collection("sectors").get()
  const batch = adminDb.batch()
  sectorsSnap.docs.forEach((doc) => batch.delete(doc.ref))
  batch.delete(spotRef)
  await batch.commit()
}))
```

### Format JSON Import/Export Spots
```jsonc
{
  "exportedAt": "2025-01-15T10:30:00Z",  // ignoré à l'import
  "count": 2,                             // ignoré à l'import
  "data": [
    {
      "id": "abc123",           // optionnel — si absent, Firestore génère un ID
      "name": "Amazonia",
      "description": "...",
      "location": { "lat": -3.4, "lng": -62.2, "address": "...", "country": "Brésil" },
      "styles": ["sport"],
      "parking": { "lat": ..., "lng": ..., "note": "..." },  // optionnel
      "photoUrl": null,
      "addedBy": "admin",
      "createdAt": 1774998927020,  // optionnel — serverTimestamp() si absent
      "sectorCount": 2,            // ignoré à l'import (recalculé)
      "sectors": [
        {
          "id": "sector1",      // optionnel
          "name": "Secteur A",
          "style": ["sport"],   // note: "style" (pas "styles") pour les secteurs
          "grades": { "min": "5a", "max": "7b" },
          "orientation": "S",   // optionnel, enum: N NE E SE S SW W NW
          "addedBy": "admin",
          "createdAt": 1774998927020
        }
      ]
    }
  ]
}
```

### Types de données Firestore

```
climbingSpots/{id}
  name, description, location{lat,lng,address,country}
  styles: string[]          ← "sport" | "trad" | "boulder"
  sectorCount: number
  parking{lat,lng,note?}
  photoUrl, addedBy, createdAt

climbingSpots/{id}/sectors/{id}
  name, style: string[]     ← note: "style" pas "styles"
  grades{min,max}
  orientation?              ← "N"|"NE"|"E"|"SE"|"S"|"SW"|"W"|"NW"
  description?, photoUrl?, addedBy, createdAt

users/{id}
  uid, displayName, email, photoURL, createdAt

teams/{id}
  name, createdBy, members{uid→{role,joinedAt}}, memberUids, inviteCode, createdAt

trips/{id}
  title, description?, teamId, createdBy, memberUids, participantUids
  status: "planning"|"confirmed"|"done"|"cancelled"
  durationDays, confirmedDate?, confirmedSpot?, hasUnsettledCosts
  expenseCount, routeCount, createdAt
```
