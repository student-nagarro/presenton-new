// @ts-nocheck
import * as z from "zod";
import React from "react";
export const layoutId = "bg-slide-35-body";
export const layoutName = "Layout_bg_slide_35_body";
export const layoutDescription = "bg-slide-35-body (cards_2up_light)";


const CardItemSchema = z.object({
  title: z.string().min(1).max(40),
  body: z.string().min(0).max(260).default(""),
  bullets: z.array(z.string().min(1).max(140)).max(8).default([]),
})

export const Schema = z.object({
  title: z.string().min(2).max(70).default("Titel"),
  items: z
    .array(CardItemSchema)
    .length(2)
    .default([
      { title: "Card A", body: "Kurztext", bullets: [] },
      { title: "Card B", body: "Kurztext", bullets: [] },
    ])
    .describe(
      "Exactly 2 cards. Use this layout only when there are 2 distinct points. If there are 3 points, choose the 3-card layout instead."
    ),
})

function RendererLayout({ data }) {
  const bgPath = "/static/images/nagarro_fluidic/Folie35.PNG"
  const safe = { left: "5%", top: "12%", right: "5%", bottom: "8%" }
  const d = data || {}
  const title = (d.title || "").toString()
  const items = Array.isArray(d.items) ? d.items.slice(0, 2) : []

  function normalizeBullets(arr) {
    if (!Array.isArray(arr)) return []
    return arr
      .map((s) => (s ?? "").toString().replace(/^\s*[-•*]\s+/, "").trim())
      .filter(Boolean)
  }

  function BulletRows({ items, fontSize, lineHeight, maxItems = 8 }) {
    const clean = normalizeBullets(items).slice(0, maxItems)
    return (
      <div style={{ display: "grid", rowGap: "0.35em" }}>
        {clean.map((t, i) => (
          <div
            key={i}
            style={{ display: "flex", gap: "0.6em", alignItems: "flex-start" }}
          >
            <span
              style={{
                fontSize: fontSize + "px",
                lineHeight: lineHeight,
                flex: "0 0 auto",
              }}
            >
              •
            </span>
            <span
              style={{
                fontSize: fontSize + "px",
                lineHeight: lineHeight,
                flex: "1 1 auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {t}
            </span>
          </div>
        ))}
      </div>
    )
  }

  let titleSize = 44
  if (title.length > 42) titleSize = 40
  if (title.length > 60) titleSize = 36

  const baseHref =
    (typeof document !== "undefined" &&
      document.querySelector("base")?.getAttribute("href")) ||
    ""
  const base = baseHref.endsWith("/") ? baseHref.slice(0, -1) : baseHref
  const bg = base ? base + bgPath : bgPath

  const ROW = { left: "6%", top: "28%", width: "88%", height: "56%" }

  return (
    <div
      className="relative w-full aspect-video overflow-hidden"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        overflow: "hidden",
      }}
    >
      <img
        src={bg}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "6%",
          top: "10%",
          right: "6%",
          zIndex: 2,
          overflow: "hidden",
        }}
      >
        <h1
          className="ppt-title"
          style={{
            margin: 0,
            fontFamily: '"Equip Extended ExtraBold","Equip",sans-serif',
            fontSize: titleSize + "px",
            fontWeight: 800,
            lineHeight: 1.05,
            maxHeight: "120px",
            color: "#0f172a",
          }}
        >
          {title}
        </h1>
      </div>

      <div style={{ position: "absolute", ...ROW, zIndex: 3 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "18px",
            height: "100%",
          }}
        >
          {Array.from({ length: 2 }).map((_, i) => {
            const it = items[i] || { title: "", body: "", bullets: [] }
            const b = normalizeBullets(it.bullets)
            const showBullets = b.length > 0

            return (
              <div
                key={i}
                style={{
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.70)",
                  border: "1px solid rgba(15,23,42,0.10)",
                  padding: "18px",
                  overflow: "hidden",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "24px",
                    fontWeight: 800,
                    color: "#0f172a",
                    lineHeight: 1.15,
                    maxHeight: "60px",
                    overflow: "hidden",
                  }}
                >
                  {it.title}
                </h2>

                <div
                  style={{
                    marginTop: "12px",
                    color: "rgba(15,23,42,0.85)",
                    maxHeight: "240px",
                    overflow: "hidden",
                  }}
                >
                  {showBullets ? (
                    <BulletRows items={b} fontSize={16} lineHeight={1.38} maxItems={8} />
                  ) : (
                    <p
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        lineHeight: 1.38,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {it.body}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const dynamicSlideLayout = RendererLayout
const DefaultLayout = RendererLayout

export default RendererLayout
