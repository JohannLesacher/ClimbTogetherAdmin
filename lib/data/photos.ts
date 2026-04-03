import { cache } from "react"
import { unstable_cache } from "next/cache"
import { adminStorage } from "@/lib/firebase-admin"

export type PhotoFile = {
  path: string
  filename: string
  folder: string
  url: string
  size: number
  contentType: string
  updatedAt: number
}

// TTL : 55 min, légèrement inférieur à l'expiration des signed URLs (1h).
// Les mutations (upload/delete) appellent revalidateTag("photos") pour invalider
// immédiatement sans attendre l'expiration.
const SIGNED_URL_TTL_MS = 60 * 60 * 1000 // 1h
const CACHE_TTL_S = 55 * 60 // 55 min → garanti inférieur à l'expiration des URLs

const _getPhotos = unstable_cache(
  async (): Promise<PhotoFile[]> => {
    const bucket = adminStorage.bucket()
    const [files] = await bucket.getFiles({ maxResults: 500 })

    const imageFiles = files.filter((f) => f.metadata.contentType?.startsWith("image/"))

    const photos = await Promise.all(
      imageFiles.map(async (file): Promise<PhotoFile> => {
        const [url] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + SIGNED_URL_TTL_MS,
        })

        const parts = file.name.split("/")
        const filename = parts.at(-1) ?? file.name
        const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : ""

        return {
          path: file.name,
          filename,
          folder,
          url,
          size: Number(file.metadata.size ?? 0),
          contentType: file.metadata.contentType ?? "image/jpeg",
          updatedAt: file.metadata.updated
            ? new Date(file.metadata.updated as string).getTime()
            : 0,
        }
      })
    )

    photos.sort((a, b) => b.updatedAt - a.updatedAt)
    return photos
  },
  ["photos"],
  { tags: ["photos"], revalidate: CACHE_TTL_S }
)

/**
 * Liste toutes les photos du bucket Firebase Storage.
 * Les signed URLs sont cachées 55 min (sous le seuil d'expiration de 1h).
 * Dédupliquée intra-requête via React.cache.
 */
export const getPhotos = cache(_getPhotos)
