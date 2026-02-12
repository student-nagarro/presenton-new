// @ts-nocheck
import * as z from "zod";
import React from "react";
export const layoutId = "bg-slide-16-kpis";
export const layoutName = "Layout_bg_slide_16_kpis";
export const layoutDescription = "bg-slide-16-kpis (kpis_light)";


export const Schema = z.object({
  title: z.string().min(2).max(56).default("KPIs").meta({ description: "Überschrift (kurz)" }),
  kpis: z.array(
    z.object({
      label: z.string().min(1).max(28),
      value: z.string().min(1).max(18),
      hint: z.string().max(34).default(""),
    })
  )
    .min(2)
    .max(6)
    .default([
      { label: "Durchlaufzeit", value: "12d", hint: "" },
      { label: "Kosten", value: "€1.2M", hint: "" },
      { label: "Scope", value: "48", hint: "Items" },
      { label: "Qualität", value: "98%", hint: "" },
    ])
    .meta({ description: "2–6 KPIs (Label/Hint kurz halten)" }),
})

function RendererLayout({ data }) {
  const bgPath = "/static/images/nagarro_fluidic/Folie16.PNG"
  const safe = { left: "5%", top: "8%", right: "5%", bottom: "8%" }
  const slideData = data || {}
  const kpis = Array.isArray(slideData.kpis) ? slideData.kpis : []
  const title = (slideData.title || "").toString()

  const n = Math.max(0, Math.min(6, kpis.length))
  const rows = Math.max(1, Math.ceil(n / 2))

  const gridGap = rows >= 3 ? 14 : 18
  const cardPad = rows >= 3 ? 14 : 18
  const valueSize = rows >= 3 ? 30 : 34
  const labelSize = 16
  const hintSize = 14

  let titleSize = 42
  if (title.length > 42) titleSize = 38
  if (title.length > 56) titleSize = 34

  const baseHref =
    (typeof document !== "undefined" &&
      document.querySelector("base")?.getAttribute("href")) ||
    ""
  const base = baseHref.endsWith("/") ? baseHref.slice(0, -1) : baseHref
  const bg = base ? base + bgPath : bgPath

  return (
    <div
      className="relative w-full aspect-video overflow-hidden"
      style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden" }}
    >
      <img
        src={bg}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
      />

      <div
        className="text-slate-900"
        style={{
          position: "absolute",
          left: safe.left,
          top: safe.top,
          right: safe.right,
          bottom: safe.bottom,
          overflow: "hidden",
          zIndex: 1
        }}
      >
        <div style={{ padding: "36px" }}>
          <h1 className="ppt-title" style={{ margin: 0, fontFamily: '"Equip Extended ExtraBold","Equip",sans-serif', fontSize: titleSize + "px", fontWeight: 800, lineHeight: 1.1, maxHeight: "120px", overflow: "hidden" }}>
            {title}
          </h1>

          <div
            style={{
              marginTop: "20px",
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: gridGap + "px",
              maxHeight: "520px",
              overflow: "hidden",
            }}
          >
            {kpis.slice(0, 6).map((k, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid rgba(15,23,42,0.12)",
                  borderRadius: "14px",
                  padding: cardPad + "px " + cardPad + "px",
                  background: "rgba(255,255,255,0.70)",
                  overflow: "hidden",
                }}
              >
                <p style={{ margin: 0, fontSize: labelSize + "px", opacity: 0.85, maxHeight: "22px", overflow: "hidden" }}>
                  {k.label}
                </p>
                <h2 style={{ margin: 0, marginTop: "6px", fontSize: valueSize + "px", fontWeight: 800, lineHeight: 1.05, maxHeight: "42px", overflow: "hidden" }}>
                  {k.value}
                </h2>
                {k.hint ? (
                  <p style={{ margin: 0, marginTop: "6px", fontSize: hintSize + "px", opacity: 0.8, maxHeight: "22px", overflow: "hidden" }}>
                    {k.hint}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const dynamicSlideLayout = RendererLayout
const DefaultLayout = RendererLayout

export default RendererLayout
