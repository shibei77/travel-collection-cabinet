import { getTravelTags } from './cityPool'

function normalizeProvince(provinceName = '') {
  return provinceName
    .replace('特别行政区', '')
    .replace('维吾尔自治区', '')
    .replace('壮族自治区', '')
    .replace('回族自治区', '')
    .replace('自治区', '')
    .replace(/省|市/g, '')
}

function isNightTime(timestamp) {
  if (!timestamp) {
    return false
  }

  const date = new Date(timestamp)
  return !Number.isNaN(date.valueOf()) && date.getHours() >= 0 && date.getHours() < 4
}

export function getAchievementStats(travels) {
  const cityCounts = new Map()
  const uniqueCities = new Set()
  const provinces = new Set()
  const southwestProvinces = new Set()
  const transportCounts = { flight: 0, rail: 0 }
  const coastalCityNames = new Set()
  let photoCount = 0
  let storyCharacters = 0
  let totalCost = 0
  let hasNorthernSnow = false
  let hasShortExpensiveTrip = false
  let hasNightSave = false

  travels.forEach((travel) => {
    const cityName = travel.cityName || ''
    const province = normalizeProvince(travel.provinceName)
    const photos = Array.isArray(travel.photos) ? travel.photos : []
    const transport = travel.transport || ''

    if (cityName) {
      uniqueCities.add(cityName)
      cityCounts.set(cityName, (cityCounts.get(cityName) ?? 0) + 1)
    }

    if (province) {
      provinces.add(province)
    }

    if (['四川', '重庆', '云南', '贵州'].includes(province)) {
      southwestProvinces.add(province)
    }

    if (['黑龙江', '吉林', '辽宁'].includes(province)) {
      hasNorthernSnow = true
    }

    if (cityName && getTravelTags(travel).includes('海滨')) {
      coastalCityNames.add(cityName)
    }

    if (/高铁|火车/.test(transport)) {
      transportCounts.rail += 1
    }

    if (transport.includes('飞机')) {
      transportCounts.flight += 1
    }

    const cost = Number(travel.cost) || 0
    totalCost += cost
    hasShortExpensiveTrip ||= (Number(travel.days) || 0) <= 2 && cost > 2000
    photoCount += photos.length
    const uniqueStories = new Set(
      [travel.story, ...photos.map((photo) => photo.story)]
        .map((story) => story?.trim())
        .filter(Boolean),
    )
    storyCharacters += [...uniqueStories].reduce((sum, story) => sum + story.length, 0)
    hasNightSave ||= isNightTime(travel.createdAt) || isNightTime(travel.updatedAt)
  })

  return {
    cityCounts,
    coastalCities: coastalCityNames.size,
    hasNorthernSnow,
    hasNightSave,
    hasShortExpensiveTrip,
    provinces,
    recordCount: travels.length,
    storyCharacters,
    southwestProvinces,
    totalCost,
    transportCounts,
    uniqueCities,
    uniqueCityCount: uniqueCities.size,
    photoCount,
  }
}

export const achievements = [
  {
    category: '版图开拓',
    check: (stats) => stats.uniqueCityCount >= 1,
    desc: '点亮第 1 座城市',
    icon: '✦',
    id: 'first-city',
    name: '初出茅庐',
  },
  {
    category: '版图开拓',
    check: (stats) => [...stats.provinces].some((province) => ['上海', '江苏', '浙江'].includes(province)),
    desc: '点亮上海、江苏、浙江任一城市',
    icon: '◎',
    id: 'jiangzhehu',
    name: '江浙沪包邮区',
  },
  {
    category: '版图开拓',
    check: (stats) => stats.southwestProvinces.size >= 2,
    desc: '点亮四川、重庆、云南、贵州中的任意 2 个',
    icon: '⛰',
    id: 'southwest',
    name: '西南特种兵',
  },
  {
    category: '版图开拓',
    check: (stats) => stats.coastalCities > 3,
    desc: '点亮超过 3 座带有“海滨”标签的城市',
    icon: '≈',
    id: 'coastline',
    name: '海岸线征服者',
  },
  {
    category: '版图开拓',
    check: (stats) => stats.hasNorthernSnow,
    desc: '点亮黑龙江、吉林、辽宁任意一地',
    icon: '❄',
    id: 'northern-snow',
    name: '北方雪国',
  },
  {
    category: '版图开拓',
    check: (stats) => stats.provinces.size > 10,
    desc: '点亮超过 10 个省份',
    icon: '★',
    id: 'province-grand-slam',
    name: '大满贯旅行家',
  },
  {
    category: '消费与出行',
    check: (stats) => stats.totalCost >= 10000,
    desc: '累计花费达到 ￥10,000',
    icon: '¥',
    id: 'big-spender',
    name: '千金散尽',
  },
  {
    category: '消费与出行',
    check: (stats) => stats.recordCount > 0 && stats.transportCounts.rail / stats.recordCount > 0.7,
    desc: '高铁或火车出行占比超过 70%',
    icon: '↟',
    id: 'rail-hero',
    name: '高铁侠',
  },
  {
    category: '消费与出行',
    check: (stats) => stats.recordCount > 0 && stats.transportCounts.flight / stats.recordCount > 0.7,
    desc: '飞机出行占比超过 70%',
    icon: '⌁',
    id: 'frequent-flyer',
    name: '空中飞人',
  },
  {
    category: '消费与出行',
    check: (stats) => stats.hasShortExpensiveTrip,
    desc: '单次旅行不超过 2 天且花费超过 ￥2,000',
    icon: '↯',
    id: 'one-day-thousand-miles',
    name: '一日千里',
  },
  {
    category: '故事与记忆',
    check: (stats) => stats.photoCount >= 20,
    desc: '累计上传至少 20 张照片',
    icon: '▣',
    id: 'time-keeper',
    name: '时光记录者',
  },
  {
    category: '故事与记忆',
    check: (stats) => stats.storyCharacters >= 500,
    desc: '累计故事文字达到 500 字',
    icon: '✎',
    id: 'storyteller',
    name: '旅途说书人',
  },
  {
    category: '故事与记忆',
    check: (stats) => [...stats.cityCounts.values()].some((count) => count >= 2),
    desc: '同一座城市录入至少 2 次',
    icon: '↻',
    id: 'return-visit',
    name: '故地重游',
  },
  {
    category: '隐藏彩蛋',
    check: (stats) => stats.hasNightSave,
    desc: '在 0:00 至 4:00 保存过旅行记录',
    icon: '☾',
    id: 'night-owl',
    name: '夜猫子',
  },
]
