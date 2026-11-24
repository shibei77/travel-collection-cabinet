import { motion } from 'framer-motion'
import { useSignedPhotos } from '../hooks/useSignedPhotos'

const defaultCoverImage =
  'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80'

function formatDate(date) {
  if (!date) {
    return '日期待补'
  }

  const [year, month, day] = date.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

function handleCoverError(event) {
  const image = event.currentTarget
  if (image.dataset.usingDefaultFallback !== 'true') {
    image.dataset.usingDefaultFallback = 'true'
    image.src = defaultCoverImage
  }
}

function Footprints({ onTravelClick, travels }) {
  const sortedTravels = [...travels].sort(
    (left, right) => new Date(right.visitDate || 0) - new Date(left.visitDate || 0),
  )
  const coverPhotos = useSignedPhotos(sortedTravels.map((travel) => travel.photos?.[0] ?? null))

  return (
    <section aria-labelledby="footprints-title" className="mx-auto w-full max-w-6xl px-5 py-8 pb-28 sm:px-8 sm:py-11">
      <header className="max-w-xl">
        <p className="text-sm text-ink/55">按时间收藏每一段抵达</p>
        <h1 id="footprints-title" className="mt-1 font-heading text-4xl leading-none text-ink sm:text-5xl">
          足迹档案
        </h1>
      </header>

      {sortedTravels.length === 0 ? (
        <p className="mt-16 border-y border-grass/20 py-8 text-sm text-ink/55">还没有可以归档的旅行。</p>
      ) : (
        <ol className="relative mt-10">
          <div className="timeline-river absolute bottom-0 left-9 top-0 w-px md:left-1/2" />
          {sortedTravels.map((travel, index) => {
            const isLeft = index % 2 === 0
            const coverImage = coverPhotos[index]?.url || defaultCoverImage

            return (
              <li
                className="relative grid grid-cols-[4.5rem_minmax(0,1fr)] py-7 md:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] md:py-10"
                key={travel.id}
              >
                <div className="relative z-10 col-start-1 row-start-1 flex flex-col items-center md:col-start-2">
                  <motion.span
                    aria-hidden="true"
                    className="mt-4 h-4 w-4 rounded-full border-[3px] border-paper bg-grass shadow-[0_0_0_5px_rgba(125,187,108,0.18)]"
                    initial={{ opacity: 0, scale: 0.35 }}
                    transition={{ duration: 0.35, delay: 0.08 }}
                    viewport={{ amount: 0.45, once: true }}
                    whileInView={{ opacity: 1, scale: 1 }}
                  />
                  <time className="mt-3 text-center text-xs leading-5 text-ink/65 sm:text-sm">
                    {formatDate(travel.visitDate)}
                  </time>
                </div>
                <motion.button
                  aria-label={`查看${travel.cityName}的旅行藏品`}
                  className={`postcard group relative col-start-2 row-start-1 w-full max-w-md overflow-hidden border border-grass/20 bg-white text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-lake md:row-start-1 ${
                    isLeft
                      ? 'md:col-start-1 md:justify-self-end md:mr-8'
                      : 'md:col-start-3 md:justify-self-start md:ml-8'
                  }`}
                  initial={{ opacity: 0, x: isLeft ? -64 : 64, y: 16 }}
                  onClick={() => onTravelClick(travel)}
                  transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
                  viewport={{ amount: 0.28, once: true }}
                  whileHover={{
                    boxShadow: '0 18px 32px rgba(44, 62, 46, 0.16)',
                    scale: 1.018,
                    y: -4,
                  }}
                  whileInView={{ opacity: 1, x: 0, y: 0 }}
                  type="button"
                >
                  <div className="grid">
                    <img
                      alt={travel.cityName}
                      className="h-44 w-full bg-grass/10 object-cover"
                      onError={handleCoverError}
                      src={coverImage}
                    />
                    <div className="flex min-w-0 flex-col p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="truncate text-xl font-semibold text-ink sm:text-2xl">{travel.cityName}</h2>
                        <span className="shrink-0 text-sm font-medium text-ink/70">￥{Number(travel.cost || 0).toLocaleString('zh-CN')}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-sm text-ink/65">
                        <span>{travel.days || 1} 天</span>
                        <span>{travel.transport || '旅行'}</span>
                        {travel.companions && <span>👥 {travel.companions}</span>}
                      </div>
                      {travel.mood && (
                        <span className="mt-3 w-fit rounded-full border border-grass/30 bg-grass/10 px-2.5 py-1 text-xs font-medium text-[#426b37]">
                          {travel.mood}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default Footprints
