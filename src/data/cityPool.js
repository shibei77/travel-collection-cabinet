export const cityPool = [
  { cityName: '泉州市', provinceName: '福建省', tags: ['海滨', '历史', '美食'] },
  { cityName: '汕头市', provinceName: '广东省', tags: ['海滨', '美食', '慢节奏'] },
  { cityName: '北海市', provinceName: '广西壮族自治区', tags: ['海滨', '慢节奏', '自然'] },
  { cityName: '扬州市', provinceName: '江苏省', tags: ['美食', '慢节奏', '人文'] },
  { cityName: '苏州市', provinceName: '江苏省', tags: ['园林', '人文', '慢节奏'] },
  { cityName: '景德镇市', provinceName: '江西省', tags: ['人文', '手作', '慢节奏'] },
  { cityName: '洛阳市', provinceName: '河南省', tags: ['历史', '人文', '美食'] },
  { cityName: '青岛市', provinceName: '山东省', tags: ['海滨', '城市漫游', '美食'] },
  { cityName: '威海市', provinceName: '山东省', tags: ['海滨', '慢节奏', '自然'] },
  { cityName: '黄山市', provinceName: '安徽省', tags: ['自然', '徒步', '人文'] },
  { cityName: '张家界市', provinceName: '湖南省', tags: ['自然', '徒步', '慢节奏'] },
  { cityName: '桂林市', provinceName: '广西壮族自治区', tags: ['自然', '慢节奏', '美食'] },
  { cityName: '喀什市', provinceName: '新疆维吾尔自治区', tags: ['人文', '美食', '城市漫游'] },
  { cityName: '敦煌市', provinceName: '甘肃省', tags: ['历史', '人文', '自然'] },
  { cityName: '大同市', provinceName: '山西省', tags: ['历史', '人文', '美食'] },
  { cityName: '舟山市', provinceName: '浙江省', tags: ['海滨', '海岛', '慢节奏'] },
  { cityName: '丽江市', provinceName: '云南省', tags: ['人文', '慢节奏', '自然'] },
  { cityName: '延吉市', provinceName: '吉林省', tags: ['美食', '慢节奏', '城市漫游'] },
  { cityName: '阿勒泰市', provinceName: '新疆维吾尔自治区', tags: ['自然', '冰雪', '徒步'] },
  { cityName: '嘉兴市', provinceName: '浙江省', tags: ['人文', '美食', '慢节奏'] },
]

const fallbackTagsByCity = {
  成都市: ['美食', '慢节奏', '人文'],
  杭州市: ['慢节奏', '湖景', '人文'],
  厦门市: ['海滨', '慢节奏', '美食'],
  大理市: ['自然', '慢节奏', '人文'],
  西安市: ['历史', '美食', '人文'],
  哈尔滨市: ['冰雪', '城市漫游', '美食'],
}

const knownCoastalCities = new Set([
  '北海市',
  '大连市',
  '宁波市',
  '泉州市',
  '厦门市',
  '三亚市',
  '上海市',
  '深圳市',
  '汕头市',
  '威海市',
  '温州市',
  '烟台市',
  '舟山市',
  '珠海市',
  '青岛市',
])

export function getTravelTags(travel) {
  if (Array.isArray(travel.tags) && travel.tags.length > 0) {
    return travel.tags
  }

  const pooledCity = cityPool.find((city) => city.cityName === travel.cityName)

  if (pooledCity) {
    return pooledCity.tags
  }

  if (fallbackTagsByCity[travel.cityName]) {
    return fallbackTagsByCity[travel.cityName]
  }

  return knownCoastalCities.has(travel.cityName) ? ['海滨'] : []
}

export function getPreferredTag(travels) {
  const counts = new Map()

  travels.forEach((travel) => {
    const tags = getTravelTags(travel)

    tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1))
  })

  return [...counts.entries()].sort(([, left], [, right]) => right - left)[0]?.[0] ?? '慢节奏'
}

export function recommendCity(travels, random = Math.random) {
  const preferredTag = getPreferredTag(travels)
  const visitedCities = new Set(travels.map((travel) => travel.cityName))
  const unseenCities = cityPool.filter((city) => !visitedCities.has(city.cityName))
  const preferredCities = unseenCities.filter((city) => city.tags.includes(preferredTag))
  const candidates = preferredCities.length > 0 ? preferredCities : unseenCities.length > 0 ? unseenCities : cityPool
  const city = candidates[Math.floor(random() * candidates.length)]
  const predictedCost = Math.round((1100 + random() * 2800) / 100) * 100

  return { city, predictedCost, preferredTag }
}
