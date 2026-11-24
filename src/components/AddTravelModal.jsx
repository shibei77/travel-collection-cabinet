import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getTravelTags } from '../data/cityPool'
import { travelMoods } from '../data/travelMoods'

function makePhotoField(index) {
  return {
    file: null,
    id: `photo-${Date.now()}-${index}`,
    note: '',
    path: '',
    story: '',
    url: '',
  }
}

function getInitialPhotos(initialTravel) {
  if (!initialTravel?.photos?.length) {
    return [makePhotoField(0)]
  }

  return initialTravel.photos.map((photo, index) => ({
    file: null,
    id: photo.id ?? `photo-${Date.now()}-${index}`,
    note: photo.note ?? '',
    path: photo.path ?? '',
    story: photo.story ?? '',
    url: photo.url ?? '',
  }))
}

function AddTravelModal({ city, initialTravel, isSaving = false, onClose, onSave }) {
  const isEditing = Boolean(initialTravel)
  const [visitDate, setVisitDate] = useState(initialTravel?.visitDate ?? '')
  const [days, setDays] = useState(initialTravel?.days ?? 3)
  const [cost, setCost] = useState(initialTravel?.cost ?? '')
  const [transport, setTransport] = useState(initialTravel?.transport ?? '高铁')
  const [companions, setCompanions] = useState(initialTravel?.companions ?? '独自一人')
  const [mood, setMood] = useState(initialTravel?.mood ?? '')
  const [feeling, setFeeling] = useState(initialTravel?.story ?? initialTravel?.photos?.[0]?.story ?? '')
  const [photos, setPhotos] = useState(() => getInitialPhotos(initialTravel))

  const fallbackNote = useMemo(() => `${city.cityName}的旅行碎片`, [city.cityName])

  const updatePhoto = (photoId, field, value) => {
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId ? { ...photo, [field]: value } : photo,
      ),
    )
  }

  const choosePhotoFile = (photoId, file) => {
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId
          ? { ...photo, file: file ?? null, path: '', url: '' }
          : photo,
      ),
    )
  }

  const setExternalPhotoUrl = (photoId, url) => {
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId
          ? { ...photo, file: null, path: '', url }
          : photo,
      ),
    )
  }

  const submitTravel = async (event) => {
    event.preventDefault()

    const travelPhotos = photos
      .filter((photo) => photo.file || photo.path || photo.url.trim())
      .map((photo, index) => ({
        file: photo.file,
        id: photo.id || `${city.cityName}-${Date.now()}-${index}`,
        note: photo.note.trim() || fallbackNote,
        path: photo.path,
        story: photo.story.trim() || feeling.trim() || '这一段旅途，值得被好好收藏。',
        url: photo.url.trim(),
      }))

    await onSave({
      cityName: city.cityName,
      companions: companions.trim(),
      coordinates: city.coordinates,
      cost: Number(cost) || 0,
      days: Math.max(1, Number(days) || 1),
      mood,
      photos: travelPhotos,
      provinceName: city.provinceName,
      story: feeling.trim(),
      tags: initialTravel?.tags ?? getTravelTags(city),
      transport,
      visitDate,
    })
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-end bg-ink/25 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.form
          aria-label={`${isEditing ? '编辑' : '录入'}${city.cityName}旅行碎片`}
          className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-paper px-5 pb-10 pt-6 shadow-[0_-14px_45px_rgba(44,62,46,0.18)] sm:mx-auto sm:max-w-2xl sm:rounded-lg sm:pb-8"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          onClick={(event) => event.stopPropagation()}
          onSubmit={submitTravel}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        >
          <div className="mx-auto mb-6 h-1.5 w-11 rounded-full bg-grass/45 sm:hidden" />
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm text-ink/55">{city.provinceName}</p>
              <h2 className="mt-1 font-heading text-3xl leading-none text-ink">
                {isEditing ? '编辑旅行碎片' : '录入旅行碎片'}
              </h2>
            </div>
            <button
              aria-label="关闭录入表单"
              className="grid h-9 w-9 place-items-center border border-grass/30 bg-white text-xl leading-none text-ink transition-colors hover:bg-grass/10"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-ink/75">
              城市名称
              <input
                className="h-11 rounded-lg border border-grass/25 bg-ink/[0.035] px-3 text-ink outline-none"
                readOnly
                value={city.cityName}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-ink/75">
              旅行时间
              <input
                className="h-11 rounded-lg border border-grass/25 bg-white px-3 text-ink outline-none focus:border-grass"
                onChange={(event) => setVisitDate(event.target.value)}
                required
                type="date"
                value={visitDate}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-ink/75">
              旅行天数
              <input
                className="h-11 rounded-lg border border-grass/25 bg-white px-3 text-ink outline-none focus:border-grass"
                min="1"
                onChange={(event) => setDays(event.target.value)}
                required
                type="number"
                value={days}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-ink/75">
              花费
              <input
                className="h-11 rounded-lg border border-grass/25 bg-white px-3 text-ink outline-none focus:border-grass"
                min="0"
                onChange={(event) => setCost(event.target.value)}
                required
                type="number"
                value={cost}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-ink/75">
              出行方式
              <select
                className="h-11 rounded-lg border border-grass/25 bg-white px-3 text-ink outline-none focus:border-grass"
                onChange={(event) => setTransport(event.target.value)}
                value={transport}
              >
                <option value="高铁">高铁</option>
                <option value="火车">火车</option>
                <option value="飞机">飞机</option>
                <option value="自驾">自驾</option>
                <option value="其他">其他</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-ink/75">
              同行者
              <input
                className="h-11 rounded-lg border border-grass/25 bg-white px-3 text-ink outline-none focus:border-grass"
                onChange={(event) => setCompanions(event.target.value)}
                placeholder="例如：独自一人、和朋友、和恋人"
                value={companions}
              />
            </label>
          </div>

          <fieldset className="mt-6 border-t border-grass/20 pt-5">
            <legend className="font-heading text-xl text-ink">旅行心情</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {travelMoods.map((option) => {
                const isSelected = mood === option.value

                return (
                  <button
                    aria-pressed={isSelected}
                    className={`rounded-full border px-3 py-2 text-sm transition-all ${
                      isSelected
                        ? 'border-grass bg-grass text-white shadow-[0_5px_12px_rgba(73,132,61,0.2)]'
                        : 'border-grass/30 bg-white text-ink/75 hover:border-grass hover:bg-grass/10'
                    }`}
                    key={option.value}
                    onClick={() => setMood(option.value)}
                    type="button"
                  >
                    {option.value}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <label className="mt-6 grid gap-2 text-sm font-medium text-ink/75">
            文字感想
            <textarea
              className="min-h-24 resize-y rounded-lg border border-grass/25 bg-white px-3 py-2 text-ink outline-none focus:border-grass"
              onChange={(event) => setFeeling(event.target.value)}
              placeholder="写下这一段旅途的感受（可选）"
              value={feeling}
            />
          </label>

          <section className="mt-7 border-t border-grass/20 pt-5" aria-labelledby="photo-story-title">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 id="photo-story-title" className="font-heading text-xl text-ink">照片与故事</h3>
                <p className="mt-1 text-xs text-ink/50">第一张有效照片会自动成为足迹档案封面。</p>
              </div>
              <button
                className="border-b border-lake pb-1 text-sm font-medium text-ink"
                onClick={() => setPhotos((currentPhotos) => [...currentPhotos, makePhotoField(currentPhotos.length)])}
                type="button"
              >
                添加照片
              </button>
            </div>

            <div className="mt-4 grid gap-5">
              {photos.map((photo, index) => (
                <div className="grid gap-3 border-l-2 border-lake/55 pl-4" key={photo.id}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink/65">第 {index + 1} 张</p>
                    {photos.length > 1 && (
                      <button
                        className="text-sm text-ink/55 hover:text-ink"
                        onClick={() =>
                          setPhotos((currentPhotos) =>
                            currentPhotos.filter((currentPhoto) => currentPhoto.id !== photo.id),
                          )
                        }
                        type="button"
                      >
                        移除
                      </button>
                    )}
                  </div>
                  <label className="grid gap-2 text-sm text-ink/70">
                    从设备选择图片
                    <input
                      accept="image/*"
                      className="block w-full cursor-pointer rounded-lg border border-dashed border-grass/40 bg-grass/[0.035] px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-grass/15 file:px-3 file:py-1.5 file:text-sm file:text-ink"
                      onChange={(event) => choosePhotoFile(photo.id, event.target.files?.[0])}
                      type="file"
                    />
                    <span className="text-xs text-ink/50">
                      {photo.file
                        ? `待上传：${photo.file.name}`
                        : photo.path
                          ? '已保存至私有相册'
                          : '支持 JPG、PNG、WebP 等图片，单张不超过 10MB。'}
                    </span>
                  </label>
                  <label className="grid gap-2 text-sm text-ink/70">
                    或使用外部图片链接（兼容旧记录）
                    <input
                      className="h-11 rounded-lg border border-grass/25 bg-white px-3 text-sm text-ink outline-none focus:border-grass"
                      onChange={(event) => setExternalPhotoUrl(photo.id, event.target.value)}
                      placeholder="https://..."
                      type="url"
                      value={photo.url}
                    />
                  </label>
                  <input
                    className="h-11 rounded-lg border border-grass/25 bg-white px-3 text-sm text-ink outline-none focus:border-grass"
                    onChange={(event) => updatePhoto(photo.id, 'note', event.target.value)}
                    placeholder="照片备注"
                    value={photo.note}
                  />
                  <textarea
                    className="min-h-20 resize-y rounded-lg border border-grass/25 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-grass"
                    onChange={(event) => updatePhoto(photo.id, 'story', event.target.value)}
                    placeholder="这张照片的故事"
                    value={photo.story}
                  />
                </div>
              ))}
            </div>
          </section>

          <button
            className="mt-8 w-full rounded-lg bg-grass px-4 py-3 font-medium text-white shadow-[0_8px_18px_rgba(73,132,61,0.2)] transition-colors hover:bg-[#6cad5b]"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? '正在保存...' : isEditing ? '保存修改' : '保存点亮'}
          </button>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  )
}

export default AddTravelModal
