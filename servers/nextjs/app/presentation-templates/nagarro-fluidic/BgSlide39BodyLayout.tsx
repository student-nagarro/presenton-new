// @ts-nocheck
import * as z from "zod";
import React from "react";
export const layoutId = "bg-slide-39-body";
export const layoutName = "Layout_bg_slide_39_body";
export const layoutDescription = "bg-slide-39-body (quote_split_dark)";


export const Schema = z.object({
  contextTitle: z.string().max(70).default("Kontext"),
  contextBullets: z.array(z.string().min(1).max(140)).max(7).default(["Punkt 1", "Punkt 2", "Punkt 3"]),
  contextBody: z.string().max(700).default(""),
  quote: z.string().min(10).max(420).default("Ein starkes Zitat steht hier."),
  author: z.string().max(60).default("Max Mustermann"),
  role: z.string().max(80).default("Rolle/Funktion")
})

function RendererLayout({ data }) {
  const bgPath = "/static/images/nagarro_fluidic/Folie39.PNG"
  const safe = { left: "5%", top: "12%", right: "5%", bottom: "8%" }
  const d = data || {}
  const contextTitle = (d.contextTitle || "").toString()
  const contextBullets = Array.isArray(d.contextBullets) ? d.contextBullets.slice(0, 7) : []
  const contextBody = (d.contextBody || "").toString()
  const quote = (d.quote || "").toString()
  const author = (d.author || "").toString()
  const role = (d.role || "").toString()

  let cTitleSize = 40
  if (contextTitle.length > 44) cTitleSize = 36
  if (contextTitle.length > 60) cTitleSize = 32

  let quoteSize = 48
  if (quote.length > 160) quoteSize = 42
  if (quote.length > 260) quoteSize = 36
  if (quote.length > 340) quoteSize = 32

  const baseHref = (typeof document !== "undefined" && document.querySelector("base")?.getAttribute("href")) || ""
  const base = baseHref.endsWith("/") ? baseHref.slice(0, -1) : baseHref
  const bg = base ? base + bgPath : bgPath

  const LEFT = { left: "6%", top: "14%", width: "36%", height: "72%" }
  // Center the quote box within the right half
  const RIGHT = { left: "55%", top: "17%", width: "40%", height: "66%" }

  function normalizeBullets(arr){
    if (!Array.isArray(arr)) return []
    return arr
      .map(s => (s ?? "").toString().replace(/^\s*(?:â€¢|[•·*-])\s+/, "").trim())
      .filter(Boolean)
  }

  function BulletRows({ items, fontSize, lineHeight, maxItems = 8 }) {
    const clean = normalizeBullets(items).slice(0, maxItems)
    return (
      <ul
      style={{
        display: "grid",
        rowGap: "0.35em",
        margin: 0,
        paddingLeft: "1.2em",
        listStyleType: "disc",
        listStylePosition: "outside",
        fontSize: fontSize + "px",
      }}
    >
      {clean.map((t, i) => (
        <li key={i} style={{ lineHeight: lineHeight, whiteSpace: "pre-wrap" }}>
          {t}
        </li>
      ))}
    </ul>
    )
  }

  const leftText = contextBody

  const leftBullets = normalizeBullets(contextBullets)

  return (
    <div className="relative w-full aspect-video overflow-hidden" style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden" }}>
      <img src={bg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />

      {/* Left (white) context */}
      <div style={{ position: "absolute", ...LEFT, zIndex: 2, overflow: "hidden", color: "#0f172a" }}>
        {contextTitle ? (
          <h2 style={{ margin: 0, fontSize: cTitleSize + "px", fontWeight: 800, lineHeight: 1.08, maxHeight: "140px", overflow: "hidden" }}>
            {contextTitle}
          </h2>
        ) : null}

        {leftBullets.length ? (
          <div style={{ margin: 0, marginTop: "16px", maxHeight: "460px", overflow: "hidden", color: "rgba(15,23,42,0.88)" }}>
            <BulletRows items={leftBullets} fontSize={18} lineHeight={1.45} maxItems={9} />
          </div>
        ) : leftText ? (
          <p style={{ margin: 0, marginTop: "16px", fontSize: "18px", lineHeight: 1.45, whiteSpace: "pre-wrap", maxHeight: "460px", overflow: "hidden", color: "rgba(15,23,42,0.88)" }}>
            {leftText}
          </p>
        ) : null}
      </div>

      {/* Right (dark) quote */}
      <div
        style={{
          position: "absolute",
          ...RIGHT,
          zIndex: 3,
          overflow: "hidden",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center"
        }}
      >
        <div style={{ width: "100%", padding: "8px 10px" }}>
          <h2 style={{ margin: 0, fontSize: quoteSize + "px", fontWeight: 700, lineHeight: 1.12, whiteSpace: "pre-wrap", maxHeight: "360px", overflow: "hidden" }}>
            {quote}
          </h2>

          {(author || role) ? (
            <div style={{ marginTop: "18px", fontSize: "20px", lineHeight: 1.3, opacity: 0.92, maxHeight: "120px", overflow: "hidden" }}>
              {author ? <p style={{ margin: 0, fontWeight: 800 }}>{author}</p> : null}
              {role ? <p style={{ margin: 0 }}>{role}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const dynamicSlideLayout = RendererLayout
const DefaultLayout = RendererLayout

export default RendererLayout
