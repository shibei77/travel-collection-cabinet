import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AchievementUnlockModal from './components/AchievementUnlockModal'
import AddTravelModal from './components/AddTravelModal'
import AuthScreen from './components/AuthScreen'
import BlindBox from './components/BlindBox'
import CityMemoryView from './components/CityMemoryView'
import Footprints from './components/Footprints'
import TravelMap from './components/TravelMap'
import TravelSummary from './components/TravelSummary'
import { useAchievementTracker } from './hooks/useAchievementTracker'
import { useTravelStore } from './hooks/useTravelStore'
import { getTravelForGeoCity } from './utils/geoNames'

const navigationItems = [
  { icon: '🗺️', id: 'map', label: '旅行地图' },
  { icon: '📜', id: 'footprints', label: '足迹档案' },
  { icon: '📊', id: 'summary', label: '旅行总结' },
  { icon: '🎲', id: 'blind-box', label: '盲盒探索' },
]

function LoadingScreen({ label = '正在整理你的旅行碎片' }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-paper text-ink">
      <div className="grid justify-items-center gap-4">
        <span className="h-11 w-11 animate-spin rounded-full border-[3px] border-grass/20 border-t-grass" />
        <p className="font-heading text-xl">{label}</p>
      </div>
    </main>
  )
}

function SupabaseConfigurationScreen() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-paper px-5 text-ink">
      <section className="w-full max-w-xl border border-grass/25 bg-white/70 p-7 shadow-[0_18px_50px_rgba(44,62,46,0.1)] backdrop-blur-sm sm:p-9">
        <span className="block h-1.5 w-16 bg-lake" aria-hidden="true" />
        <p className="mt-5 text-sm text-ink/55">还差最后一步配置</p>
        <h1 className="mt-2 font-heading text-3xl text-ink">连接你的 Supabase 项目</h1>
        <p className="mt-4 text-sm leading-7 text-ink/70">
          当前 <code className="rounded bg-grass/10 px-1.5 py-0.5">.env.local</code> 中还没有可用的项目地址和匿名密钥。请填写后重启 Vite 开发服务器。
        </p>
        <pre className="mt-5 overflow-x-auto rounded-lg border border-grass/20 bg-paper p-4 text-sm leading-7 text-ink/80">{`VITE_SUPABASE_URL=https://你的项目.supabase.co\nVITE_SUPABASE_ANON_KEY=你的匿名密钥`}</pre>
      </section>
    </main>
  )
}

