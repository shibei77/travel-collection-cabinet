const geoCityAliases = {
  大理市: '大理白族自治州',
}

export function getGeoCityName(cityName) {
  return geoCityAliases[cityName] ?? cityName
}

export function normalizeProvinceName(provinceName = '') {
  return provinceName
    .replace('特别行政区', '')
    .replace('维吾尔自治区', '')
    .replace('壮族自治区', '')
    .replace('回族自治区', '')
    .replace('自治区', '')
    .replace(/省|市/g, '')
}

export function getTravelForGeoCity(travels, geoCityName) {
  return travels.find(
    (travel) =>
      travel.cityName === geoCityName || getGeoCityName(travel.cityName) === geoCityName,
  )
}
