// @ts-nocheck
import * as z from "zod";
import React from "react";
export const layoutId = "bg-slide-36-body";
export const layoutName = "Layout_bg_slide_36_body";
export const layoutDescription = "bg-slide-36-body (three_columns_compare_light)";


const MAX_BULLET_WORDS = 20
const Bullet = z
  .string()
  .min(1)
  .max(140)
  .refine(
    (s) =>
      (s ?? "")
        .toString()
        .trim()
        .split(/\s+/)
        .filter(Boolean).length <= MAX_BULLET_WORDS,
    { message: `max ${MAX_BULLET_WORDS} words` }
  )

const Col = z.object({
  title: z.string().max(40).default(""),
  bullets: z.array(Bullet).max(10).default([])
})

export const Schema = z.object({
  title: z.string().max(70).default("Titel"),
  colA: Col.default({ title: "Spalte A", bullets: ["Punkt 1", "Punkt 2"] }),
  colB: Col.default({ title: "Spalte B", bullets: ["Punkt 1", "Punkt 2"] }),
  colC: Col.default({ title: "Spalte C", bullets: ["Punkt 1", "Punkt 2"] })
})

function RendererLayout({ data }) {
  const bgPath = "/static/images/nagarro_fluidic/Folie36.PNG"
  const safe = { left: "5%", top: "18%", right: "5%", bottom: "16.3%" }
  const d = data || {}

  const baseHref = (typeof document !== "undefined" && document.querySelector("base")?.getAttribute("href")) || ""
  const base = baseHref.endsWith("/") ? baseHref.slice(0, -1) : baseHref
  const bg = base ? base + bgPath : bgPath

  const BOXES = [
    { left:"28.67%", top:"27.50%", width:"21.02%", height:"56.25%" },
    { left:"50.94%", top:"27.50%", width:"21.02%", height:"56.25%" },
    { left:"73.20%", top:"27.50%", width:"20.47%", height:"56.25%" },
  ]

  const title = (d.title || "").toString()
  const cols = [d.colA || {}, d.colB || {}, d.colC || {}]

  function fontFor(bulletsLen){
    let s = 20
    if (bulletsLen >= 7) s = 18
    if (bulletsLen >= 9) s = 16
    return Math.max(16, s)
  }

  function normalizeBullets(arr){
  if (!Array.isArray(arr)) return []
  return arr
    .map(s => (s ?? "").toString().replace(/^\s*(?:â€¢|[•·*-])\s+/, "").trim())
    .filter(Boolean)
  }

  function clampWords(input, maxWords){
    const text = (input ?? "").toString().trim()
    if (!text) return ""
    const parts = text.split(/\s+/)
    if (parts.length <= maxWords) return text
    return parts.slice(0, maxWords).join(" ")
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
          width: "100%"
        }}
      >
        {clean.map((t, i) => (
          <li key={i} style={{ lineHeight: lineHeight, whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word", maxWidth: "100%" }}>
            {t}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div style={{ position:"relative", width:"100%", aspectRatio:"16 / 9", overflow:"hidden" }}>
      <img src={bg} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", zIndex:0 }} />

      {title ? (
        <div style={{ position:"absolute", left:"6%", top:"8%", width:"88%", zIndex:2, color:"#0f172a", overflow:"hidden" }}>
          <h1
            className="ppt-title"
            style={{
              margin: 0,
              fontFamily: '"Equip Extended ExtraBold","Equip",sans-serif',
              fontSize: "44px",
              fontWeight: 800,
            lineHeight: 1.05,
            maxHeight: "92px",
            overflow: "hidden",
            whiteSpace: "normal",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical"
          }}
          >
            {title}
        </h1>

        </div>
      ) : null}

      {BOXES.map((b, i) => {
        const c = cols[i] || {}
        const cTitle = (c.title || "").toString()
        const bullets = Array.isArray(c.bullets)
          ? c.bullets.slice(0,10).map(b => clampWords(b, MAX_BULLET_WORDS))
          : []
        const txtSize = fontFor(bullets.length)

        return (
          <div key={i} style={{ position:"absolute", ...b, zIndex:2, overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, padding:"18px 18px", color:"#0f172a", width:"100%", height:"100%", boxSizing:"border-box" }}>
              {cTitle ? (
                <h2 style={{ margin: 0, fontSize:"22px", fontWeight:800, lineHeight:1.15, maxHeight:"54px", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", width:"100%" }}>
                  {cTitle}
                </h2>
              ) : null}
              <div style={{
                marginTop: cTitle ? "12px" : "0",
                maxHeight: cTitle ? "calc(100% - 70px)" : "100%",
                overflow: "hidden"
              }}>
                <BulletRows items={bullets} fontSize={txtSize} lineHeight={1.35} maxItems={10} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const dynamicSlideLayout = RendererLayout
const DefaultLayout = RendererLayout

export default RendererLayout
