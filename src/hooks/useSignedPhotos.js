import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

export const TRAVEL_PHOTO_BUCKET = '旅行照片'

function getPhotoPath(photo) {
  return typeof photo?.path === 'string' ? photo.path.trim() : ''
}

function getPhotoUrl(photo) {
  return typeof photo?.url === 'string' ? photo.url.trim() : ''
}

export function getStoredPhotoPaths(photos) {
  return [...new Set((Array.isArray(photos) ? photos : []).map(getPhotoPath).filter(Boolean))]
}

export function useSignedPhotos(photos) {
  const safePhotos = Array.isArray(photos) ? photos : []
  const pathSignature = [...new Set(safePhotos.map(getPhotoPath).filter(Boolean))]
    .join('\u001f')
  const [signedUrls, setSignedUrls] = useState({})

  useEffect(() => {
    let isActive = true
    let refreshTimerId
    const paths = pathSignature ? pathSignature.split('\u001f') : []

    const refreshSignedUrls = async () => {
      if (!supabase || paths.length === 0) {
        return
      }

      const entries = await Promise.all(
        paths.map(async (path) => {
          const { data, error } = await supabase.storage
            .from(TRAVEL_PHOTO_BUCKET)
            .createSignedUrl(path, 3600)

          return [path, error ? '' : data?.signedUrl ?? '']
        }),
      )

      if (isActive) {
        setSignedUrls(Object.fromEntries(entries))
      }
    }

    void refreshSignedUrls()

    if (paths.length > 0) {
      refreshTimerId = window.setTimeout(() => {
        void refreshSignedUrls()
      }, 55 * 60 * 1000)
    }

    return () => {
      isActive = false
      window.clearTimeout(refreshTimerId)
    }
  }, [pathSignature])

  return safePhotos.map((photo) => ({
    ...photo,
    url: getPhotoPath(photo) ? signedUrls[getPhotoPath(photo)] ?? '' : getPhotoUrl(photo),
  }))
}
