// @ts-nocheck
import * as z from "zod";
import React from "react";
export const layoutId = "bg-slide-14-text";
export const layoutName = "Layout_bg_slide_14_text";
export const layoutDescription = "bg-slide-14-text (body_light)";


export const Schema = z.object({
  title: z.string().min(2).max(56).default("Titel").meta({ description: "Überschrift (kurz)" }),
  body: z.string().min(10).max(750).default("Text...").meta({ description: "Fließtext (kompakt), gern mit Zeilenumbrüchen" }),
})

function RendererLayout({ data }) {
  const bgPath = "/static/images/nagarro_fluidic/Folie14.PNG"
  const safe = { left: "5%", top: "8%", right: "5%", bottom: "8%" }
  const slideData = data || {}
  const title = (slideData.title || "").toString()
  const body = (slideData.body || "").toString()

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

  let titleSize = 44
  if (title.length > 44) titleSize = 40
  if (title.length > 56) titleSize = 36

  const bodyMaxH = 520
  const bodyLineHeight = 1.45
  const charsPerLine = 76
  const lines = estLines(body, charsPerLine)

  let bodySize = Math.floor(Math.min(22, bodyMaxH / (Math.max(1, lines) * bodyLineHeight)))
  bodySize = Math.max(16, Math.min(22, bodySize))

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
        <div style={{ padding: "40px", height: "100%", display: "flex", flexDirection: "column" }}>
          <h1 className="ppt-title" style={{ margin: 0, fontFamily: '"Equip Extended ExtraBold","Equip",sans-serif', fontSize: titleSize + "px", fontWeight: 800, lineHeight: 1.1, maxHeight: "130px", overflow: "hidden" }}>
            {title}
          </h1>

          <p
            style={{
              margin: 0,
              marginTop: "16px",
              fontSize: bodySize + "px",
              lineHeight: bodyLineHeight,
              whiteSpace: "pre-wrap",
              maxHeight: bodyMaxH + "px",
              overflow: "hidden"
            }}
          >
            {body}
          </p>
        </div>
      </div>
    </div>
  )
}

const dynamicSlideLayout = RendererLayout
const DefaultLayout = RendererLayout

export default RendererLayout
