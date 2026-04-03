import { getPhotos } from "@/lib/data/photos"
import { PhotosManager } from "@/components/dashboard/photos-manager"

export default async function PhotosPage() {
  const photos = await getPhotos()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Photos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {photos.length} photo{photos.length !== 1 ? "s" : ""} dans le bucket Firebase Storage
        </p>
      </div>

      <PhotosManager initialPhotos={photos} />
    </div>
  )
}
