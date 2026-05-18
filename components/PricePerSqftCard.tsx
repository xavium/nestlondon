"use client"

import { useState } from "react"
import type { PricePerSqftComparison } from "@/lib/pricePerSqftComparables"

/**
 * Price-per-area card. Two vertical bars: listing (always 100% reference height)
 * and area median (proportional — taller if median is more expensive, shorter if less).
 *
 * Toggleable units: £/sqft or £/sqm. Same underlying data, conversion factor 10.7639.
 */
export default function PricePerSqftCard({
  comparison,
}: {
  comparison: PricePerSqftComparison | null
}) {
  const [unit, setUnit] = useState<"sqft" | "sqm">("sqft")

  if (!comparison) return null

  const { listingPricePerSqft, medianPricePerSqft, sampleSize, confidence, signal, postcodeDistrict, propertyTypeLabel, deltaPercent } = comparison

  const multiplier = unit === "sqm" ? 10.7639 : 1
  const listingValue = Math.round(listingPricePerSqft * multiplier)
  const medianValue = Math.round(medianPricePerSqft * multiplier)
  const unitLabel = unit === "sqm" ? "per sqm" : "per sqft"

  // Listing bar: fixed 60% reference height. Median scales relative to it.
  // Cap at ~100% (1.66x) to avoid layout breaking on extreme outliers; min 4% for visibility.
  const LISTING_HEIGHT_PCT = 60
  const ratio = medianValue / listingValue
  const medianHeight = Math.max(4, Math.min(LISTING_HEIGHT_PCT * 1.66, LISTING_HEIGHT_PCT * ratio))

  const signalLabel =
    signal === "above" ? `${deltaPercent > 0 ? "+" : ""}${deltaPercent}% above local average` :
    signal === "below" ? `${deltaPercent}% below local average` :
    "In line with local average"
  const signalColor =
    signal === "above" ? "text-orange-700 bg-orange-50 border-orange-100" :
    signal === "below" ? "text-green-700 bg-green-50 border-green-100" :
    "text-stone-700 bg-stone-100 border-stone-200"

  const confidenceLabel =
    confidence === "high" ? `High confidence · ${sampleSize} comparable listings` :
    confidence === "medium" ? `Medium confidence · ${sampleSize} comparable listings` :
    `Limited data · only ${sampleSize} comparable listings`

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-sm font-semibold text-[#1C2B3A]">Price per square foot</h2>
        <span className="text-xs text-stone-400">{postcodeDistrict} {propertyTypeLabel}, current asking prices</span>
      </div>
      <p className="text-xs text-stone-500 mb-4">{confidenceLabel}</p>

      <div className="flex items-center justify-between mb-6">
        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${signalColor}`}>
          {signalLabel}
        </span>

        {/* Unit toggle */}
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

      <div className="flex items-end justify-center gap-12 mb-2 px-4" style={{ height: "180px" }}>
        <div className="flex flex-col items-center" style={{ width: "80px", height: "100%" }}>
          <div className="flex-1 flex items-end w-full">
            <div className="w-full flex flex-col items-center">
              <div className="text-sm font-semibold text-[#1C2B3A] mb-2" style={{ fontFamily: "Georgia, serif" }}>
                £{listingValue.toLocaleString()}
              </div>
              <div
                className="w-full rounded-t-md transition-all"
                style={{ height: LISTING_HEIGHT_PCT + "%", background: "#D3755A", minHeight: "8px" }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center" style={{ width: "80px", height: "100%" }}>
          <div className="flex-1 flex items-end w-full">
            <div className="w-full flex flex-col items-center">
              <div className="text-sm font-semibold text-[#1C2B3A] mb-2" style={{ fontFamily: "Georgia, serif" }}>
                £{medianValue.toLocaleString()}
              </div>
              <div
                className="w-full rounded-t-md transition-all"
                style={{ height: medianHeight + "%", background: "#D3755A66", minHeight: "8px" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-center gap-12 px-4">
        <div className="text-center" style={{ width: "80px" }}>
          <div className="text-xs font-medium text-[#1C2B3A]">This listing</div>
          <div className="text-[10px] text-stone-500 mt-0.5">{unitLabel}</div>
        </div>
        <div className="text-center" style={{ width: "80px" }}>
          <div className="text-xs font-medium text-stone-600">Area median</div>
          <div className="text-[10px] text-stone-500 mt-0.5">{unitLabel}</div>
        </div>
      </div>

      <p className="text-[11px] text-stone-400 mt-5">
        Compared against other current asking prices for similar properties in this area (not sold prices).
      </p>
    </div>
  )
}
