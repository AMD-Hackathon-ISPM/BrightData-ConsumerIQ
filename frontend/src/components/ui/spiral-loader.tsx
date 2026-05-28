import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

type SpiralLoaderProps = {
  totalDots?: number
  dotRadius?: number
  duration?: number
  margin?: number
  minOpacity?: number
  maxOpacity?: number
  minScale?: number
  maxScale?: number
  innerColor?: string
  outerColor?: string
  className?: string
}

const SVG_SIZE = 400
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '')
  const n = parseInt(
    v.length === 3
      ? v
          .split('')
          .map((c) => c + c)
          .join('')
      : v,
    16,
  )
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number) {
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `rgb(${r},${g},${bl})`
}

export function SpiralLoader({
  totalDots = 600,
  dotRadius = 2,
  duration = 3,
  margin = 2,
  minOpacity = 0.3,
  maxOpacity = 1,
  minScale = 0.5,
  maxScale = 1.5,
  innerColor = '#cc241d',
  outerColor = '#fafafa',
  className,
}: SpiralLoaderProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const center = SVG_SIZE / 2
    const maxRadius = center - margin - dotRadius
    const svgNs = 'http://www.w3.org/2000/svg'
    const inner = hexToRgb(innerColor)
    const outer = hexToRgb(outerColor)

    svg.replaceChildren()

    for (let i = 0; i < totalDots; i++) {
      const idx = i + 0.5
      const frac = idx / totalDots
      const r = Math.sqrt(frac) * maxRadius
      const theta = idx * GOLDEN_ANGLE
      const x = center + r * Math.cos(theta)
      const y = center + r * Math.sin(theta)

      const circle = document.createElementNS(svgNs, 'circle')
      circle.setAttribute('cx', x.toString())
      circle.setAttribute('cy', y.toString())
      circle.setAttribute('r', dotRadius.toString())
      circle.setAttribute('fill', lerpColor(inner, outer, frac))
      circle.setAttribute('opacity', '0')

      const animR = document.createElementNS(svgNs, 'animate')
      animR.setAttribute('attributeName', 'r')
      animR.setAttribute(
        'values',
        `${dotRadius * minScale};${dotRadius * maxScale};${dotRadius * minScale}`,
      )
      animR.setAttribute('dur', `${duration}s`)
      animR.setAttribute('begin', `${frac * duration}s`)
      animR.setAttribute('repeatCount', 'indefinite')
      animR.setAttribute('calcMode', 'spline')
      animR.setAttribute('keySplines', '0.4 0 0.6 1;0.4 0 0.6 1')
      circle.appendChild(animR)

      const animO = document.createElementNS(svgNs, 'animate')
      animO.setAttribute('attributeName', 'opacity')
      animO.setAttribute(
        'values',
        `${minOpacity};${maxOpacity};${minOpacity}`,
      )
      animO.setAttribute('dur', `${duration}s`)
      animO.setAttribute('begin', `${frac * duration}s`)
      animO.setAttribute('repeatCount', 'indefinite')
      animO.setAttribute('calcMode', 'spline')
      animO.setAttribute('keySplines', '0.4 0 0.6 1;0.4 0 0.6 1')
      circle.appendChild(animO)

      svg.appendChild(circle)
    }
  }, [
    totalDots,
    dotRadius,
    duration,
    margin,
    minOpacity,
    maxOpacity,
    minScale,
    maxScale,
    innerColor,
    outerColor,
  ])

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      role="status"
      aria-label="Loading"
      className={cn('size-24 text-foreground-default', className)}
    />
  )
}
