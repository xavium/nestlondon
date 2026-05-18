"use client"

import { useState } from "react"
import type { PricePerSqftComparison } from "@/lib/pricePerSqftComparables"
import { Info } from "lucide-react"

/**
 * Price guide card. Three vertical bars: Lowest, This Home, Highest — with a
 * dashed reference line at the listing's £/sqft. Two-column header summarises
 * the listing vs area average.
 *
 * Layout reference: Mubawab/Property Finder-style "Price Guide" patterns.
 */
export default function PricePerSqftCard({
  comparison,
}: {
  comparison: PricePerSqftComparison | null
}) {
  const [unit, setUnit] = useState<"sqft" | "sqm">("sqft")

  if (!comparison) return null

  const {
    listingPricePerSqft,
    medianPricePerSqft,
    minPricePerSqft,
    maxPricePerSqft,
    sampleSize,
    confidence,
    signal,
    deltaPercent,
    postcodeDistrict,
    propertyTypeLabel,
  } = comparison

  // Signal derived directly from deltaPercent (vs median) so it matches the dashed
  // "Area avg." line. Within ±5% = in line; otherwise above/below.
  const cardSignal: "above" | "below" | "within" =
    deltaPercent > 5 ? "above" :
    deltaPercent < -5 ? "below" :
    "within"
  const signalLabel =
    cardSignal === "above" ? `+${deltaPercent}% above local average` :
    cardSignal === "below" ? `${deltaPercent}% below local average` :
    "In line with local average"
  const signalColor =
    cardSignal === "above" ? "text-orange-700 bg-orange-50 border-orange-100" :
    cardSignal === "below" ? "text-green-700 bg-green-50 border-green-100" :
    "text-stone-700 bg-stone-100 border-stone-200"


  // Unit conversion
  const multiplier = unit === "sqm" ? 10.7639 : 1
  const listingValue = Math.round(listingPricePerSqft * multiplier)
  const medianValue = Math.round(medianPricePerSqft * multiplier)
  const minValue = Math.round(minPricePerSqft * multiplier)
  const maxValue = Math.round(maxPricePerSqft * multiplier)
  const unitLabel = unit === "sqm" ? "sqm" : "sqft"

  // Bar heights: proportional, with the tallest bar at 100% of the chart area.
  // Always include all three values in the max calculation.
  const chartMax = Math.max(listingValue, minValue, maxValue) || 1
  const minH = (minValue / chartMax) * 100
  const listingH = (listingValue / chartMax) * 100
  const maxH = (maxValue / chartMax) * 100

  // Dashed reference line at the AREA AVERAGE (median). Anchors the chart so you
  // can see at a glance how far above/below the listing sits vs the average.
  const medianH = (medianValue / chartMax) * 100
  const referenceTop = 100 - medianH

  const confidenceLabel =
    confidence === "high" ? `High confidence · ${sampleSize} comparable listings` :
    confidence === "medium" ? `Medium confidence · ${sampleSize} comparable listings` :
    `Limited data · only ${sampleSize} comparable listings`

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-base font-semibold text-[#1C2B3A]">Price Guide</h2>
        <div className="inline-flex border border-[#E8E2DA] rounded-lg overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setUnit("sqft")}
            className={`px-3 py-1 transition-colors ${
              unit === "sqft" ? "bg-[#1C2B3A] text-white" : "text-stone-600 hover:bg-[#F8F4ED]"
            }`}
          >
            sqft
          </button>
          <button
            type="button"
            onClick={() => setUnit("sqm")}
            className={`px-3 py-1 transition-colors ${
              unit === "sqm" ? "bg-[#1C2B3A] text-white" : "text-stone-600 hover:bg-[#F8F4ED]"
            }`}
          >
            sqm
          </button>
        </div>
      </div>

      {/* Two-column header: This Home / Area Average */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-xs text-stone-500 mb-1">This Home</div>
          <div className="text-lg font-semibold" style={{ color: "#D3755A", fontFamily: "Georgia, serif" }}>
            £{listingValue.toLocaleString()}<span className="text-sm font-normal ml-1">/ {unitLabel}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-stone-500 mb-1">Area Average</div>
          <div className="text-lg font-semibold text-[#1C2B3A]" style={{ fontFamily: "Georgia, serif" }}>
            £{medianValue.toLocaleString()}<span className="text-sm font-normal ml-1">/ {unitLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-500">Price per area</span>
          {/* Info tooltip: hover on desktop, tap on mobile. Uses group-focus for touch UX. */}
          <button
            type="button"
            className="group relative inline-flex items-center text-stone-400 hover:text-stone-600 focus:outline-none focus:text-stone-600"
            aria-label="What counts as a comparable?"
          >
            <Info className="w-3.5 h-3.5" />
            <span
              role="tooltip"
              className="absolute left-0 top-5 z-20 w-64 bg-[#1C2B3A] text-white text-[11px] leading-relaxed rounded-md px-3 py-2 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-focus:opacity-100 transition-opacity"
            >
              Comparables: other current asking prices for {propertyTypeLabel} in {postcodeDistrict} with size data. Not filtered by bedroom count or specific subtype (terraced vs detached etc).
            </span>
          </button>
        </div>
        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${signalColor}`}>
          {signalLabel}
        </span>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: "200px" }}>
        {/* Dashed reference line at the area-average (median) value — anchors the chart */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-stone-400"
          style={{ top: referenceTop + "%" }}
        >
          <span
            className="absolute right-0 -translate-y-1/2 bg-white px-1.5 text-[10px] font-medium text-stone-500 whitespace-nowrap"
            style={{ top: "0" }}
          >
            Area avg.
          </span>
        </div>

        {/* Three bars */}
        <div className="absolute inset-0 flex items-end justify-around px-4">
          <BarColumn
            value={minValue}
            heightPct={minH}
            unitLabel={unitLabel}
            label="Lowest"
            isListing={false}
          />
          <BarColumn
            value={listingValue}
            heightPct={listingH}
            unitLabel={unitLabel}
            label="This Home"
            isListing={true}
          />
          <BarColumn
            value={maxValue}
            heightPct={maxH}
            unitLabel={unitLabel}
            label="Highest"
            isListing={false}
          />
        </div>
      </div>

      {/* Labels below the bars (separated from chart so they don't overlap with short bars) */}
      <div className="flex items-start justify-around px-4 mt-2">
        <div className="text-center" style={{ width: "30%" }}>
          <div className="text-xs text-stone-500">Lowest</div>
        </div>
        <div className="text-center" style={{ width: "30%" }}>
          <div className="text-xs font-medium text-[#1C2B3A]">This Home</div>
        </div>
        <div className="text-center" style={{ width: "30%" }}>
          <div className="text-xs text-stone-500">Highest</div>
        </div>
      </div>

      <p className="text-[11px] text-stone-400 mt-5">{confidenceLabel}.</p>
    </div>
  )
}

function BarColumn({
  value,
  heightPct,
  unitLabel,
  label,
  isListing,
}: {
  value: number
  heightPct: number
  unitLabel: string
  label: string
  isListing: boolean
}) {
  return (
    <div className="flex flex-col items-center" style={{ width: "30%", height: "100%" }}>
      <div className="flex-1 flex flex-col items-center justify-end w-full relative">
        {/* Value label above the bar */}
        <div
          className="text-xs font-medium mb-1.5 whitespace-nowrap"
          style={{ color: isListing ? "#D3755A" : "#1C2B3A" }}
        >
          £{value.toLocaleString()} / {unitLabel}
        </div>
        <div
          className="w-full rounded-md"
          style={{
            height: heightPct + "%",
            background: isListing ? "#D3755A" : "#D3755A22",
            border: isListing ? "none" : "1px solid #D3755A55",
            minHeight: "8px",
            maxWidth: "100px",
          }}
        />
      </div>
    </div>
  )
}
