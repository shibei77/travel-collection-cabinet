import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const provinceMaps = require('china-geojson')

const municipalities = new Set(['北京', '上海', '天津', '重庆'])
const autonomousRegions = new Map([
  ['广西', '广西壮族自治区'],
  ['内蒙古', '内蒙古自治区'],
  ['宁夏', '宁夏回族自治区'],
  ['新疆', '新疆维吾尔自治区'],
  ['西藏', '西藏自治区'],
])
const specialRegions = new Map([
  ['香港', '香港特别行政区'],
  ['澳门', '澳门特别行政区'],
])

function getProvinceLabel(name) {
  if (municipalities.has(name)) {
    return `${name}市`
  }

  return autonomousRegions.get(name) ?? specialRegions.get(name) ?? `${name}省`
}

const mapsDirectory = 'public/maps'
const provincesDirectory = `${mapsDirectory}/provinces`
const provinceEntries = Object.entries(provinceMaps).filter(([name]) => name !== 'China')
const countryGeoJson = {
  ...provinceMaps.China,
  // Municipalities overlap their surrounding provinces in this source dataset.
  // Render them last so they remain visible and directly selectable nationwide.
  features: [
    ...provinceMaps.China.features.filter(
      (feature) => !municipalities.has(feature.properties.name),
    ),
    ...provinceMaps.China.features.filter((feature) => municipalities.has(feature.properties.name)),
  ],
}

mkdirSync(provincesDirectory, { recursive: true })
writeFileSync(`${mapsDirectory}/china-provinces.geojson`, JSON.stringify(countryGeoJson))

const provinces = provinceEntries.map(([shortName, geoJson]) => {
  const fileName = `${shortName}.geojson`
  writeFileSync(`${provincesDirectory}/${fileName}`, JSON.stringify(geoJson))

  return {
    cityFile: `/maps/provinces/${encodeURIComponent(fileName)}`,
    cityName: municipalities.has(shortName) ? `${shortName}市` : null,
    featureCount: geoJson.features.length,
    isMunicipality: municipalities.has(shortName),
    label: getProvinceLabel(shortName),
    shortName,
  }
})

writeFileSync(`${mapsDirectory}/map-manifest.json`, JSON.stringify({ provinces }))

console.log(`Generated one national map and ${provinces.length} provincial city maps.`)
