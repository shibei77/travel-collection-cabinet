export const travelMoods = [
  { label: '兴高采烈', value: '😄 兴高采烈' },
  { label: '治愈放松', value: '🌿 治愈放松' },
  { label: '热血兴奋', value: '🔥 热血兴奋' },
  { label: '充满期待', value: '✨ 充满期待' },
  { label: '沉思感悟', value: '🤔 沉思感悟' },
  { label: '平静安宁', value: '🌊 平静安宁' },
  { label: '浪漫惬意', value: '🌹 浪漫惬意' },
  { label: '感动落泪', value: '🥹 感动落泪' },
  { label: '略带忧伤', value: '🌧️ 略带忧伤' },
  { label: '特种兵疲惫', value: '🥱 特种兵疲惫' },
]

export function getMoodLabel(mood) {
  return mood || '未记录心情'
}
