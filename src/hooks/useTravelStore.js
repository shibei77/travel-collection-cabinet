import { useCallback, useEffect, useRef, useState } from 'react'
import { getStoredPhotoPaths, TRAVEL_PHOTO_BUCKET } from './useSignedPhotos'
import { supabase, supabaseConfigurationError } from '../utils/supabase'

export const LEGACY_TRAVEL_STORAGE_KEY = 'footprints.travel-collection.records.v1'

function toArray(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

function readLegacyTravelRecords() {
  try {
    return toArray(window.localStorage.getItem(LEGACY_TRAVEL_STORAGE_KEY))
  } catch {
    return []
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value ?? '')
}

function toTravel(row) {
  return {
    cityName: row.city_name,
    companions: row.companions ?? '',
    coordinates: toArray(row.coordinates),
    cost: Number(row.cost ?? 0),
    createdAt: row.created_at,
    days: Number(row.days ?? 1),
    id: row.id,
    mood: row.mood ?? '',
    photos: toArray(row.photos),
    provinceName: row.province_name,
    story: row.story ?? '',
    tags: toArray(row.tags),
    transport: row.transport ?? '旅行',
    updatedAt: row.updated_at,
    visitDate: row.visit_date,
  }
}

function toTravelRecord(travel, userId, legacySourceId) {
  const record = {
    city_name: travel.cityName,
    companions: travel.companions?.trim?.() ?? '',
    coordinates: toArray(travel.coordinates),
    cost: Number(travel.cost) || 0,
    days: Math.max(1, Number(travel.days) || 1),
    mood: travel.mood?.trim?.() || null,
    photos: toArray(travel.photos).map((photo) => {
      const { file: _file, ...storedPhoto } = photo
      return storedPhoto
    }),
    province_name: travel.provinceName || '未知省份',
    story: travel.story?.trim?.() || null,
    tags: toArray(travel.tags),
    transport: travel.transport || '旅行',
    user_id: userId,
    visit_date: travel.visitDate || new Date().toISOString().slice(0, 10),
  }

  if (legacySourceId) {
    record.legacy_source_id = legacySourceId
  }

  return record
}

function sanitizeFileName(fileName) {
  const normalizedName = String(fileName || 'travel-photo')
    .replace(/[\\/]/g, '-')
    .replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')

  return normalizedName || 'travel-photo'
}

function createStoragePath(userId, file) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const fileName = `${randomId}-${sanitizeFileName(file.name)}`

  return `${userId}/${fileName}`
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback
}

