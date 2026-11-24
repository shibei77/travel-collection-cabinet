import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { recommendCity } from '../data/cityPool'

function BlindBox({ travels }) {
  const [drawIndex, setDrawIndex] = useState(0)
  const [isDrawing, setIsDrawing] = useState(false)
  const [recommendation, setRecommendation] = useState(null)
  const [isWished, setIsWished] = useState(false)
  const drawTimerRef = useRef(null)
  const resultCardRef = useRef(null)

  useEffect(
    () => () => {
      window.clearTimeout(drawTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    if (!recommendation) {
      return undefined
    }

    const scrollTimer = window.setTimeout(() => {
      resultCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)

    return () => window.clearTimeout(scrollTimer)
  }, [recommendation])

  const drawNextCity = () => {
    if (isDrawing) {
      return
    }

    setIsDrawing(true)
    setRecommendation(null)
    setIsWished(false)
    drawTimerRef.current = window.setTimeout(() => {
      setRecommendation(recommendCity(travels))
      setDrawIndex((currentIndex) => currentIndex + 1)
      setIsDrawing(false)
    }, 3000)
  }

  return (
    <section aria-labelledby="blind-box-title" className="mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-4xl flex-col items-center px-5 py-8 pb-28 sm:px-8 sm:py-11">
      <header className="w-full text-center">
        <p className="text-sm text-ink/55">让下一次出发，带一点意外</p>
        <h1 id="blind-box-title" className="mt-1 font-heading text-4xl leading-none text-ink sm:text-5xl">盲盒探索</h1>
      </header>

      <motion.div
        animate={isDrawing ? { rotate: [0, -4, 4, -3, 3, 0], x: [0, -8, 9, -7, 5, 0] } : { rotate: 0, x: 0 }}
        className="relative mt-10 w-full max-w-sm"
        transition={isDrawing ? { duration: 0.66, ease: 'easeInOut', repeat: Infinity } : { type: 'spring', stiffness: 240, damping: 18 }}
      >
        <svg aria-hidden="true" className="h-auto w-full drop-shadow-[0_18px_24px_rgba(44,62,46,0.14)]" viewBox="0 0 360 390">
          <path d="M58 164h244v157c0 16-13 29-29 29H87c-16 0-29-13-29-29V164Z" fill="#83C7D6" />
          <path d="M76 164h208v157c0 6-5 11-11 11H87c-6 0-11-5-11-11V164Z" fill="#F9F9F4" opacity=".9" />
          <path d="M93 198h174v105H93z" fill="#7DBB6C" opacity=".78" />
          <circle cx="180" cy="127" fill="#F9F9F4" r="103" stroke="#7DBB6C" strokeWidth="12" />
          <circle cx="180" cy="127" fill="#83C7D6" opacity=".32" r="82" />
          <circle cx="144" cy="96" fill="#E7B866" r="19" />
          <circle cx="211" cy="99" fill="#D98C76" r="17" />
          <circle cx="171" cy="147" fill="#7DBB6C" r="21" />
          <circle cx="220" cy="153" fill="#F9F9F4" r="15" stroke="#83C7D6" strokeWidth="5" />
          <path d="M180 188c-40 0-73-27-81-64" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="7" opacity=".7" />
          <rect fill="#2C3E2E" height="17" rx="8.5" width="66" x="147" y="241" />
          <circle cx="180" cy="249" fill="#E7B866" r="24" stroke="#F9F9F4" strokeWidth="5" />
          <path d="M148 299h64" stroke="#2C3E2E" strokeLinecap="round" strokeWidth="7" />
          <path d="M72 352h216" stroke="#2C3E2E" strokeLinecap="round" strokeWidth="12" />
          <path d="M105 352v20m150-20v20" stroke="#2C3E2E" strokeLinecap="round" strokeWidth="10" />
        </svg>
        <motion.div
          animate={isDrawing ? { opacity: [0.25, 0.9, 0.25], scale: [0.88, 1.08, 0.88] } : { opacity: 0 }}
          className="pointer-events-none absolute left-1/2 top-[25%] h-32 w-32 -translate-x-1/2 rounded-full border-2 border-grass"
          transition={{ duration: 0.9, repeat: Infinity }}
        />
      </motion.div>

      <button
        className="mt-4 min-h-12 border border-grass bg-grass px-7 py-3 font-medium text-white shadow-[0_10px_20px_rgba(73,132,61,0.22)] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:bg-grass/55"
        disabled={isDrawing}
        onClick={drawNextCity}
        type="button"
      >
        {isDrawing ? '正在摇晃目的地' : '点击抽取下一站'}
      </button>

      <AnimatePresence mode="wait">
        {recommendation && (
          <motion.article
            className="mt-8 w-full max-w-sm border border-lake/45 bg-white p-6 text-center shadow-[0_16px_32px_rgba(44,62,46,0.14)]"
            initial={{ opacity: 0, scale: 0.72, y: -84 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.84, y: 24 }}
            key={`${recommendation.city.cityName}-${drawIndex}`}
            ref={resultCardRef}
            transition={{ type: 'spring', stiffness: 260, damping: 17 }}
          >
            <p className="text-sm text-ink/55">下一站推荐</p>
            <h2 className="mt-2 font-heading text-4xl leading-none text-ink">{recommendation.city.cityName}</h2>
            <p className="mt-2 text-sm text-ink/60">{recommendation.city.provinceName}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {recommendation.city.tags.map((tag) => (
                <span className="border border-grass/30 bg-grass/10 px-2 py-1 text-xs text-ink" key={tag}>{tag}</span>
              ))}
            </div>
            <p className="mt-5 text-sm text-ink/75">因为你好喜欢「{recommendation.preferredTag}」</p>
            <p className="mt-2 font-heading text-2xl text-ink">预计 ￥{recommendation.predictedCost}</p>
            <button
              className={`mt-6 w-full px-4 py-3 text-sm font-medium transition-colors ${
                isWished ? 'bg-ink/20 text-ink/60' : 'bg-lake text-ink hover:bg-[#6eb7c7]'
              }`}
              onClick={() => setIsWished(true)}
              type="button"
            >
              {isWished ? '已许愿' : '收入心愿单'}
            </button>
          </motion.article>
        )}
      </AnimatePresence>
    </section>
  )
}

export default BlindBox
