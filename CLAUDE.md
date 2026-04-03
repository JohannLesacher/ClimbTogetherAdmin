# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
# Back-Office Admin (Next.js + Firebase)

## 🎯 Présentation
Ce projet est l'espace administrateur dédié à une application mobile Expo/React Native. Il permet de piloter les données de production via Firebase, de gérer l'importation massive de documents et de monitorer l'activité via des statistiques.

## 🛠️ Development Environment

- **Core**: Next.js `16.2.2` (App Router) & React `19.2.4`
- **Language**: TypeScript `^5` (Strict)
- **Styling**: Tailwind CSS `^4` (CSS-first config), `tailwind-merge`, `tw-animate-css`
- **Component Library**: shadcn/ui `^4` (Radix UI 기반) + Lucide React
- **Database & Auth**: Firebase SDK `^12.11.0` & Firebase Admin `^13.7.0`
- **Package Manager**: `npm`

---

## 🛠 Principes de Développement & Règles
Tu dois impérativement respecter ces règles :

1. **Code Lisible > Commentaires :** Ne commente pas l'évidence. Le code doit être auto-explicatif par le nommage des variables et des fonctions. Commente uniquement les décisions métier complexes ou les hacks techniques nécessaires.
2. **Pragmatisme avant tout :** N'applique pas de Design Patterns complexes (Type Safety extrême, abstractions multicouches) si un simple fichier suffit. On évite le "over-engineering".
3. **Composants :** - Utilise les **Server Components** par défaut pour la récupération de données.
    - Utilise les **Client Components** (`'use client'`) uniquement pour l'interactivité.
    - UI basée sur **Shadcn/UI** : ne réinvente pas les composants existants.
4. **Data Management :**
    - Utilise **Zod** pour valider toute donnée entrante (formulaires, imports CSV).
    - Utilise le **Firebase Admin SDK** dans les API routes ou Server Actions pour les opérations critiques (batch writes, suppression d'utilisateurs).
5. **Type Safety :** TypeScript strict requis, mais évite les types complexes illisibles.

---

## 🏗 Architecture du Projet
L'architecture est volontairement plate pour favoriser la rapidité de navigation :

```text
├── app/                  # Pages, Layouts et API Routes (App Router)
│   ├── (auth)/           # Authentification admin
│   ├── (dashboard)/      # Routes protégées du dashboard
│   └── api/              # Handlers pour le Firebase Admin SDK
├── components/           # Composants React
│   ├── ui/               # Composants atomiques (Shadcn)
│   ├── dashboard/        # Composants métiers (Tables, Stats)
│   └── shared/           # Composants transverses
├── hooks/                # Hooks personnalisés (ex: useFirestore)
├── lib/                  # Configurations (firebase-client.ts, firebase-admin.ts)
├── types/                # Définitions TypeScript globales
└── utils/                # Fonctions utilitaires (formatage, calculs)
```
---

## 📝 Code Style Standards

- Prefer arrow functions
- Annotate return types
- Always destructure props
- Avoid `any` type, use `unknown` or strict generics
- Group imports: react → next → libraries → local

---

## 🧱 Component Guidelines

- Use `shadcn/ui` components by default for form elements, cards, dialogs, etc.
- Style components with Tailwind utility classes
- Co-locate CSS modules or component-specific styling in the same directory

---

## 📥 Logique d'Import & Stats

- Import : Toujours parser les fichiers côté client (PapaParse), valider avec Zod, puis envoyer par petits lots (Batches) vers Firestore via une API Route pour éviter les timeouts.
- Stats : Priorité à la lecture directe si possible, ou via des agrégats pré-calculés dans Firestore pour optimiser les coûts.