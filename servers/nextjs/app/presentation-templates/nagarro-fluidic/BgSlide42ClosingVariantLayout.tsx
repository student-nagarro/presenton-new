// @ts-nocheck
import * as z from "zod";
import React from "react";
export const layoutId = "bg-slide-42-closing-variant";
export const layoutName = "Layout_bg_slide_42_closing_variant";
export const layoutDescription = "bg-slide-42-closing-variant (closing_light)";


export const Schema = z.object({
  title: z
    .string()
    .min(2)
    .max(72)
    .default("Danke")
    .meta({ description: "Titel unter dem Logo (1–2 Zeilen ok)" }),
})

function RendererLayout({ data }) {
  const bgPath = "/static/images/nagarro_fluidic/Folie42.PNG"
  const safe = { left: "5%", top: "70%", right: "5%", bottom: "8%" }
  const d = data || {}
  const title = (d.title || "").toString()

  let titleSize = 56
  if (title.length > 28) titleSize = 52
  if (title.length > 44) titleSize = 46
  if (title.length > 60) titleSize = 40

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

      {/* Only title, centered inside SAFE area (set SAFE_TOP ~70% in spec) */}
      <div
        style={{
          position: "absolute",
          left: safe.left,
          top: safe.top,
          right: safe.right,
          bottom: safe.bottom,
          zIndex: 2,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "#0f172a",
        }}
      >
        <h1
          className="ppt-title"
          style={{
            margin: 0,
            width: "100%",
            fontSize: titleSize + "px",
            fontFamily: '"Equip Extended ExtraBold","Equip",sans-serif',
            fontWeight: 800,
            lineHeight: 1.05,
            whiteSpace: "pre-wrap",
            maxHeight: "220px",
            overflow: "hidden",
          }}
        >
          {title}
        </h1>
      </div>
    </div>
  )
}

const dynamicSlideLayout = RendererLayout
const DefaultLayout = RendererLayout

export default RendererLayout