export function useTravelStore() {
  const [travels, setTravels] = useState([])
  const [session, setSession] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(!supabaseConfigurationError)
  const [isTravelLoading, setIsTravelLoading] = useState(false)
  const [error, setError] = useState('')
  const [legacyTravelCount, setLegacyTravelCount] = useState(() => readLegacyTravelRecords().length)
  const requestVersionRef = useRef(0)

  const ensureClient = useCallback(() => {
    if (!supabase) {
      throw new Error('Supabase 尚未配置，请先填写 .env.local。')
    }
  }, [])

  const loadTravelsForUser = useCallback(async (user) => {
    if (!supabase || !user) {
      setTravels([])
      setIsTravelLoading(false)
      return []
    }

    const requestVersion = ++requestVersionRef.current
    setIsTravelLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('travel_records')
      .select('*')
      .eq('user_id', user.id)
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (requestVersion !== requestVersionRef.current) {
      return []
    }

    setIsTravelLoading(false)

    if (queryError) {
      setError(getErrorMessage(queryError, '旅行记录加载失败。'))
      return []
    }

    const nextTravels = (data ?? []).map(toTravel)
    setTravels(nextTravels)
    return nextTravels
  }, [])

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    let isMounted = true

    const applySession = async (nextSession) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession)

      if (!nextSession?.user) {
        requestVersionRef.current += 1
        setTravels([])
        setIsTravelLoading(false)
        return
      }

      await loadTravelsForUser(nextSession.user)
    }

    const initialize = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (sessionError) {
        setError(getErrorMessage(sessionError, '登录状态读取失败。'))
      }

      await applySession(data.session)
      if (isMounted) {
        setIsAuthLoading(false)
      }
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [loadTravelsForUser])

  const fetchTravels = useCallback(async () => loadTravelsForUser(session?.user), [loadTravelsForUser, session])

  const signUp = useCallback(
    async ({ email, password }) => {
      ensureClient()
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

      if (signUpError) {
        throw new Error(getErrorMessage(signUpError, '注册失败。'))
      }

      return { requiresEmailConfirmation: !data.session }
    },
    [ensureClient],
  )

  const signIn = useCallback(
    async ({ email, password }) => {
      ensureClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        throw new Error(getErrorMessage(signInError, '登录失败。'))
      }
    },
    [ensureClient],
  )

  const signOut = useCallback(async () => {
    ensureClient()
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      throw new Error(getErrorMessage(signOutError, '退出登录失败。'))
    }
  }, [ensureClient])

  const uploadPhotoFile = useCallback(
    async (file, userId) => {
      if (!(file instanceof File) || !file.type.startsWith('image/')) {
        throw new Error('请选择图片文件后再保存。')
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('单张图片不能超过 10MB。')
      }

      const path = createStoragePath(userId, file)
      const { error: uploadError } = await supabase.storage
        .from(TRAVEL_PHOTO_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        throw new Error(getErrorMessage(uploadError, '图片上传失败。'))
      }

      return path
    },
    [],
  )

  const prepareTravelForSave = useCallback(
    async (travelDraft, userId) => {
      const uploadedPaths = []

      try {
        const photos = await Promise.all(
          toArray(travelDraft.photos).map(async ({ file, ...photo }) => {
            const path = photo.path || (file ? await uploadPhotoFile(file, userId) : '')

            if (file && path) {
              uploadedPaths.push(path)
            }

            const cleanedPhoto = {
              id: photo.id,
              note: photo.note,
              story: photo.story,
            }

            if (path) {
              cleanedPhoto.path = path
            } else if (photo.url?.trim()) {
              // Compatibility for existing records created before private Storage uploads.
              cleanedPhoto.url = photo.url.trim()
            }

            return cleanedPhoto
          }),
        )

        return { travel: { ...travelDraft, photos }, uploadedPaths }
      } catch (uploadError) {
        if (uploadedPaths.length > 0) {
          await supabase.storage.from(TRAVEL_PHOTO_BUCKET).remove(uploadedPaths)
        }

        throw uploadError
      }
    },
    [uploadPhotoFile],
  )

  const removePhotoFiles = useCallback(async (paths) => {
    if (!paths.length) {
      return
    }

    const { error: removeError } = await supabase.storage.from(TRAVEL_PHOTO_BUCKET).remove(paths)

    if (removeError) {
      console.warn('Unable to remove private travel photos:', removeError.message)
    }
  }, [])

  const addTravel = useCallback(
    async (travelDraft) => {
      ensureClient()

      if (!session?.user) {
        throw new Error('请先登录后再保存旅行记录。')
      }

      const { travel, uploadedPaths } = await prepareTravelForSave(travelDraft, session.user.id)

      const { data, error: insertError } = await supabase
        .from('travel_records')
        .insert(toTravelRecord(travel, session.user.id))
        .select()
        .single()

      if (insertError) {
        await removePhotoFiles(uploadedPaths)
        throw new Error(getErrorMessage(insertError, '旅行记录保存失败。'))
      }

      const savedTravel = toTravel(data)
      setTravels((currentTravels) => [savedTravel, ...currentTravels])
      return savedTravel
    },
    [ensureClient, prepareTravelForSave, removePhotoFiles, session],
  )

  const updateTravel = useCallback(
    async (travelId, travelDraft) => {
      ensureClient()

      if (!session?.user) {
        throw new Error('请先登录后再保存旅行记录。')
      }

      const existingTravel = travels.find((travel) => travel.id === travelId)
      const { travel, uploadedPaths } = await prepareTravelForSave(travelDraft, session.user.id)

      const { data, error: updateError } = await supabase
        .from('travel_records')
        .update(toTravelRecord(travel, session.user.id))
        .eq('id', travelId)
        .eq('user_id', session.user.id)
        .select()
        .single()

      if (updateError) {
        await removePhotoFiles(uploadedPaths)
        throw new Error(getErrorMessage(updateError, '旅行记录修改失败。'))
      }

      const updatedTravel = toTravel(data)
      const nextPaths = new Set(getStoredPhotoPaths(updatedTravel.photos))
      const removedPaths = getStoredPhotoPaths(existingTravel?.photos).filter((path) => !nextPaths.has(path))
      void removePhotoFiles(removedPaths)
      setTravels((currentTravels) =>
        currentTravels.map((travel) => (travel.id === travelId ? updatedTravel : travel)),
      )
      return updatedTravel
    },
    [ensureClient, prepareTravelForSave, removePhotoFiles, session, travels],
  )

  const deleteTravel = useCallback(
    async (travelId) => {
      ensureClient()

      if (!session?.user) {
        throw new Error('请先登录后再删除旅行记录。')
      }

      const deletedTravel = travels.find((travel) => travel.id === travelId)

      const { error: deleteError } = await supabase
        .from('travel_records')
        .delete()
        .eq('id', travelId)
        .eq('user_id', session.user.id)

      if (deleteError) {
        throw new Error(getErrorMessage(deleteError, '旅行记录删除失败。'))
      }

      void removePhotoFiles(getStoredPhotoPaths(deletedTravel?.photos))
      setTravels((currentTravels) => currentTravels.filter((travel) => travel.id !== travelId))
    },
    [ensureClient, removePhotoFiles, session, travels],
  )

  const migrateLegacyTravels = useCallback(async () => {
    ensureClient()

    if (!session?.user) {
      throw new Error('请先登录后再迁移本机数据。')
    }

    const legacyTravels = readLegacyTravelRecords()

    if (legacyTravels.length === 0) {
      return { migratedCount: 0, skippedCount: 0, travels }
    }

    let migratedCount = 0
    let skippedCount = 0

    for (let index = 0; index < legacyTravels.length; index += 1) {
      const legacyTravel = legacyTravels[index]
      const legacySourceId = String(legacyTravel.id ?? `legacy-${index}`)
      const record = toTravelRecord(legacyTravel, session.user.id, legacySourceId)

      if (isUuid(legacyTravel.id)) {
        record.id = legacyTravel.id
      }

      const { error: migrationError } = await supabase.from('travel_records').insert(record)

      if (migrationError?.code === '23505') {
        skippedCount += 1
        continue
      }

      if (migrationError) {
        throw new Error(getErrorMessage(migrationError, '迁移中断，请检查数据库建表脚本后重试。'))
      }

      migratedCount += 1
    }

    const nextTravels = await loadTravelsForUser(session.user)
    setLegacyTravelCount(0)
    return { migratedCount, skippedCount, travels: nextTravels }
  }, [ensureClient, loadTravelsForUser, session, travels])

  return {
    addTravel,
    deleteTravel,
    error,
    fetchTravels,
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
  }
}
