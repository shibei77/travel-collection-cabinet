import { useState } from 'react'
import { motion } from 'framer-motion'

function AuthScreen({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSignUp = mode === 'sign-up'

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (isSignUp && password !== confirmPassword) {
      setError('两次输入的密码不一致。')
      return
    }

    setIsSubmitting(true)

    try {
      if (isSignUp) {
        const result = await onSignUp({ email, password })
        setNotice(
          result.requiresEmailConfirmation
            ? '注册成功，请前往邮箱完成验证后登录。'
            : '注册成功，正在打开你的旅行藏品柜。',
        )
      } else {
        await onSignIn({ email, password })
      }
    } catch (submitError) {
      setError(submitError.message || '暂时无法完成操作，请稍后重试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-paper px-5 py-10 text-ink">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[linear-gradient(180deg,rgba(131,199,214,0.22),transparent)]" />
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md border border-grass/25 bg-white/70 p-7 shadow-[0_18px_50px_rgba(44,62,46,0.12)] backdrop-blur-sm sm:p-9"
        initial={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <span className="mb-5 block h-1.5 w-16 bg-grass" aria-hidden="true" />
        <p className="text-sm text-ink/55">把旅途收藏在云端</p>
        <h1 className="mt-2 font-heading text-4xl leading-tight text-ink">足迹·旅行藏品柜</h1>
        <p className="mt-3 text-sm leading-7 text-ink/65">登录后，属于你的城市、照片和故事会安全地只对你可见。</p>

        <div className="mt-7 grid grid-cols-2 border-b border-grass/20 text-sm" role="tablist">
          <button
            aria-selected={!isSignUp}
            className={`pb-3 transition-colors ${!isSignUp ? 'border-b-2 border-grass font-medium text-ink' : 'text-ink/50'}`}
            onClick={() => setMode('sign-in')}
            role="tab"
            type="button"
          >
            登录
          </button>
          <button
            aria-selected={isSignUp}
            className={`pb-3 transition-colors ${isSignUp ? 'border-b-2 border-grass font-medium text-ink' : 'text-ink/50'}`}
            onClick={() => setMode('sign-up')}
            role="tab"
            type="button"
          >
            注册
          </button>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium text-ink/75">
            邮箱
            <input
              autoComplete="email"
              className="h-11 rounded-lg border border-grass/25 bg-paper px-3 outline-none transition-colors focus:border-grass"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink/75">
            密码
            <input
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className="h-11 rounded-lg border border-grass/25 bg-paper px-3 outline-none transition-colors focus:border-grass"
              minLength="6"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {isSignUp && (
            <label className="grid gap-2 text-sm font-medium text-ink/75">
              确认密码
              <input
                autoComplete="new-password"
                className="h-11 rounded-lg border border-grass/25 bg-paper px-3 outline-none transition-colors focus:border-grass"
                minLength="6"
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </label>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {notice && <p className="rounded-lg bg-grass/10 px-3 py-2 text-sm text-ink/75">{notice}</p>}

          <button
            className="mt-2 rounded-lg bg-grass px-4 py-3 font-medium text-white shadow-[0_8px_18px_rgba(73,132,61,0.2)] transition-colors hover:bg-[#6cad5b] disabled:cursor-wait disabled:opacity-65"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '正在连接...' : isSignUp ? '创建账号' : '进入藏品柜'}
          </button>
        </form>
      </motion.section>
    </main>
  )
}

export default AuthScreen
