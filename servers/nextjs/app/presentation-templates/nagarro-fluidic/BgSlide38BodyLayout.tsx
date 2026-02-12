// @ts-nocheck
import * as z from "zod";
import React from "react";
export const layoutId = "bg-slide-38-body";
export const layoutName = "Layout_bg_slide_38_body";
export const layoutDescription = "bg-slide-38-body (quote_dark)";


export const Schema = z.object({
  quote: z.string().min(10).max(420).default("A strong quote goes here."),
  author: z.string().max(60).default(""),
  role: z.string().max(80).default(""),
  source: z.string().max(90).default("")
})

function RendererLayout({ data }) {
  const bgPath = "/static/images/nagarro_fluidic/Folie38.PNG"
  const safe = { left: "5%", top: "12%", right: "5%", bottom: "8%" }
  const d = data || {}
  const quote = (d.quote || "").toString()
  const author = (d.author || "").toString()
  const role = (d.role || "").toString()
  const source = (d.source || "").toString()

  let quoteSize = 56
  if (quote.length > 160) quoteSize = 48
  if (quote.length > 260) quoteSize = 40
  if (quote.length > 340) quoteSize = 34

  const baseHref =
    (typeof document !== "undefined" && document.querySelector("base")?.getAttribute("href")) || ""
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

      {/* Full-screen centering layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 8%",
          color: "white",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1200px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "22px"
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: quoteSize + "px",
              fontWeight: 700,
              lineHeight: 1.12,
              whiteSpace: "pre-wrap",
              maxHeight: "360px",
              overflow: "hidden"
            }}
          >
            {quote}
          </h2>

          {(author || role || source) ? (
            <div style={{ fontSize: "20px", lineHeight: 1.3, opacity: 0.92, maxHeight: "120px", overflow: "hidden" }}>
              {author ? <p style={{ margin: 0, fontWeight: 800 }}>{author}</p> : null}
              {role ? <p style={{ margin: 0 }}>{role}</p> : null}
              {source ? <p style={{ margin: 0, opacity: 0.85 }}>{source}</p> : null}
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
