function getTravelPersona(dailyCost, averageDays) {
  if (dailyCost < 500 && averageDays <= 2) {
    return '特种兵旅行者'
  }

  if (dailyCost > 1500 && averageDays >= 4) {
    return '沉浸式度假家'
  }

  return '随性探索者'
}

export function getTravelSummary(travels) {
  const totalCost = travels.reduce((sum, travel) => sum + (Number(travel.cost) || 0), 0)
  const totalDays = travels.reduce((sum, travel) => sum + (Number(travel.days) || 0), 0)
  const averageDays = travels.length > 0 ? totalDays / travels.length : 0
  const dailyCost = totalDays > 0 ? totalCost / totalDays : 0
  const monthlyCost = new Map()
  const moods = new Map()

  travels.forEach((travel) => {
    const month = travel.visitDate?.slice(0, 7) ?? '未标注'
    monthlyCost.set(month, (monthlyCost.get(month) ?? 0) + (Number(travel.cost) || 0))

    if (travel.mood) {
      moods.set(travel.mood, (moods.get(travel.mood) ?? 0) + 1)
    }
  })

  const moodData = [...moods.entries()]
    .sort(([, left], [, right]) => right - left)
    .map(([name, value]) => ({ name, value }))

  return {
    averageDays,
    dailyCost,
    lineData: [...monthlyCost.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, cost]) => ({ cost, month: month === '未标注' ? month : month.slice(5) + '月' })),
    persona: getTravelPersona(dailyCost, averageDays),
    pieData: travels.map((travel) => ({ name: travel.cityName, value: Number(travel.cost) || 0 })),
    moodData,
    topMood: moodData[0]?.name ?? null,
    totalCost,
    totalDays,
  }
}
