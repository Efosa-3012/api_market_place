import { useId, useState } from 'react'
import type { Point } from './analytics'
import { compact, integer } from './analytics'
export default function ConsumptionChart({ points }: { points: Point[] }) {
  const [active, setActive] = useState<number | null>(null)
  const id = useId().replaceAll(':', '')
  const width = 680,
    height = 260,
    left = 54,
    right = 12,
    top = 18,
    bottom = 35
  const chartWidth = width - left - right,
    chartHeight = height - top - bottom
  const max =
    Math.max(
      1,
      ...points.flatMap((point) => [point.production, point.sandbox]),
    ) * 1.12
  const x = (index: number) =>
    left + (index * chartWidth) / Math.max(1, points.length - 1)
  const y = (value: number) => top + chartHeight - (value / max) * chartHeight
  const path = (field: 'production' | 'sandbox') =>
    points
      .map(
        (point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point[field])}`,
      )
      .join(' ')
  const current = active !== null ? points[active] : null
  return (
    <div>
      <div className="mb-3 flex justify-end gap-4 text-[11px] text-slate-500">
        <span>
          <span className="mr-1 text-blue-600">●</span>Production
        </span>
        <span>
          <span className="mr-1 text-slate-400">●</span>Sandbox
        </span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          aria-label="API calls over the selected period"
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1111ff" stopOpacity=".13" />
              <stop offset="100%" stopColor="#1111ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <g key={fraction}>
              <line
                x1={left}
                x2={width - right}
                y1={y(max * fraction)}
                y2={y(max * fraction)}
                stroke="#e5eaf2"
                strokeDasharray="3 4"
              />
              <text
                x={left - 9}
                y={y(max * fraction) + 4}
                textAnchor="end"
                fontSize="10"
                fill="#8795ad"
              >
                {compact(max * fraction)}
              </text>
            </g>
          ))}
          <path
            d={`${path('production')} L ${x(points.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`}
            fill={`url(#${id})`}
          />
          <path
            d={path('sandbox')}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <path
            d={path('production')}
            fill="none"
            stroke="#1010ff"
            strokeWidth="2.2"
          />
          {points.map((point, index) => (
            <g key={point.label}>
              {(index === 0 ||
                index === points.length - 1 ||
                index % Math.ceil(points.length / 6) === 0) && (
                <text
                  x={x(index)}
                  y={height - 10}
                  textAnchor={
                    index === 0
                      ? 'start'
                      : index === points.length - 1
                        ? 'end'
                        : 'middle'
                  }
                  fontSize="9"
                  fill="#8795ad"
                >
                  {point.label.includes(':')
                    ? point.label
                    : point.label.slice(5)}
                </text>
              )}
              <circle
                cx={x(index)}
                cy={y(point.production)}
                r={active === index ? 5 : 3}
                fill={active === index ? '#142033' : '#1010ff'}
                tabIndex={0}
                role="img"
                aria-label={`${point.label}: Production ${integer(point.production)}, Sandbox ${integer(point.sandbox)} calls`}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                onTouchStart={() => setActive(index)}
              />
            </g>
          ))}
        </svg>
        <div
          aria-live="polite"
          className="min-h-9 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600"
        >
          {current ? (
            <>
              <strong>{current.label}</strong>
              <span className="ml-3 text-blue-700">
                Production: {integer(current.production)}
              </span>
              <span className="ml-3">Sandbox: {integer(current.sandbox)}</span>
            </>
          ) : (
            'Hover, tap, or focus a point to inspect API calls.'
          )}
        </div>
      </div>
      <details className="mt-3 text-xs text-slate-500">
        <summary className="cursor-pointer">View chart data</summary>
        <div className="mt-3 max-h-52 overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="p-2">Period</th>
                <th className="p-2">Production</th>
                <th className="p-2">Sandbox</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.label}>
                  <td className="p-2">{point.label}</td>
                  <td className="p-2">{integer(point.production)}</td>
                  <td className="p-2">{integer(point.sandbox)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
