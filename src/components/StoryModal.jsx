import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

function StoryModal({ cityName, layoutId, onClose, photo }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    const flipTimer = window.setTimeout(() => setIsFlipped(true), 220)

    return () => {
      window.clearTimeout(flipTimer)
      window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  const closeStory = () => {
    setIsFlipped(false)
    closeTimerRef.current = window.setTimeout(onClose, 260)
  }

  const handleImageError = (event) => {
    const image = event.currentTarget

    if (image.dataset.usedFallback !== 'true' && photo.fallbackUrl) {
      image.dataset.usedFallback = 'true'
      image.src = photo.fallbackUrl
    }
  }

  return (
    <motion.div
        className="absolute inset-0 z-30 flex items-center justify-center bg-ink/45 px-5 py-8 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeStory}
    >
        <motion.div
          layoutId={layoutId}
          className="relative h-[min(76vh,620px)] w-[min(88vw,450px)]"
          transition={{ type: 'spring', damping: 28, stiffness: 250 }}
          onClick={(event) => event.stopPropagation()}
          style={{ perspective: 1400 }}
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            className="relative h-full w-full"
            transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div
              aria-hidden={isFlipped}
              className="absolute inset-0 bg-white p-3 pb-10 shadow-[0_20px_50px_rgba(20,57,37,0.28)]"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <img
                alt={photo.note}
                className="h-full w-full object-cover"
                onError={handleImageError}
                src={photo.url || photo.fallbackUrl}
              />
              <p className="absolute inset-x-5 bottom-3 truncate font-heading text-lg text-ink/85">
                {photo.note}
              </p>
            </div>

            <div
              aria-hidden={!isFlipped}
              className="story-paper absolute inset-0 flex flex-col p-7 text-ink shadow-[0_20px_50px_rgba(20,57,37,0.28)] sm:p-9"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <p className="font-heading text-2xl leading-none text-ink">{cityName}</p>
              <p className="mt-1 text-sm text-ink/50">旅行手记</p>
              <p className="mt-9 whitespace-pre-line text-base leading-9 text-ink/85 sm:text-lg">
                {photo.story}
              </p>
              <button
                className="mt-auto self-end border-b border-grass pb-1 text-sm font-medium text-ink transition-colors hover:border-ink"
                onClick={closeStory}
                type="button"
              >
                合上故事
              </button>
            </div>
          </motion.div>
        </motion.div>
    </motion.div>
  )
}

export default StoryModal
