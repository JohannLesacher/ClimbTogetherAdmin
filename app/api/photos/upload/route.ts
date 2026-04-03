import { NextResponse } from "next/server"
import sharp from "sharp"
import { revalidateTag } from "next/cache"
import { randomUUID } from "node:crypto"
import { adminStorage } from "@/lib/firebase-admin"
import { requireAdminSession } from "@/lib/session"

const MAX_DIMENSION = 1280
const JPEG_QUALITY = 75
const UPLOAD_FOLDER = "admin-uploads"

export async function POST(request: Request) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 })
    }

    const bucket = adminStorage.bucket()

    const uploaded = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        const inputBuffer = Buffer.from(arrayBuffer)

        // Resize (max 1280px on either dimension, never upscale) + JPEG compress
        const outputBuffer = await sharp(inputBuffer)
          .resize(MAX_DIMENSION, MAX_DIMENSION, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
          .toBuffer()

        // Build storage path: admin-uploads/2025-01-15_original-name.jpg
        const date = new Date().toISOString().slice(0, 10)
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^.]+$/, "")
        const storagePath = `${UPLOAD_FOLDER}/${date}_${safeName}.jpg`

        // Générer un token de téléchargement stable → URL permanente stockable en base
        const downloadToken = randomUUID()

        const storageFile = bucket.file(storagePath)
        await storageFile.save(outputBuffer, {
          metadata: {
            contentType: "image/jpeg",
            metadata: { firebaseStorageDownloadTokens: downloadToken },
          },
        })

        // URL signée (1h) pour l'affichage immédiat dans le gestionnaire de photos
        const [signedUrl] = await storageFile.getSignedUrl({
          action: "read",
          expires: Date.now() + 60 * 60 * 1000,
        })

        // URL permanente avec token — non expirante, à stocker dans Firestore
        const bucket_name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!
        const permanentUrl =
          `https://firebasestorage.googleapis.com/v0/b/${bucket_name}` +
          `/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`

        return {
          path: storagePath,
          filename: `${date}_${safeName}.jpg`,
          url: signedUrl,
          permanentUrl,
          originalSize: inputBuffer.byteLength,
          compressedSize: outputBuffer.byteLength,
        }
      })
    )

    revalidateTag("photos", { expire: 0 })
    return NextResponse.json({ uploaded }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/photos/upload]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
