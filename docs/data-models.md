# ClimbTogether — Modèles de données & Firestore

## Modèles Firestore

### `users/{uid}`
```ts
{ displayName, email, photoURL, createdAt }
```

### `climbingSpots/{spotId}`
```ts
{
  name, description,
  location: { lat, lng, address, country },
  styles: ('sport' | 'trad' | 'boulder')[],  // agrégé depuis les secteurs (dénormalisé)
  sectorCount: number,                        // dénormalisé depuis sous-collection
  parking?: { lat, lng, note },
  photoUrl?: string | null,                   // URL Firebase Storage (après upload)
  addedBy: uid, createdAt
}
```

### `climbingSpots/{spotId}/sectors/{sectorId}`
```ts
{
  name,
  style: ('sport' | 'trad' | 'boulder')[],
  grades: { min, max },
  description?: string,
  orientation?: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW',  // face du secteur
  photoUrl?: string | null,                   // URL Firebase Storage (après upload)
  addedBy: uid, createdAt
}
```
Secteurs **modifiables** par tout utilisateur authentifié — voir règles Firestore.

### `teams/{teamId}`
```ts
{
  name, createdBy,
  members: { [uid]: { role: 'admin' | 'member', joinedAt } },
  memberUids: uid[],   // array pour les queries Firestore
  inviteCode: string,  // 6 caractères
  createdAt
}
```

### `teams/{teamId}/messages/{msgId}`
```ts
{ text, senderId, senderName, createdAt, type: 'text' | 'image', imageUrl?: string }
// imageUrl présent uniquement si type === 'image' ; text est '' dans ce cas
```

### `teams/{teamId}/gear/main`
```ts
{ heldBy: string, teamId: string }
// heldBy = uid du membre qui détient actuellement le matériel commun
// Document unique par équipe — setDoc écrase l'entrée précédente
```

### `trips/{tripId}`
```ts
{
  title, description, teamId,
  createdBy,
  memberUids: uid[],       // miroir de team.memberUids (pour rules sans get())
  participantUids: uid[],  // participants effectifs : créateur + votants (recalculé par vote/togglePin)
  status: 'planning' | 'confirmed' | 'done' | 'cancelled',
  durationDays: number,    // 1 = journée (défaut), 2–7 = multi-jours
  confirmedDate?: Timestamp,   // date de DÉBUT de la plage retenue
  confirmedSpot?: spotId,
  // Champs dénormalisés (mis à jour automatiquement par les hooks)
  hasUnsettledCosts?: boolean,
  expenseCount?: number,
  routeCount?: number,
  createdAt
}
```

### `trips/{tripId}/datePoll/main`
```ts
{
  options: { date: string, votes: uid[] }[],  // date = YYYY-MM-DD (date de début de plage)
  pinnedDates: string[]                       // au plus une date épinglée à la fois
}
```
La durée de chaque plage est déduite de `trip.durationDays` — le sondage ne stocke que la date de début.

### `trips/{tripId}/transport`
```ts
{ cars: { driver: uid, seats, from, passengers: uid[] }[] }
```

### `trips/{tripId}/costs`
```ts
{ expenses: { paidBy: uid, amount, label, splitWith: uid[] }[], settlements: {...}[] }
```

### `trips/{tripId}/routes/{routeId}`
```ts
{
  name, grade,
  style: 'sport' | 'trad' | 'boulder',
  rating: 1 | 2 | 3,
  lead: boolean, flash: boolean,
  comment: string,
  addedBy: uid,
  ticks: { uid, lead: boolean, flash: boolean }[],
  sectorId?: string,   // optionnel
  sectorName?: string, // dénormalisé pour TeamTripCard (évite les fetches)
  teamId: string,      // requis par les rules
  createdAt: Timestamp
}
```

### `trips/{tripId}/messages/{msgId}`
```ts
{ text, senderId, senderName, createdAt, type: 'text' | 'image', teamId: string, imageUrl?: string }
// imageUrl présent uniquement si type === 'image' ; text est '' dans ce cas
```

