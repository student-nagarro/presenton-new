// @ts-nocheck
import * as z from "zod";
import React from "react";
export const layoutId = "bg-slide-01-cover-left";
export const layoutName = "Layout_bg_slide_01_cover_left";
export const layoutDescription = "bg-slide-01-cover-left (cover_dark)";


export const Schema = z.object({
  title: z.string().min(3).max(56).default("Titel").meta({ description: "Kurz halten (~6–8 Wörter)" }),
  subtitle: z.string().max(110).default("").meta({ description: "Optional, max ~1 Zeile" }),
  metaLine: z.string().max(70).default("").meta({ description: "Optional (z.B. Datum/Projekt)" }),
})

function RendererLayout({ data }) {
  const bgPath = "/static/images/nagarro_fluidic/Folie1.PNG"
  const safe = { left: "6%", top: "16%", right: "48%", bottom: "12%" }
  const slideData = data || {}

  const title = (slideData.title || "").toString()
  const subtitle = (slideData.subtitle || "").toString()
  const metaLine = (slideData.metaLine || "").toString()

  let titleSize = 64
  if (title.length > 44) titleSize = 54
  if (title.length > 56) titleSize = 48
  if (title.length > 64) titleSize = 42

  let subtitleSize = 28
  if (subtitle.length > 70) subtitleSize = 24

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
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0
        }}
      />

      <div
        className="text-white"
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
          <h1
            className="ppt-title"
            style={{
              margin: 0,
              fontSize: titleSize + "px",
              fontFamily: '"Equip Extended ExtraBold","Equip",sans-serif',
              fontWeight: 800,
              lineHeight: 1.05,
              maxHeight: "240px",
              overflow: "hidden"
            }}
          >
            {title}
          </h1>

          {subtitle ? (
            <h3
              style={{
                margin: 0,
                marginTop: "22px",
                fontSize: subtitleSize + "px",
                lineHeight: 1.22,
                opacity: 0.92,
                maxHeight: "140px",
                overflow: "hidden"
              }}
            >
              {subtitle}
            </h3>
          ) : null}

          {metaLine ? (
            <div style={{ marginTop: "auto", paddingTop: "26px" }}>
              <p style={{ margin: 0, fontSize: "22px", opacity: 0.9, maxHeight: "60px", overflow: "hidden" }}>
                {metaLine}
              </p>
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
