import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSignedPhotos } from '../hooks/useSignedPhotos'
import StoryModal from './StoryModal'

const photoRatios = ['4 / 5', '1 / 1', '3 / 4', '4 / 5', '5 / 4', '3 / 4']
const defaultPhotoFallback =
  'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=80'

function getPhotoTilt(seed) {
  const hash = [...seed].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7)
  const magnitude = 2 + (hash % 31) / 10

  return (hash % 2 === 0 ? -1 : 1) * magnitude
}

function CityPhotoWall({ city, onClose, onDelete, onEdit }) {
  const [activePhotoId, setActivePhotoId] = useState(null)
  const [loadedPhotoIds, setLoadedPhotoIds] = useState(() => new Set())
  const layoutPrefix = `travel-photo-${city.id}`

  const photoRecords = useMemo(
    () =>
      (city.photos ?? []).map((photo, index) => ({
        ...photo,
        fallbackUrl: defaultPhotoFallback,
        ratio: photoRatios[index % photoRatios.length],
        tilt: getPhotoTilt(`${city.id}-${photo.id}`),
      })),
    [city.id, city.photos],
  )
  const photos = useSignedPhotos(photoRecords)
  const activePhoto = photos.find((photo) => photo.id === activePhotoId) ?? null

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  const closeWall = () => {
    if (activePhoto) {
      setActivePhotoId(null)
      return
    }

    onClose()
  }

  const deleteCityMemory = () => {
    if (window.confirm(`删除${city.cityName}的全部旅行记录？`)) {
      onDelete?.(city)
    }
  }

  const markPhotoLoaded = (photoId) => {
    setLoadedPhotoIds((currentPhotoIds) => {
      const nextPhotoIds = new Set(currentPhotoIds)
      nextPhotoIds.add(photoId)
      return nextPhotoIds
    })
  }

  const handleImageError = (event, photo) => {
    const image = event.currentTarget

    if (image.dataset.usedFallback === 'true') {
      markPhotoLoaded(photo.id)
      return
    }

    image.dataset.usedFallback = 'true'
    image.src = photo.fallbackUrl
  }

  return (
    <motion.aside
        aria-label={`${city.cityName}照片墙`}
        aria-modal="true"
        className="photo-wall-surface fixed inset-0 z-50 overflow-y-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        role="dialog"
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      >
        <div className="relative mx-auto min-h-full max-w-6xl px-5 pb-16 pt-8 sm:px-10 sm:pt-11">
          <header className="relative z-10 flex items-start justify-between border-b border-white/50 pb-5">
            <div>
              <p className="text-sm text-ink/60">{city.provinceName}</p>
              <h2 className="mt-1 font-heading text-3xl leading-none text-ink sm:text-4xl">
                {city.cityName}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="border border-white/70 bg-paper/65 px-3 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-white"
                onClick={() => onEdit?.(city)}
                type="button"
              >
                编辑
              </button>
              <button
                className="border border-white/70 bg-paper/65 px-3 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-white"
                onClick={deleteCityMemory}
                type="button"
              >
                删除
              </button>
              <button
                aria-label="关闭照片墙"
                className="grid h-10 w-10 place-items-center border border-white/70 bg-paper/65 text-2xl leading-none text-ink shadow-sm transition-transform hover:scale-105"
                onClick={closeWall}
                type="button"
              >
                ×
              </button>
            </div>
          </header>

          {photos.length === 0 ? (
            <div className="relative z-10 mx-auto mt-14 max-w-lg border-y border-white/55 py-10 text-center">
              <p className="font-heading text-2xl text-ink">这一程还没有照片</p>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-ink/70">
                {city.story || '留一点空白，等下一次慢慢补上。'}
              </p>
            </div>
          ) : (
            <div className="relative z-10 columns-1 gap-7 pt-9 sm:columns-2 lg:columns-3">
              {photos.map((photo, index) => {
              const isPhotoActive = activePhoto?.id === photo.id
              const isPhotoLoaded = loadedPhotoIds.has(photo.id)
              const shouldFade = activePhoto && !isPhotoActive
              const layoutId = `${layoutPrefix}-${photo.id}`

              return (
                <motion.button
                  aria-label={`阅读${photo.note}的故事`}
                  className="polaroid-card mb-8 block w-full break-inside-avoid bg-white p-3 pb-10 text-left shadow-[0_8px_18px_rgba(44,62,46,0.16)] focus:outline-none focus-visible:ring-2 focus-visible:ring-lake"
                  initial={{ opacity: 0, rotate: 0, y: 28 }}
                  key={photo.id}
                  layoutId={layoutId}
                  onClick={() => setActivePhotoId(photo.id)}
                  transition={{
                    delay: index * 0.07,
                    layout: { type: 'spring', damping: 28, stiffness: 250 },
                    opacity: { duration: 0.2 },
                    filter: { duration: 0.2 },
                    rotate: { duration: 0.38, ease: 'easeOut' },
                    y: { duration: 0.38, ease: 'easeOut' },
                  }}
                  animate={{
                    filter: activePhoto ? (isPhotoActive ? 'blur(0px)' : 'blur(5px)') : 'blur(0px)',
                    opacity: isPhotoActive ? 0 : shouldFade ? 0.24 : isPhotoLoaded ? 1 : 0,
                    rotate: photo.tilt,
                    y: isPhotoLoaded ? 0 : 28,
                  }}
                  type="button"
                  whileHover={activePhoto ? undefined : { rotate: photo.tilt, scale: 1.025, y: -5 }}
                >
                  <img
                    alt={photo.note}
                    className="w-full object-cover"
                    loading="lazy"
                    onError={(event) => handleImageError(event, photo)}
                    onLoad={() => markPhotoLoaded(photo.id)}
                    src={photo.url || photo.fallbackUrl}
                    style={{ aspectRatio: photo.ratio }}
                  />
                  <p className="mt-3 truncate font-heading text-lg leading-none text-ink/85">{photo.note}</p>
                </motion.button>
              )
              })}
            </div>
          )}
        </div>

        <AnimatePresence>
          {activePhoto && (
            <StoryModal
              cityName={city.cityName}
              layoutId={`${layoutPrefix}-${activePhoto.id}`}
              onClose={() => setActivePhotoId(null)}
              photo={activePhoto}
            />
          )}
        </AnimatePresence>
      </motion.aside>
  )
}

export default CityPhotoWall
