import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { EffectScatterChart, MapChart } from 'echarts/charts'
import { GeoComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { AnimatePresence, motion } from 'framer-motion'
import { getTravelForGeoCity, normalizeProvinceName } from '../utils/geoNames'

echarts.use([CanvasRenderer, EffectScatterChart, GeoComponent, MapChart])

const COUNTRY_MAP_NAME = 'footprints-country-map'

function getFeatureName(feature) {
  return feature.properties.name
}

function getFeatureCoordinates(feature) {
  const { cp, latitude, longitude } = feature.properties

  if (Array.isArray(cp)) {
    return cp
  }

  return typeof longitude === 'number' && typeof latitude === 'number'
    ? [longitude, latitude]
    : null
}

function makeMunicipalityGeoJson(countryGeoJson, province) {
  const provinceFeature = countryGeoJson.features.find(
    (feature) => getFeatureName(feature) === province.shortName,
  )

  if (!provinceFeature) {
    return null
  }

  return {
    ...countryGeoJson,
    features: [
      {
        ...provinceFeature,
        properties: {
          ...provinceFeature.properties,
          name: province.cityName,
        },
      },
    ],
  }
}

function TravelMap({
  lastLitCity,
  onUnvisitedCityClick,
  onVisitedCityClick,
  travels,
}) {
  const chartElementRef = useRef(null)
  const chartRef = useRef(null)
  const mapCacheRef = useRef(new Map())
  const renderedTargetRef = useRef(null)
  const resourcesRef = useRef(null)
  const viewRef = useRef({ mode: 'country' })
  const callbackRef = useRef({ onUnvisitedCityClick, onVisitedCityClick })
  const travelsRef = useRef(travels)
  const [resources, setResources] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [chartReady, setChartReady] = useState(false)
  const [dismissedToastCity, setDismissedToastCity] = useState(null)
  const [view, setView] = useState({ mode: 'country' })
  const toastCity = lastLitCity === dismissedToastCity ? null : lastLitCity

  useEffect(() => {
    callbackRef.current = { onUnvisitedCityClick, onVisitedCityClick }
  }, [onUnvisitedCityClick, onVisitedCityClick])

  useEffect(() => {
    resourcesRef.current = resources
  }, [resources])

  useEffect(() => {
    travelsRef.current = travels
  }, [travels])

  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    if (!toastCity) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setDismissedToastCity(toastCity), 2600)

    return () => window.clearTimeout(timeoutId)
  }, [toastCity])

  useEffect(() => {
    const controller = new AbortController()
    let resizeObserver
    let disposed = false

    async function initializeMap() {
      try {
        const [countryResponse, manifestResponse] = await Promise.all([
          fetch('/maps/china-provinces.geojson', { signal: controller.signal }),
          fetch('/maps/map-manifest.json', { signal: controller.signal }),
        ])

        if (!countryResponse.ok || !manifestResponse.ok) {
          throw new Error('Map data request failed')
        }

        const [countryGeoJson, manifest] = await Promise.all([
          countryResponse.json(),
          manifestResponse.json(),
        ])

        if (disposed || !chartElementRef.current) {
          return
        }

        chartRef.current = echarts.init(chartElementRef.current, undefined, { renderer: 'canvas' })
        chartRef.current.on('click', (params) => {
          const target = renderedTargetRef.current

          if (!target) {
            return
          }

          if (params.seriesName === '已点亮城市标记' && params.data?.travel) {
            callbackRef.current.onVisitedCityClick?.(params.data.travel.cityName)
            return
          }

          const isMapRegion =
            params.componentType === 'geo' ||
            (params.componentType === 'series' && params.seriesType === 'map')

          if (!isMapRegion) {
            return
          }

          if (viewRef.current.mode === 'country') {
            const province = resourcesRef.current?.manifest.provinces.find(
              (item) => item.shortName === params.name,
            )

            if (province) {
              setView({ mode: province.isMunicipality ? 'municipality' : 'province', province })
            }
            return
          }

          const cityName = target.mode === 'municipality' ? target.province.cityName : params.name
          const existingTravel = getTravelForGeoCity(travelsRef.current, cityName)

          if (existingTravel) {
            callbackRef.current.onVisitedCityClick?.(existingTravel.cityName)
            return
          }

          const cityFeature = target.geoJson.features.find(
            (feature) => getFeatureName(feature) === params.name,
          )

          callbackRef.current.onUnvisitedCityClick?.(cityName, {
            cityName,
            coordinates: cityFeature ? getFeatureCoordinates(cityFeature) : null,
            provinceName: target.province.label,
          })
        })

        resizeObserver = new ResizeObserver(() => chartRef.current?.resize())
        resizeObserver.observe(chartElementRef.current)
        setResources({ countryGeoJson, manifest })
        setChartReady(true)
        setIsLoading(false)
      } catch (error) {
        if (error.name !== 'AbortError') {
          setLoadError(true)
          setIsLoading(false)
        }
      }
    }

    initializeMap()

    return () => {
      disposed = true
      controller.abort()
      resizeObserver?.disconnect()
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!chartReady || !resources || !chartRef.current) {
      return undefined
    }

    let cancelled = false

    async function resolveTarget() {
      if (view.mode === 'country') {
        return {
          geoJson: resources.countryGeoJson,
          mapName: COUNTRY_MAP_NAME,
          mode: 'country',
        }
      }

      if (view.mode === 'municipality') {
        const geoJson = makeMunicipalityGeoJson(resources.countryGeoJson, view.province)

        if (!geoJson) {
          throw new Error('Municipality geometry is unavailable')
        }

        return {
          geoJson,
          mapName: `footprints-municipality-${view.province.shortName}`,
          mode: 'municipality',
          province: view.province,
        }
      }

      const cachedGeoJson = mapCacheRef.current.get(view.province.shortName)
      const geoJson =
        cachedGeoJson ??
        (await fetch(view.province.cityFile).then((response) => {
          if (!response.ok) {
            throw new Error(`Province map request failed for ${view.province.shortName}`)
          }

          return response.json()
        }))

      mapCacheRef.current.set(view.province.shortName, geoJson)

      return {
        geoJson,
        mapName: `footprints-province-${view.province.shortName}`,
        mode: 'province',
        province: view.province,
      }
    }

    async function renderMap() {
      try {
        const target = await resolveTarget()

        if (cancelled || !chartRef.current) {
          return
        }

        echarts.registerMap(target.mapName, target.geoJson)
        const visitedProvinces = new Set(
          travels.map((travel) => normalizeProvinceName(travel.provinceName)),
        )
        const regionData = target.geoJson.features.map((feature) => {
          const name = getFeatureName(feature)
          const isVisited =
            target.mode === 'country'
              ? visitedProvinces.has(name)
              : Boolean(getTravelForGeoCity(travels, name))

          return {
            itemStyle: {
              areaColor: isVisited ? '#7DBB6C' : '#EBEBE0',
              borderColor: isVisited ? '#C99B35' : '#FFFFFF',
              borderWidth: isVisited ? 1.1 : 0.55,
            },
            name,
          }
        })
        const visitedPins =
          target.mode === 'country'
            ? []
            : target.geoJson.features
                .map((feature) => {
                  const travel = getTravelForGeoCity(travels, getFeatureName(feature))
                  const coordinates = travel?.coordinates ?? getFeatureCoordinates(feature)

                  return travel && Array.isArray(coordinates)
                    ? {
                        name: travel.cityName,
                        travel,
                        value: [...coordinates, travel.cost],
                      }
                    : null
                })
                .filter(Boolean)
        const labelFormatter = (params) => {
          if (target.mode !== 'country') {
            return params.name
          }

          return resources.manifest.provinces.find((province) => province.shortName === params.name)
            ?.label ?? params.name
        }
        const mapSize = target.mode === 'country' ? '102%' : target.mode === 'municipality' ? '76%' : '95%'
        const showRegionLabels = chartRef.current.getWidth() >= 640

        chartRef.current.setOption(
          {
            animation: false,
            geo: {
              itemStyle: {
                areaColor: '#EBEBE0',
                borderColor: '#FFFFFF',
                borderWidth: 0.55,
              },
              label: {
                color: '#2C3E2E',
                fontFamily: 'Noto Sans SC, sans-serif',
                fontSize: target.mode === 'country' ? 10 : 11,
                formatter: labelFormatter,
                show: showRegionLabels,
              },
              layoutCenter: ['50%', '50%'],
              layoutSize: mapSize,
              map: target.mapName,
              regions: regionData,
              roam: false,
              silent: false,
            },
            series: [
              {
                data: regionData,
                emphasis: {
                  itemStyle: {
                    areaColor: '#A0D28C',
                    borderColor: '#C99B35',
                    borderWidth: 1.3,
                  },
                  label: {
                    color: '#2C3E2E',
                    fontWeight: 600,
                    show: true,
                  },
                },
                geoIndex: 0,
                label: {
                  color: '#2C3E2E',
                  fontFamily: 'Noto Sans SC, sans-serif',
                  fontSize: target.mode === 'country' ? 10 : 11,
                  formatter: labelFormatter,
                  show: showRegionLabels,
                },
                name: '行政区块',
                map: target.mapName,
                itemStyle: {
                  areaColor: '#EBEBE0',
                  borderColor: '#FFFFFF',
                  borderWidth: 0.55,
                },
                selectedMode: false,
                type: 'map',
                z: 2,
              },
              ...(visitedPins.length
                ? [
                    {
                      coordinateSystem: 'geo',
                      data: visitedPins,
                      effectType: 'ripple',
                      itemStyle: {
                        borderColor: '#5F9E51',
                        borderWidth: 1,
                        color: '#7DBB6C',
                      },
                      name: '已点亮城市标记',
                      rippleEffect: {
                        brushType: 'stroke',
                        color: 'rgba(125, 187, 108, 0.68)',
                        period: 2.2,
                        scale: 2.3,
                      },
                      showEffectOn: 'emphasis',
                      symbol: 'pin',
                      symbolSize: target.mode === 'municipality' ? 27 : 20,
                      type: 'effectScatter',
                      z: 4,
                    },
                  ]
                : []),
            ],
          },
          { lazyUpdate: false, notMerge: true },
        )

        renderedTargetRef.current = target
      } catch {
        if (!cancelled) {
          setLoadError(true)
        }
      }
    }

    renderMap()

    return () => {
      cancelled = true
    }
  }, [chartReady, resources, travels, view])

  const isDrilledIn = view.mode !== 'country'
  const heading = isDrilledIn ? view.province.label : '全国足迹'

  return (
    <section aria-labelledby="travel-map-title" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex items-end justify-between gap-5">
        <div>
          <h1 id="travel-map-title" className="font-heading text-3xl leading-none text-ink sm:text-4xl">
            旅行地图
          </h1>
          <p className="mt-2 text-sm text-ink/55">{heading}</p>
        </div>
      </div>

      <motion.div
        animate={{ opacity: 1, scale: isDrilledIn ? 1.014 : 1 }}
        className="relative mt-5 h-[470px] overflow-hidden border-y border-grass/20 sm:mt-7 sm:h-[580px]"
        initial={{ opacity: 0, scale: 0.975 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          ref={chartElementRef}
          aria-label="中国旅行地图"
          className="h-full w-full"
          role="img"
        />

        <AnimatePresence>
          {isDrilledIn && (
            <motion.button
              className="absolute left-4 top-4 z-10 border border-grass/35 bg-paper/90 px-3 py-2 text-sm font-medium text-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={() => setView({ mode: 'country' })}
              type="button"
            >
              ← 返回全国
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toastCity && (
            <motion.div
              aria-live="polite"
              className="absolute right-4 top-4 z-10 border border-white/70 bg-grass px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_rgba(73,132,61,0.25)]"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {toastCity} 已点亮
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-paper/75 text-sm text-ink/55">
            正在绘制足迹
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-paper text-sm text-ink/55">
            地图数据暂时无法加载
          </div>
        )}
      </motion.div>
    </section>
  )
}

export default TravelMap
