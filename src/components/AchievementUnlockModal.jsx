import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'

function AchievementUnlockModal({ achievement, onClose }) {
  useEffect(() => {
    if (!achievement) {
      return undefined
    }

    const endAt = Date.now() + 900
    const burst = window.setInterval(() => {
      confetti({
        colors: ['#7DBB6C', '#83C7D6', '#E7B866', '#F9F9F4'],
        disableForReducedMotion: true,
        gravity: 0.92,
        particleCount: 26,
        scalar: 0.82,
        spread: 64,
        startVelocity: 27,
        ticks: 160,
        origin: { x: Math.random() * 0.36 + 0.32, y: 0.48 },
      })

      if (Date.now() >= endAt) {
        window.clearInterval(burst)
      }
    }, 180)

    const closeTimer = window.setTimeout(onClose, 3500)

    return () => {
      window.clearInterval(burst)
      window.clearTimeout(closeTimer)
    }
  }, [achievement, onClose])

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          aria-live="polite"
          className="fixed inset-0 z-[80] grid place-items-center bg-ink/18 px-5 backdrop-blur-[1px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-xs border border-grass/35 bg-paper px-7 py-8 text-center shadow-[0_22px_58px_rgba(44,62,46,0.25)]"
            initial={{ opacity: 0, scale: 0.72, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 10 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ type: 'spring', damping: 15, stiffness: 260 }}
          >
            <span className="achievement-seal mx-auto grid h-20 w-20 place-items-center text-3xl text-white">
              {achievement.icon}
            </span>
            <p className="mt-5 text-xs font-medium text-ink/55">新勋章已解锁</p>
            <h2 className="mt-2 font-heading text-3xl leading-none text-ink">{achievement.name}</h2>
            <p className="mt-4 text-sm leading-6 text-ink/70">{achievement.desc}</p>
            <button
              className="mt-6 border-b border-grass pb-1 text-sm font-medium text-ink"
              onClick={onClose}
              type="button"
            >
              收藏这枚勋章
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AchievementUnlockModal
