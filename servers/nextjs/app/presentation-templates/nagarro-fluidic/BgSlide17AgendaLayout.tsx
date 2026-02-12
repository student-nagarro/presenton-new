// @ts-nocheck
import * as z from "zod";
import React from "react";
export const layoutId = "bg-slide-17-agenda";
export const layoutName = "Layout_bg_slide_17_agenda";
export const layoutDescription = "bg-slide-17-agenda (bullets_light)";


export const Schema = z.object({
  title: z.string().min(2).max(56).default("Titel").meta({ description: "Überschrift (kurz, ~6–8 Wörter)" }),
  bullets: z.array(z.string().min(1).max(120)).min(1).max(7).default(["Punkt 1", "Punkt 2"]).meta({
    description: "1–7 Punkte; kurz halten (≤ ~12 Wörter pro Punkt)"
  }),
  note: z.string().max(140).default("").meta({ description: "Optional (1 kurzer Satz)" }),
})

function RendererLayout({ data }) {
  const bgPath = "/static/images/nagarro_fluidic/Folie17.PNG"
  const safe = { left: "5%", top: "8%", right: "5%", bottom: "8%" }
  const slideData = data || {}
  const bullets = Array.isArray(slideData.bullets) ? slideData.bullets : []
  const title = (slideData.title || "").toString()
  const note = (slideData.note || "").toString()

  function stripTags(s) {
    return (s || "").toString().replace(/<[^>]*>/g, "")
  }
  function estLines(text, charsPerLine) {
    const t = stripTags(text)
    const parts = t.split(/\r?\n/)
    let n = 0
    for (const p of parts) {
      const len = (p || "").trim().length
      n += Math.max(1, Math.ceil(len / charsPerLine))
    }
    return Math.max(1, n)
  }

  function normalizeBullets(arr){
  if (!Array.isArray(arr)) return []
  return arr
    .map(s => (s ?? "").toString().replace(/^\s*[-•*]\s+/, "").trim())
    .filter(Boolean)
  }

  function BulletRows({ items, fontSize, lineHeight, maxItems = 8 }) {
  const clean = normalizeBullets(items).slice(0, maxItems)
  return (
    <div style={{ display: "grid", rowGap: "0.35em" }}>
      {clean.map((t, i) => (
        <div key={i} style={{ display: "flex", gap: "0.6em", alignItems: "flex-start" }}>
          <span style={{ fontSize: fontSize + "px", lineHeight: lineHeight, flex: "0 0 auto" }}>•</span>
          <span style={{ fontSize: fontSize + "px", lineHeight: lineHeight, flex: "1 1 auto", whiteSpace: "pre-wrap" }}>
            {t}
          </span>
        </div>
      ))}
    </div>
  )
  }

  const b = bullets.slice(0, 7)
  const bNorm = normalizeBullets(b).slice(0, 7)

  const charsPerLine = 52
  const bulletLines = b.reduce((sum, x) => sum + estLines(x, charsPerLine), 0)

  // reserve vertical space: title + padding + optional note
  const bulletMaxH = note ? 360 : 420
  const bulletLineHeight = 1.25

  // compute font size so that estimated height stays within bulletMaxH
  // height ≈ lines * size * lineHeight
  let bulletSize = Math.floor(Math.min(24, bulletMaxH / (Math.max(1, bulletLines) * bulletLineHeight)))
  bulletSize = Math.max(18, Math.min(24, bulletSize))

  // title scaling
  let titleSize = 46
  if (title.length > 42) titleSize = 42
  if (title.length > 56) titleSize = 38

  const noteSize = Math.max(16, bulletSize - 4)

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
        <div style={{ padding: "36px", height: "100%", display: "flex", flexDirection: "column" }}>
          <h1 className="ppt-title" style={{ margin: 0, fontFamily: '"Equip Extended ExtraBold","Equip",sans-serif', fontSize: titleSize + "px", fontWeight: 800, lineHeight: 1.05, maxHeight: "130px", overflow: "hidden" }}>
            {title}
          </h1>

          {/* IMPORTANT: keep bullets in ONE bounded text node (prevents PPTX exporter from placing items below the slide) */}
          <div style={{ marginTop: "18px", maxHeight: bulletMaxH + "px", overflow: "hidden" }}>
            <BulletRows items={b} fontSize={bulletSize} lineHeight={bulletLineHeight} maxItems={7} />
          </div>

          {note ? (
            <p
              style={{
                margin: 0,
                marginTop: "14px",
                fontSize: noteSize + "px",
                lineHeight: 1.3,
                opacity: 0.9,
                maxHeight: "90px",
                overflow: "hidden"
              }}
            >
              {note}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const dynamicSlideLayout = RendererLayout
const DefaultLayout = RendererLayout

export default RendererLayout
