// @ts-nocheck
import * as z from "zod";
import React from "react";
export const layoutId = "bg-slide-27-body";
export const layoutName = "Layout_bg_slide_27_body";
export const layoutDescription = "bg-slide-27-body (canvas_light)";


// Presenton-style image object: __image_prompt__ triggers generation/search, __image_url__ holds final URL.
// Keep `src` for backward compatibility (manual URLs).
const PresentonImageSchema = z.object({
  __image_url__: z.string().default(""),
  __image_prompt__: z
    .string()
    .max(240)
    .default("")
    .describe(
      "Describe the image to generate/search for. Leave __image_url__ empty and fill __image_prompt__."
    ),
  src: z.string().default(""),
  caption: z.string().max(80).default(""),
})

export const Schema = z.object({
  title: z.string().min(2).max(70).default("Titel").meta({ description: "Überschrift (kurz, ~6–8 Wörter)" }),
  subtitle: z.string().max(140).default(""),
  body: z.string().min(0).max(1200).default(""),
  bullets: z.array(z.string().min(1).max(140)).min(0).max(10).default([]),
  image: PresentonImageSchema.default({
    __image_url__: "",
    __image_prompt__: "",
    src: "",
    caption: "",
  }),
  note: z.string().max(160).default(""),
})

function RendererLayout({ data }) {
  const bgPath = "/static/images/nagarro_fluidic/Folie27.PNG"
  const safe = { left: "5%", top: "12%", right: "5%", bottom: "8%" }
  const d = data || {}
  const title = (d.title || "").toString()
  const subtitle = (d.subtitle || "").toString()
  const body = (d.body || "").toString()
  const bullets = Array.isArray(d.bullets) ? d.bullets.slice(0, 10) : []
  const image = d.image || {}
  const imgSrc = (image.__image_url__ || image.src || "").toString()
  const note = (d.note || "").toString()
  const hasImg = !!imgSrc

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

  function normalizeBullets(arr) {
    if (!Array.isArray(arr)) return []
    return arr
      .map((s) => (s ?? "").toString().replace(/^\s*(?:â€¢|[•·*-])\s+/, "").trim())
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

  let titleSize = 48
  if (title.length > 42) titleSize = 44
  if (title.length > 60) titleSize = 40

  const textLines = estLines(body || bullets.join("\n"), hasImg ? 60 : 90)
  const maxH = 520
  const lh = 1.45
  let bodySize = Math.floor(
    Math.min(22, maxH / (Math.max(1, textLines) * lh))
  )
  bodySize = Math.max(16, Math.min(22, bodySize))

  const baseHref =
    (typeof document !== "undefined" &&
      document.querySelector("base")?.getAttribute("href")) ||
    ""
  const base = baseHref.endsWith("/") ? baseHref.slice(0, -1) : baseHref
  const bg = base ? base + bgPath : bgPath

  const LEFT = {
    left: "6%",
    top: "12%",
    width: hasImg ? "56%" : "88%",
    height: "78%",
  }
  const RIGHT_IMG = { left: "64%", top: "22%", width: "30%", height: "56%" }

  const bNorm = normalizeBullets(bullets).slice(0, 10)

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

      <div style={{ position: "absolute", ...LEFT, zIndex: 2, overflow: "hidden" }}>
        <h1
          className="ppt-title"
          style={{
            margin: 0,
            fontFamily: '"Equip Extended ExtraBold","Equip",sans-serif',
            fontSize: titleSize + "px",
            fontWeight: 800,
            lineHeight: 1.05,
            maxHeight: "150px",
            overflow: "hidden",
            color: "#0f172a",
          }}
        >
          {title}
        </h1>

        {subtitle ? (
          <h3
            style={{
              margin: 0,
              marginTop: "12px",
              fontSize: "22px",
              lineHeight: 1.25,
              maxHeight: "90px",
              overflow: "hidden",
              color: "rgba(15,23,42,0.85)",
            }}
          >
            {subtitle}
          </h3>
        ) : null}

        {bNorm.length ? (
          <div
            style={{
              marginTop: "18px",
              maxHeight: "520px",
              overflow: "hidden",
              color: "rgba(15,23,42,0.92)",
            }}
          >
            <BulletRows items={bullets} fontSize={bodySize} lineHeight={lh} maxItems={10} />
          </div>
        ) : body ? (
          <p
            style={{
              margin: 0,
              marginTop: "18px",
              fontSize: bodySize + "px",
              lineHeight: lh,
              whiteSpace: "pre-wrap",
              maxHeight: "520px",
              overflow: "hidden",
              color: "rgba(15,23,42,0.92)",
            }}
          >
            {body}
          </p>
        ) : null}

        {note ? (
          <p
            style={{
              margin: 0,
              marginTop: "14px",
              fontSize: "16px",
              lineHeight: 1.35,
              maxHeight: "70px",
              overflow: "hidden",
              color: "rgba(15,23,42,0.75)",
            }}
          >
            {note}
          </p>
        ) : null}
      </div>

      {hasImg ? (
        <div
          style={{
            position: "absolute",
            ...RIGHT_IMG,
            zIndex: 3,
            background: "#fff",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 1px 8px rgba(15,23,42,0.12)",
          }}
        >
          <img
            src={imgSrc}
            alt={image.__image_prompt__ || ""}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {image.caption ? (
            <p
              style={{
                margin: 0,
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: "8px 10px",
                background: "rgba(255,255,255,0.88)",
                fontSize: "14px",
                color: "rgba(15,23,42,0.8)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {image.caption}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const dynamicSlideLayout = RendererLayout
const DefaultLayout = RendererLayout

export default RendererLayout
