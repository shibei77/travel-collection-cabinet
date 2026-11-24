import { useCallback, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { achievements } from '../data/achievements'
import TravelPoster from './TravelPoster'
import { getTravelSummary } from '../utils/travelSummary'

const chartColors = ['#7DBB6C', '#83C7D6', '#E7B866', '#D98C76', '#91B69D', '#7398B4']

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value)
}

function waitForPosterImages(container) {
  const images = [...container.querySelectorAll('img')]

  return Promise.all(
    images.map((image) => {
      if (image.complete) {
        return Promise.resolve()
      }

      return new Promise((resolve) => {
        const timeoutId = window.setTimeout(resolve, 5500)
        const finish = () => {
          window.clearTimeout(timeoutId)
          resolve()
        }

        image.addEventListener('load', finish, { once: true })
        image.addEventListener('error', finish, { once: true })
      })
    }),
  )
}

function TravelSummary({ travels, unlockedIds = [] }) {
  const summary = useMemo(() => getTravelSummary(travels), [travels])
  const posterRef = useRef(null)
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false)
  const [posterMapReady, setPosterMapReady] = useState(false)
  const [posterPreviewUrl, setPosterPreviewUrl] = useState(null)
  const [posterError, setPosterError] = useState('')
  const tooltipStyle = {
    backgroundColor: '#F9F9F4',
    border: '1px solid rgba(125, 187, 108, 0.35)',
    borderRadius: 0,
    color: '#2C3E2E',
  }
  const handlePosterMapReady = useCallback((isReady) => {
    setPosterMapReady(isReady)
  }, [])

  const generatePoster = async () => {
    if (!posterRef.current || !posterMapReady) {
      return
    }

    setIsGeneratingPoster(true)
    setPosterError('')

    try {
      await waitForPosterImages(posterRef.current)
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)))

      const canvas = await html2canvas(posterRef.current, {
        allowTaint: false,
        backgroundColor: '#F9F9F4',
        imageTimeout: 6000,
        logging: false,
        scale: 1,
        useCORS: true,
      })

      setPosterPreviewUrl(canvas.toDataURL('image/png'))
    } catch {
      setPosterError('海报生成失败，请检查网络后重试。')
    } finally {
      setIsGeneratingPoster(false)
    }
  }

  return (
    <section aria-labelledby="summary-title" className="mx-auto w-full max-w-6xl px-5 py-8 pb-28 sm:px-8 sm:py-11">
      <header className="flex flex-col gap-5 border-b border-grass/25 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink/55">用数字回看每一次出发</p>
          <h1 id="summary-title" className="mt-2 font-heading text-[1.6rem] leading-tight text-ink sm:text-5xl">
            你的旅行人格：{summary.persona}
          </h1>
        </div>
        <div className="shrink-0">
          <button
            className="rounded-lg bg-ink px-4 py-3 text-sm font-medium text-paper shadow-[0_8px_18px_rgba(44,62,46,0.16)] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
            disabled={!posterMapReady || isGeneratingPoster}
            onClick={generatePoster}
            type="button"
          >
            {isGeneratingPoster
              ? '正在生成海报…'
              : posterMapReady
                ? '📸 生成我的旅行足迹'
                : '正在绘制旅行地图…'}
          </button>
          {posterError && <p className="mt-2 text-xs text-[#9a5545]">{posterError}</p>}
        </div>
      </header>

      <div className="grid border-b border-grass/25 sm:grid-cols-3">
        {[
          { label: '总花费', value: `￥${formatCurrency(summary.totalCost)}` },
          { label: '平均单次天数', value: `${summary.averageDays.toFixed(1)} 天` },
          { label: '日均花费', value: `￥${formatCurrency(summary.dailyCost)}` },
        ].map((metric, index) => (
          <div className={`py-6 sm:px-6 ${index > 0 ? 'sm:border-l sm:border-grass/25' : ''}`} key={metric.label}>
            <p className="text-sm text-ink/55">{metric.label}</p>
            <p className="mt-2 font-heading text-3xl leading-none text-ink">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-16">
        <section aria-labelledby="cost-share-title">
          <div className="flex items-end justify-between border-b border-grass/20 pb-3">
            <h2 id="cost-share-title" className="font-heading text-2xl text-ink">城市花费占比</h2>
            <span className="text-xs text-ink/50">共 {travels.length} 次</span>
          </div>
          <div className="h-72 pt-5">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={summary.pieData}
                  dataKey="value"
                  innerRadius="54%"
                  isAnimationActive={false}
                  outerRadius="80%"
                  paddingAngle={3}
                  stroke="transparent"
                >
                  {summary.pieData.map((entry, index) => (
                    <Cell fill={chartColors[index % chartColors.length]} key={entry.name} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`￥${formatCurrency(value)}`, '花费']} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2 border-t border-grass/15 pt-4 text-sm sm:grid-cols-3">
            {summary.pieData.map((entry, index) => (
              <div className="flex min-w-0 items-center gap-2" key={entry.name}>
                <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                <span className="truncate text-ink/70">{entry.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="cost-trend-title">
          <div className="flex items-end justify-between border-b border-grass/20 pb-3">
            <h2 id="cost-trend-title" className="font-heading text-2xl text-ink">月度花费趋势</h2>
            <span className="text-xs text-ink/50">按旅行月份</span>
          </div>
          <div className="h-72 pt-5">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={summary.lineData} margin={{ bottom: 5, left: -15, right: 8, top: 8 }}>
                <CartesianGrid stroke="rgba(125, 187, 108, 0.20)" strokeDasharray="3 5" vertical={false} />
                <XAxis axisLine={{ stroke: 'rgba(125, 187, 108, 0.55)' }} dataKey="month" tick={{ fill: '#2C3E2E', fontSize: 12 }} tickLine={false} />
                <YAxis axisLine={false} tick={{ fill: '#2C3E2E', fontSize: 12 }} tickFormatter={(value) => `￥${value / 1000}k`} tickLine={false} />
                <Tooltip formatter={(value) => [`￥${formatCurrency(value)}`, '花费']} contentStyle={tooltipStyle} />
                <Line activeDot={{ r: 6, fill: '#F9F9F4', stroke: '#7DBB6C', strokeWidth: 3 }} dataKey="cost" dot={{ fill: '#7DBB6C', r: 4, stroke: '#F9F9F4', strokeWidth: 2 }} stroke="#7DBB6C" strokeWidth={3} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section aria-labelledby="mood-spectrum-title" className="mt-14 border-y border-grass/20 py-8 sm:py-10">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.78fr)] lg:items-center lg:gap-14">
          <div>
            <p className="text-sm text-ink/55">把每一次出发的心情，留在一页色谱里</p>
            <h2 id="mood-spectrum-title" className="mt-1 font-heading text-3xl leading-none text-ink">情绪光谱</h2>
            {summary.topMood ? (
              <p className="mt-6 max-w-lg text-base leading-8 text-ink/75">
                在过去的旅程中，你使用最多的心情是
                <span className="mx-1 font-medium text-[#426b37]">【{summary.topMood}】</span>
                ，看来旅行是你最好的充电站。
              </p>
            ) : (
              <p className="mt-6 text-base leading-8 text-ink/65">下一次出发时，挑一个心情，把它留给未来的自己。</p>
            )}
          </div>
          <div className="h-72">
            {summary.moodData.length > 0 ? (
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    data={summary.moodData}
                    dataKey="value"
                    innerRadius="48%"
                    isAnimationActive={false}
                    outerRadius="78%"
                    paddingAngle={3}
                    stroke="transparent"
                  >
                    {summary.moodData.map((entry, index) => (
                      <Cell fill={chartColors[index % chartColors.length]} key={entry.name} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} 次`, '记录']} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center border border-dashed border-grass/30 text-sm text-ink/55">
                还没有心情记录
              </div>
            )}
          </div>
        </div>
        {summary.moodData.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-grass/15 pt-4 text-sm">
            {summary.moodData.map((entry, index) => (
              <span className="flex items-center gap-2 text-ink/70" key={entry.name}>
                <span className="h-2.5 w-2.5" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                {entry.name} {Math.round((entry.value / travels.length) * 100)}%
              </span>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="honor-wall-title" className="mt-14">
        <div className="flex items-end justify-between border-b border-grass/20 pb-3">
          <div>
            <p className="text-sm text-ink/55">每一段路，都会留下自己的印记</p>
            <h2 id="honor-wall-title" className="mt-1 font-heading text-3xl leading-none text-ink">荣誉墙</h2>
          </div>
          <span className="text-sm text-ink/55">{unlockedIds.length} / {achievements.length}</span>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {achievements.map((achievement) => {
            const isUnlocked = unlockedIds.includes(achievement.id)

            return (
              <div
                className={`group relative flex min-h-36 flex-col items-center justify-center border border-transparent px-3 py-4 text-center transition-transform hover:-translate-y-1 ${
                  isUnlocked ? 'text-ink' : 'opacity-40 grayscale'
                }`}
                key={achievement.id}
                title={`${achievement.name}：${achievement.desc}`}
              >
                <span className={`achievement-seal grid h-16 w-16 place-items-center text-2xl ${isUnlocked ? 'text-white' : 'achievement-seal--locked text-ink/65'}`}>
                  {achievement.icon}
                </span>
                <h3 className="mt-3 text-sm font-medium">{achievement.name}</h3>
                <p className="mt-1 text-xs leading-5 text-ink/60">{achievement.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      <div className="fixed left-[-1220px] top-0 z-[-1]" aria-hidden="true">
        <TravelPoster
          onMapReady={handlePosterMapReady}
          ref={posterRef}
          summary={summary}
          travels={travels}
        />
      </div>

      <AnimatePresence>
        {posterPreviewUrl && (
          <motion.div
            aria-label="旅行海报预览"
            aria-modal="true"
            className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/65 p-4 backdrop-blur-sm sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPosterPreviewUrl(null)}
            role="dialog"
          >
            <motion.div
              className="max-h-full max-w-md overflow-y-auto bg-paper p-4 shadow-[0_20px_58px_rgba(20,57,37,0.32)] sm:max-w-lg"
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(event) => event.stopPropagation()}
              transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            >
              <img alt="我的旅行足迹海报" className="block h-auto w-full" src={posterPreviewUrl} />
              <div className="flex items-center justify-between gap-4 pt-4">
                <p className="text-sm leading-6 text-ink/65">长按或右键保存这张旅行海报。</p>
                <a
                  className="shrink-0 border-b border-grass pb-1 text-sm font-medium text-ink"
                  download="我的旅行足迹.png"
                  href={posterPreviewUrl}
                >
                  下载 PNG
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export default TravelSummary
