// @ts-nocheck
import * as z from "zod";
import React from "react";
export const layoutId = "bg-slide-26-body";
export const layoutName = "Layout_bg_slide_26_body";
export const layoutDescription = "bg-slide-26-body (gallery_2up_right_light)";


const PresentonImageSchema = z
  .object({
    __image_url__: z.string().default(""),
    __image_prompt__: z
      .string()
      .min(8)
      .max(240)
      .default("")
      .describe(
        "Describe the image to generate/search for. If __image_url__ is empty, __image_prompt__ must be a concrete prompt."
      ),
    src: z.string().default(""),
    caption: z.string().max(70).default(""),
  })
  .superRefine((v, ctx) => {
    const url = (v.__image_url__ || v.src || "").trim()
    const prompt = (v.__image_prompt__ || "").trim()

    if (!url && !prompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Either __image_url__/src must be set OR __image_prompt__ must be non-empty.",
        path: ["__image_prompt__"],
      })
    }
  })

export const Schema = z.object({
  title: z.string().min(2).max(70).default("Titel"),
  body: z.string().min(0).max(900).default(""),
  bullets: z.array(z.string().min(1).max(140)).min(0).max(8).default([]),

  images: z
    .array(PresentonImageSchema)
    .min(2)
    .max(2)
    .describe(
      "Exactly two images: images[0] is the TOP box, images[1] is the BOTTOM box. Provide a distinct __image_prompt__ for both unless you provide __image_url__."
    )
    .default([
      { __image_url__: "", __image_prompt__: "", src: "", caption: "" },
      { __image_url__: "", __image_prompt__: "", src: "", caption: "" },
    ]),
  note: z.string().max(160).default(""),
})

function RendererLayout({ data }) {
  const bgPath = "/static/images/nagarro_fluidic/Folie26.PNG"
  const safe = { left: "5%", top: "12%", right: "5%", bottom: "8%" }
  const d = data || {}
  const title = (d.title || "").toString()
  const body = (d.body || "").toString()
  const bullets = Array.isArray(d.bullets) ? d.bullets.slice(0, 8) : []
  const imagesRaw = Array.isArray(d.images) ? d.images.slice(0, 2) : []
  const images = [
    imagesRaw[0] || { __image_url__: "", __image_prompt__: "", src: "", caption: "" },
    imagesRaw[1] || { __image_url__: "", __image_prompt__: "", src: "", caption: "" },
  ]

  const note = (d.note || "").toString()

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
            style={{
              display: "flex",
              gap: "0.6em",
              alignItems: "flex-start",
            }}
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

  let titleSize = 48
  if (title.length > 42) titleSize = 44
  if (title.length > 60) titleSize = 40

  const text = bullets.length ? bullets.join("\n") : body
  const lines = estLines(text, 60)
  const lh = 1.45
  let bodySize = Math.floor(Math.min(22, 520 / (Math.max(1, lines) * lh)))
  bodySize = Math.max(16, Math.min(22, bodySize))

  const baseHref =
    (typeof document !== "undefined" &&
      document.querySelector("base")?.getAttribute("href")) ||
    ""
  const base = baseHref.endsWith("/") ? baseHref.slice(0, -1) : baseHref
  const bg = base ? base + bgPath : bgPath

  const LEFT = { left: "6%", top: "12%", width: "52%", height: "80%" }
  const BOX1 = { left: "62%", top: "20%", width: "32%", height: "28%" }
  const BOX2 = { left: "62%", top: "56%", width: "32%", height: "28%" }

  function ImgBox({ box, item }) {
    const src = ((item && (item.__image_url__ || item.src)) || "").toString()
    const has = !!src
    return (
      <div
        style={{
          position: "absolute",
          ...box,
          zIndex: 3,
          background: "#fff",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 1px 8px rgba(15,23,42,0.12)",
        }}
      >
        {has ? (
          <img
            src={src}
            alt={(item && item.__image_prompt__) || ""}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(15,23,42,0.55)",
              fontSize: "16px",
            }}
          >
            (Bild)
          </div>
        )}
        {item && item.caption ? (
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
            {item.caption}
          </p>
        ) : null}
      </div>
    )
  }

  const bNorm = normalizeBullets(bullets).slice(0, 8)

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

        {bNorm.length ? (
          <div
            style={{
              marginTop: "18px",
              maxHeight: "520px",
              overflow: "hidden",
              color: "rgba(15,23,42,0.92)",
            }}
          >
            <BulletRows items={bullets} fontSize={bodySize} lineHeight={lh} maxItems={8} />
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

      <ImgBox box={BOX1} item={images[0] || {}} />
      <ImgBox box={BOX2} item={images[1] || {}} />
    </div>
  )
}

const dynamicSlideLayout = RendererLayout
const DefaultLayout = RendererLayout

export default RendererLayout