### `trips/{tripId}/accommodations/{optionId}`
```ts
{
  name: string,
  type: 'maison' | 'appartement' | 'camping' | 'refuge' | 'hotel' | 'autre',
  url: string,                // lien de réservation / annonce
  pricePerNight: number | null,
  totalPrice: number | null,
  photoUrl: string | null,    // URL Firebase Storage (après upload)
  proposedBy: uid,
  votes: uid[],               // vote exclusif : voter ici retire le vote des autres options
  confirmed: boolean,         // une seule option peut être confirmed à la fois
  address: string | null,
  checkIn: string | null,
  checkOut: string | null,
  bookingRef: string | null,
  notes: string | null,
  createdAt: number,          // Date.now()
  teamId: string              // requis par les rules Firestore
}
```
Une seule option peut avoir `confirmed: true` à la fois — `confirmOption` passe toutes les autres à `false` via `writeBatch`. Les champs `address`, `checkIn`, `checkOut`, `bookingRef`, `notes` sont éditables uniquement sur l'option confirmée (admin ou proposeur).

---

## Règles Firestore — points clés

### Spots & Secteurs
- **Spots read** : tout utilisateur authentifié
- **Spots create** : `addedBy == request.auth.uid`
- **Spots update** : tout utilisateur authentifié (`isAuth()`) — tous les membres peuvent modifier un spot
- **Spots delete** : créateur uniquement (`addedBy == uid`)
- **Sectors create** : `addedBy == request.auth.uid`
- **Sectors update** : tout utilisateur authentifié (tous les champs, y compris `orientation`) — règles à mettre à jour
- **Sectors delete** : tout utilisateur authentifié (`isAuth()`)

### Teams
- **Auto-join** : `update` sur teams autorise uniquement l'ajout de soi-même dans `members` + `memberUids`. Aucun retrait ni ajout d'autrui possible.
- **Gear** : `read` et `write` réservés aux membres de l'équipe (`isMember(teamId)`)

### Trips
- **Read** : `request.auth.uid in resource.data.memberUids` (pas de get() sur teams)
- **Create** : `isMember(teamId)` + `createdBy == uid` + `uid in memberUids`
- **Update** : `uid in resource.data.memberUids`
- **Delete** : `createdBy == uid`

### Sous-collections trips
- **Read** : `uid in get(trip).data.memberUids` (1 seul get())
- **Create** : `request.resource.data.teamId != null && isMember(teamId)` → **tout doc de sous-collection doit avoir un champ `teamId`**
- **Update/Delete** : `isMember(resource.data.teamId)`

---

## Patterns de dénormalisation

| Champ dénormalisé | Sur quel doc | Mis à jour par |
|---|---|---|
| `memberUids` | `trips/{tripId}` | `TeamContext.joinTeam / leaveTeam` via `writeBatch` |
| `participantUids` | `trips/{tripId}` | `useTrip.vote()` et `useTrip.togglePin()` via `computeParticipants()` |
| `hasUnsettledCosts` | `trips/{tripId}` | `useCosts` après chaque mutation |
| `expenseCount` | `trips/{tripId}` | `useCosts` après chaque mutation |
| `routeCount` | `trips/{tripId}` | `useRoutes.addRoute / deleteRoute` |
| `sectorCount` | `climbingSpots/{id}` | `useSectors.addSector / deleteSector` (recompute depuis liste locale) |
| `styles` (agrégé) | `climbingSpots/{id}` | `useSectors.addSector / deleteSector` |
| `sectorName` | `routes/{routeId}` | copié au moment de l'écriture dans `useRoutes.addRoute` |

**Règle** : tout document de sous-collection trip doit inclure `teamId` à la création (requis par les rules). Les hooks `useCosts`, `useTransport`, `useRoutes`, `useChat` (trip) et `useTrip` (datePoll) l'injectent automatiquement.

---

## Firebase Storage

### Structure des chemins
```
chat-images/
  teams/{teamId}/{timestamp}_{uid}.jpg              ← chat équipe
  trips/{tripId}/{timestamp}_{uid}.jpg              ← chat sortie
accommodation-images/
  trips/{tripId}/{optionId}_{timestamp}.jpg         ← photo d'option hébergement
spot-images/
  {spotId}.jpg                                      ← photo de spot
sector-images/
  {spotId}/{sectorId}.jpg                           ← photo de secteur
avatar-images/
  {uid}.jpg                                         ← avatar utilisateur (écrase à chaque update)
```
La sécurité métier (qui voit quoi) est assurée par les Firestore rules — les URLs Storage contiennent un token d'accès opaque retourné par `getDownloadURL()`.
