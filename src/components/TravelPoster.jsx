import { forwardRef, useEffect, useMemo, useRef } from 'react'
import { normalizeProvinceName } from '../utils/geoNames'
import { useSignedPhotos } from '../hooks/useSignedPhotos'

const photoPositions = [
  'left-[-54px] top-[74px] -rotate-[8deg]',
  'right-[-42px] top-[290px] rotate-[7deg]',
  'bottom-[118px] left-[28px] rotate-[-5deg]',
]

function visitCoordinates(coordinates, callback) {
  if (!Array.isArray(coordinates)) {
    return
  }

  if (typeof coordinates[0] === 'number') {
    callback(coordinates)
    return
  }

  coordinates.forEach((coordinate) => visitCoordinates(coordinate, callback))
}

function getGeoBounds(features) {
  const bounds = [Infinity, Infinity, -Infinity, -Infinity]

  features.forEach((feature) => {
    visitCoordinates(feature.geometry.coordinates, ([longitude, latitude]) => {
      bounds[0] = Math.min(bounds[0], longitude)
      bounds[1] = Math.min(bounds[1], latitude)
      bounds[2] = Math.max(bounds[2], longitude)
      bounds[3] = Math.max(bounds[3], latitude)
    })
  })

  return bounds
}

function drawRing(context, ring, project) {
  ring.forEach((coordinate, index) => {
    const [x, y] = project(coordinate)

    if (index === 0) {
      context.moveTo(x, y)
    } else {
      context.lineTo(x, y)
    }
  })
}

function drawFeature(context, feature, project, fillStyle, strokeStyle) {
  const { coordinates, type } = feature.geometry
  const polygons = type === 'Polygon' ? [coordinates] : coordinates

  context.beginPath()
  polygons.forEach((polygon) => polygon.forEach((ring) => drawRing(context, ring, project)))
  context.fillStyle = fillStyle
  context.strokeStyle = strokeStyle
  context.lineWidth = 2
  context.fill('evenodd')
  context.stroke()
}

function PosterMap({ onReady, travels }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function renderPosterMap() {
      try {
        const response = await fetch('/maps/china-provinces.geojson')

        if (!response.ok) {
          throw new Error('Poster map data request failed')
        }

        const geoJson = await response.json()

        if (cancelled || !canvasRef.current) {
          return
        }

        const visitedProvinces = new Set(
          travels.map((travel) => normalizeProvinceName(travel.provinceName)),
        )
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        const [minimumLongitude, minimumLatitude, maximumLongitude, maximumLatitude] = getGeoBounds(geoJson.features)
        const mapWidth = canvas.width
        const mapHeight = canvas.height
        const padding = 38
        const longitudeRange = maximumLongitude - minimumLongitude
        const latitudeRange = maximumLatitude - minimumLatitude
        const scale = Math.min(
          (mapWidth - padding * 2) / longitudeRange,
          (mapHeight - padding * 2) / latitudeRange,
        )
        const renderedWidth = longitudeRange * scale
        const renderedHeight = latitudeRange * scale
        const offsetX = (mapWidth - renderedWidth) / 2 - minimumLongitude * scale
        const offsetY = (mapHeight - renderedHeight) / 2 + maximumLatitude * scale
        const project = ([longitude, latitude]) => [offsetX + longitude * scale, offsetY - latitude * scale]

        context.clearRect(0, 0, mapWidth, mapHeight)
        geoJson.features.forEach((feature) => {
          const isVisited = visitedProvinces.has(feature.properties.name)
          drawFeature(
            context,
            feature,
            project,
            isVisited ? '#7DBB6C' : '#E7E9DF',
            isVisited ? '#C99B35' : '#FFFFFF',
          )
        })

        onReady(true)
      } catch {
        onReady(false)
      }
    }

    renderPosterMap()

    return () => {
      cancelled = true
    }
  }, [onReady, travels])

  return (
    <canvas
      aria-label="旅行足迹中国地图"
      className="h-full w-full"
      height="960"
      ref={canvasRef}
      role="img"
      width="1240"
    />
  )
}

function PosterPolaroid({ photo, position, index }) {
  return (
    <figure className={`poster-polaroid absolute ${position}`}>
      <div className="relative h-[188px] overflow-hidden bg-grass/15">
        <div className="poster-photo-fallback absolute inset-0 grid place-items-center font-heading text-xl text-ink/55">
          旅行留白
        </div>
        {photo?.url && (
          <img
            alt={photo.note || `旅行照片 ${index + 1}`}
            className="relative z-10 h-full w-full object-cover"
            crossOrigin="anonymous"
            onError={(event) => {
              event.currentTarget.classList.add('invisible')
            }}
            src={photo.url}
          />
        )}
      </div>
      <figcaption className="mt-3 truncate font-heading text-xl leading-none text-ink/80">
        {photo?.note || '写给远方'}
      </figcaption>
    </figure>
  )
}

const TravelPoster = forwardRef(function TravelPoster({ onMapReady, summary, travels }, ref) {
  const cityCount = new Set(travels.map((travel) => travel.cityName).filter(Boolean)).size
  const recentPhotos = useMemo(
    () =>
      [...travels]
        .sort((left, right) => new Date(right.visitDate || 0) - new Date(left.visitDate || 0))
        .flatMap((travel) => travel.photos ?? [])
        .filter((photo) => photo.path || photo.url)
        .slice(0, 3),
    [travels],
  )
  const signedRecentPhotos = useSignedPhotos(recentPhotos)
  const photos = signedRecentPhotos.length > 0 ? signedRecentPhotos : [null, null]

  return (
    <article aria-hidden="true" className="travel-poster" ref={ref}>
      <header className="relative z-10 px-20 pt-20 text-center">
        <p className="text-[22px] font-medium text-ink/60">足迹 · 旅行藏品柜</p>
        <h2 className="mt-5 font-heading text-[76px] leading-none text-ink">我的旅行手账</h2>
        <p className="mt-6 text-[22px] tracking-[0.18em] text-ink/55">TRAVEL NOTES · {cityCount} CITY MEMORIES</p>
      </header>

      <section className="relative mx-auto mt-9 h-[710px] w-[880px]" aria-label="旅行足迹地图与照片">
        <div className="poster-map-frame absolute inset-x-[72px] top-[55px] h-[570px]">
          <PosterMap onReady={onMapReady} travels={travels} />
        </div>
        {photos.map((photo, index) => (
          <PosterPolaroid
            index={index}
            key={photo?.id ?? `placeholder-${index}`}
            photo={photo}
            position={photoPositions[index]}
          />
        ))}
      </section>

      <section className="mx-16 grid grid-cols-3 overflow-hidden border border-grass/25 bg-white/65">
        <div className="poster-stat-card bg-grass/18">
          <span>累计花费</span>
          <strong>￥{Math.round(summary.totalCost).toLocaleString('zh-CN')}</strong>
        </div>
        <div className="poster-stat-card bg-lake/17">
          <span>已点亮城市</span>
          <strong>{cityCount} 座</strong>
        </div>
        <div className="poster-stat-card bg-[#F1DDA8]/45">
          <span>旅行人格</span>
          <strong>{summary.persona}</strong>
        </div>
      </section>

      <footer className="absolute inset-x-16 bottom-14 flex items-center justify-between border-t border-grass/25 pt-8">
        <div>
          <p className="font-heading text-[30px] text-ink">用脚步丈量世界。</p>
          <p className="mt-3 text-[20px] text-ink/65">扫码开启你的足迹地图。</p>
        </div>
        <div aria-label="二维码占位图" className="poster-qr" />
      </footer>
    </article>
  )
})

export default TravelPoster