function App() {
  const {
    addTravel,
    deleteTravel,
    error,
    isAuthLoading,
    isTravelLoading,
    legacyTravelCount,
    migrateLegacyTravels,
    session,
    signIn,
    signOut,
    signUp,
    supabaseConfigurationError,
    travels,
    updateTravel,
  } = useTravelStore()
  const { dismissNextAchievement, evaluateAchievements, pendingAchievements, unlockedIds } =
    useAchievementTracker(travels)
  const [selectedCity, setSelectedCity] = useState(null)
  const [pendingCity, setPendingCity] = useState(null)
  const [editingTravel, setEditingTravel] = useState(null)
  const [recentlyLitCity, setRecentlyLitCity] = useState(null)
  const [activePage, setActivePage] = useState('map')
  const [isSaving, setIsSaving] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [notice, setNotice] = useState(null)
  const [dismissedStoreError, setDismissedStoreError] = useState('')

  useEffect(() => {
    if (session) {
      evaluateAchievements(travels)
    }
  }, [evaluateAchievements, session, travels])

  const activeNotice = notice ?? (
    error && error !== dismissedStoreError ? { kind: 'error', text: error } : null
  )

  const openVisitedCity = (cityName) => {
    const travel = getTravelForGeoCity(travels, cityName)

    if (travel) {
      setSelectedCity(travel)
    }
  }

  const openTravelForm = (cityName, cityContext) => {
    setPendingCity({ ...cityContext, cityName })
  }

  const saveTravel = async (travelDraft) => {
    setIsSaving(true)

    try {
      if (editingTravel) {
        const updatedTravel = await updateTravel(editingTravel.id, travelDraft)
        setSelectedCity(updatedTravel)
        setEditingTravel(null)
        setNotice({ kind: 'success', text: '旅行碎片已更新。' })
        return
      }

      const savedTravel = await addTravel(travelDraft)
      setPendingCity(null)
      setRecentlyLitCity(savedTravel.cityName)
      setNotice({ kind: 'success', text: `${savedTravel.cityName}已点亮。` })
    } catch (saveError) {
      setNotice({ kind: 'error', text: saveError.message || '保存失败，请稍后重试。' })
    } finally {
      setIsSaving(false)
    }
  }

  const removeTravel = async (travel) => {
    try {
      await deleteTravel(travel.id)
      setRecentlyLitCity(null)
      setSelectedCity(null)
      setNotice({ kind: 'success', text: `${travel.cityName}已恢复为未点亮状态。` })
    } catch (deleteError) {
      setNotice({ kind: 'error', text: deleteError.message || '删除失败，请稍后重试。' })
    }
  }

  const migrateLocalData = async () => {
    if (!window.confirm(`将这台设备上的 ${legacyTravelCount} 条旧记录导入当前账号？本机数据会保留为备份。`)) {
      return
    }

    setIsMigrating(true)

    try {
      const result = await migrateLegacyTravels()
      const skippedText = result.skippedCount ? `，${result.skippedCount} 条已存在并跳过` : ''
      setNotice({ kind: 'success', text: `迁移完成：已导入 ${result.migratedCount} 条${skippedText}。` })
    } catch (migrationError) {
      setNotice({ kind: 'error', text: migrationError.message || '迁移失败，请检查数据库设置。' })
    } finally {
      setIsMigrating(false)
    }
  }

  const exitAccount = async () => {
    try {
      await signOut()
      setEditingTravel(null)
      setPendingCity(null)
      setRecentlyLitCity(null)
      setSelectedCity(null)
      setNotice(null)
    } catch (signOutError) {
      setNotice({ kind: 'error', text: signOutError.message || '退出登录失败。' })
    }
  }

  if (supabaseConfigurationError) {
    return <SupabaseConfigurationScreen />
  }

  if (isAuthLoading || (session && isTravelLoading)) {
    return <LoadingScreen />
  }

  if (!session) {
    return <AuthScreen onSignIn={signIn} onSignUp={signUp} />
  }

  return (
    <div className="min-h-[100dvh] bg-paper font-sans text-ink">
      <header className="border-b border-grass/20 bg-paper/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5 sm:px-8">
          <a className="font-heading text-2xl leading-none text-ink sm:text-[1.7rem]" href="#top">
            足迹·旅行藏品柜
          </a>
          <div className="ml-auto flex items-center gap-3">
            {legacyTravelCount > 0 && (
              <button
                className="border-b border-lake pb-0.5 text-xs text-ink/70 transition-colors hover:border-ink hover:text-ink disabled:cursor-wait disabled:opacity-60"
                disabled={isMigrating}
                onClick={migrateLocalData}
                type="button"
              >
                {isMigrating ? '迁移中...' : `迁移本机数据 (${legacyTravelCount})`}
              </button>
            )}
            <button
              className="border-b border-grass/45 pb-0.5 text-xs text-ink/60 transition-colors hover:border-ink hover:text-ink"
              onClick={exitAccount}
              type="button"
            >
              退出登录
            </button>
            <div className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-grass/75" />
              <span className="h-2 w-2 rounded-full bg-lake/75" />
            </div>
          </div>
        </div>
      </header>

      <main
        id="top"
        aria-label="旅行内容区域"
        className="min-h-[calc(100dvh-8rem)] pb-20"
        data-selected-city={selectedCity?.id ?? ''}
      >
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 10 }}
          key={activePage}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {activePage === 'map' && (
            <TravelMap
              lastLitCity={recentlyLitCity}
              onUnvisitedCityClick={openTravelForm}
              onVisitedCityClick={openVisitedCity}
              travels={travels}
            />
          )}
          {activePage === 'footprints' && <Footprints onTravelClick={setSelectedCity} travels={travels} />}
          {activePage === 'summary' && <TravelSummary travels={travels} unlockedIds={unlockedIds} />}
          {activePage === 'blind-box' && <BlindBox travels={travels} />}
        </motion.div>
      </main>

      <motion.nav
        aria-label="主导航"
        className="fixed inset-x-0 bottom-0 border-t border-grass/25 bg-paper/95 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="mx-auto grid h-20 max-w-2xl grid-cols-4">
          {navigationItems.map((item) => (
            <button
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 text-xs transition-colors sm:text-sm ${
                activePage === item.id ? 'font-medium text-ink' : 'text-ink/55 hover:text-ink'
              }`}
              key={item.label}
              onClick={() => setActivePage(item.id)}
              type="button"
            >
              {activePage === item.id && (
                <span className="absolute inset-x-5 top-0 h-0.5 bg-grass" aria-hidden="true" />
              )}
              <span className="text-lg leading-none" aria-hidden="true">{item.icon}</span>
              <span className="truncate px-1">{item.label}</span>
            </button>
          ))}
        </div>
      </motion.nav>

      <AnimatePresence>
        {selectedCity && (
          <CityMemoryView
            city={selectedCity}
            onClose={() => setSelectedCity(null)}
            onDelete={removeTravel}
            onEdit={setEditingTravel}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(pendingCity || editingTravel) && (
          <AddTravelModal
            city={editingTravel ?? pendingCity}
            initialTravel={editingTravel}
            isSaving={isSaving}
            key={editingTravel?.id ?? pendingCity?.cityName}
            onClose={() => {
              if (!isSaving) {
                setEditingTravel(null)
                setPendingCity(null)
              }
            }}
            onSave={saveTravel}
          />
        )}
      </AnimatePresence>

      <AchievementUnlockModal achievement={pendingAchievements[0]} onClose={dismissNextAchievement} />

      <AnimatePresence>
        {activeNotice && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={`fixed left-1/2 top-5 z-[90] w-[min(92vw,28rem)] -translate-x-1/2 border px-4 py-3 text-sm shadow-lg ${
              activeNotice.kind === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-grass/30 bg-paper text-ink'
            }`}
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: -10 }}
            role="status"
          >
            <div className="flex items-center justify-between gap-3">
              <span>{activeNotice.text}</span>
              <button
                aria-label="关闭提示"
                className="text-lg leading-none"
                onClick={() => {
                  if (notice) {
                    setNotice(null)
                  } else {
                    setDismissedStoreError(error)
                  }
                }}
                type="button"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
