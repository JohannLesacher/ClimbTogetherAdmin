import { z } from "zod";

// --- Helpers & Primitives ---

/**
 * Pour gérer les dates Firestore (Timestamp, Date ou Number)
 */
const timestampSchema = z.union([
  z.number(),
  z.date(),
  z.object({ seconds: z.number(), nanoseconds: z.number() }),
]);

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string(),
  country: z.string(),
});

const stylesEnum = z.enum(["sport", "trad", "boulder"]);
const orientationEnum = z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]);

// --- Modèles Firestore ---

// Users
export const userSchema = z.object({
  uid: z.string(),
  displayName: z.string().min(1),
  email: z.email("Email invalide"),
  photoURL: z.url().nullable(),
  createdAt: timestampSchema,
});

// Spots
export const spotSchema = z.object({
  name: z.string().min(2),
  description: z.string(),
  location: locationSchema,
  styles: z.array(stylesEnum).default([]),
  sectorCount: z.number().default(0),
  parking: z.object({
    lat: z.number(),
    lng: z.number(),
    note: z.string().optional(),
  }).optional(),
  photoUrl: z.url().nullable().optional(),
  addedBy: z.string(),
  createdAt: timestampSchema,
});

// Sectors (sous-collection de spots)
export const sectorSchema = z.object({
  name: z.string().min(1),
  style: z.array(stylesEnum),
  grades: z.object({
    min: z.string(),
    max: z.string(),
  }),
  description: z.string().optional(),
  orientation: orientationEnum.optional(),
  photoUrl: z.url().nullable().optional(),
  addedBy: z.string(),
  createdAt: timestampSchema,
});

// Teams
export const teamSchema = z.object({
  name: z.string().min(1),
  createdBy: z.string(),
  members: z.record(
    z.string(),
    z.object({
      role: z.enum(["admin", "member"]),
      joinedAt: timestampSchema,
    })
  ),
  memberUids: z.array(z.string()),
  inviteCode: z.string().length(6),
  createdAt: timestampSchema,
});

// Trips
export const tripSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  teamId: z.string(),
  createdBy: z.string(),
  memberUids: z.array(z.string()),
  participantUids: z.array(z.string()),
  status: z.enum(["planning", "confirmed", "done", "cancelled"]),
  durationDays: z.number().min(1).default(1),
  confirmedDate: timestampSchema.optional(),
  confirmedSpot: z.string().optional(),
  hasUnsettledCosts: z.boolean().default(false),
  expenseCount: z.number().default(0),
  routeCount: z.number().default(0),
  createdAt: timestampSchema,
});

// Routes (logs d'escalade dans un trip)
export const routeSchema = z.object({
  name: z.string().min(1),
  grade: z.string(),
  style: stylesEnum,
  rating: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  lead: z.boolean(),
  flash: z.boolean(),
  comment: z.string().optional(),
  addedBy: z.string(),
  ticks: z.array(
    z.object({
      uid: z.string(),
      lead: z.boolean(),
      flash: z.boolean(),
    })
  ).default([]),
  sectorId: z.string().optional(),
  sectorName: z.string().optional(),
  teamId: z.string(),
  createdAt: timestampSchema,
});

// Accommodations (options d'hébergement)
export const accommodationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['maison', 'appartement', 'camping', 'refuge', 'hotel', 'autre']),
  url: z.url(),
  pricePerNight: z.number().nullable(),
  totalPrice: z.number().nullable(),
  photoUrl: z.url().nullable(),
  proposedBy: z.string(),
  votes: z.array(z.string()).default([]),
  confirmed: z.boolean().default(false),
  address: z.string().nullable(),
  checkIn: z.string().nullable(),
  checkOut: z.string().nullable(),
  bookingRef: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.number(), // Date.now() utilisé ici selon ton doc
  teamId: z.string(),
});

// --- Types Ingrés ---

export type User = z.infer<typeof userSchema>;
export type Spot = z.infer<typeof spotSchema>;
export type Sector = z.infer<typeof sectorSchema>;
export type Team = z.infer<typeof teamSchema>;
export type Trip = z.infer<typeof tripSchema>;
export type Route = z.infer<typeof routeSchema>;
export type Accommodation = z.infer<typeof accommodationSchema>;