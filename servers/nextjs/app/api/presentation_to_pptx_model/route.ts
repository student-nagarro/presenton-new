import { ApiError } from "@/models/errors";
import { NextRequest, NextResponse } from "next/server";
import puppeteer, { Browser, ElementHandle, Page } from "puppeteer";
import {
  ElementAttributes,
  SlideAttributesResult,
} from "@/types/element_attibutes";
import { convertElementAttributesToPptxSlides } from "@/utils/pptx_models_utils";
import { PptxPresentationModel } from "@/types/pptx_models";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface GetAllChildElementsAttributesArgs {
  element: ElementHandle<Element>;
  rootRect?: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
  depth?: number;
  inheritedFont?: ElementAttributes["font"];
  inheritedBackground?: ElementAttributes["background"];
  inheritedBorderRadius?: number[];
  inheritedZIndex?: number;
  inheritedOpacity?: number;
  domPath?: string;
  screenshotsDir: string;
}

function hashStableId(stableId: string): string {
  return createHash("sha256").update(stableId).digest("hex").slice(0, 16);
}

export async function GET(request: NextRequest) {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    const id = await getPresentationId(request);
    [browser, page] = await getBrowserAndPage(id);
    await waitForExportReady(page);
    const screenshotsDir = getScreenshotsDir();

    const { slides, speakerNotes } = await getSlidesAndSpeakerNotes(page);
    const slides_attributes = await getSlidesAttributes(slides, screenshotsDir);
    await postProcessSlidesAttributes(
      slides_attributes,
      screenshotsDir,
      speakerNotes
    );
    const slides_pptx_models =
      convertElementAttributesToPptxSlides(slides_attributes);
    const presentation_pptx_model: PptxPresentationModel = {
      slides: slides_pptx_models,
    };

    await closeBrowserAndPage(browser, page);

    return NextResponse.json(presentation_pptx_model);
  } catch (error: any) {
    console.error(error);
    await closeBrowserAndPage(browser, page);
    if (error instanceof ApiError) {
      return NextResponse.json(error, { status: 400 });
    }
    return NextResponse.json(
      { detail: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}

async function getPresentationId(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    throw new ApiError("Presentation ID not found");
  }
  return id;
}

async function getBrowserAndPage(id: string): Promise<[Browser, Page]> {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
    ],
  });

  const page = await browser.newPage();

  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  page.setDefaultNavigationTimeout(300000);
  page.setDefaultTimeout(300000);
  await page.goto(`http://localhost/pdf-maker?id=${id}`, {
    waitUntil: "networkidle0",
    timeout: 300000,
  });
  return [browser, page];
}

async function waitForExportReady(page: Page) {
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none !important;transition:none !important;}`,
  });
  await page.waitForFunction(
    () => (window as any).__PRESENTON_EXPORT_READY__ === true,
    { timeout: 60000 }
  );
}

async function closeBrowserAndPage(browser: Browser | null, page: Page | null) {
  await page?.close();
  await browser?.close();
}

function getScreenshotsDir() {
  const tempDir = process.env.TEMP_DIRECTORY;
  if (!tempDir) {
    console.warn(
      "TEMP_DIRECTORY environment variable not set, skipping screenshot"
    );
    throw new ApiError("TEMP_DIRECTORY environment variable not set");
  }
  const screenshotsDir = path.join(tempDir, "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  return screenshotsDir;
}

async function postProcessSlidesAttributes(
  slidesAttributes: SlideAttributesResult[],
  screenshotsDir: string,
  speakerNotes: string[]
) {
  for (const [index, slideAttributes] of slidesAttributes.entries()) {
    for (const [elementIndex, element] of slideAttributes.elements.entries()) {
      if (element.should_screenshot) {
        const stableId = element.domPath
          ? `slide${index}-${element.domPath}`
          : `slide${index}-el${elementIndex}`;
        const screenshotPath = await screenshotElement(
          element,
          screenshotsDir,
          stableId
        );
        element.imageSrc = screenshotPath;
        element.should_screenshot = false;
        element.objectFit = "cover";
        element.element = undefined;
      }
    }
    slideAttributes.speakerNote = speakerNotes[index];
  }
}

async function screenshotElement(
  element: ElementAttributes,
  screenshotsDir: string,
  stableId?: string
) {
  const safeId = stableId ? hashStableId(stableId) : uuidv4();
  const screenshotPath = path.join(
    screenshotsDir,
    `${safeId}.png`
  ) as `${string}.png`;

  // For SVG elements, use convertSvgToPng
  if (element.tagName === "svg") {
    const pngBuffer = await convertSvgToPng(element);
    fs.writeFileSync(screenshotPath, pngBuffer);
    return screenshotPath;
  }

  // Hide all elements except the target element and its ancestors
  await element.element?.evaluate(
    (el) => {
      const originalOpacities = new Map();

      const hideAllExcept = (targetElement: Element) => {
        const allElements = document.querySelectorAll("*");

        allElements.forEach((elem) => {
          const computedStyle = window.getComputedStyle(elem);
          originalOpacities.set(elem, computedStyle.opacity);

          if (
            targetElement === elem ||
            targetElement.contains(elem) ||
            elem.contains(targetElement)
          ) {
            (elem as HTMLElement).style.opacity = computedStyle.opacity || "1";
            return;
          }

          (elem as HTMLElement).style.opacity = "0";
        });
      };

      hideAllExcept(el);

      (el as any).__restoreStyles = () => {
        originalOpacities.forEach((opacity, elem) => {
          (elem as HTMLElement).style.opacity = opacity;
        });
      };
    },
    element.opacity,
    element.font?.color
  );

  const screenshot = await element.element?.screenshot({
    path: screenshotPath,
  });
  if (!screenshot) {
    throw new ApiError("Failed to screenshot element");
  }

  await element.element?.evaluate((el) => {
    if ((el as any).__restoreStyles) {
      (el as any).__restoreStyles();
    }
  });

  return screenshotPath;
}

const convertSvgToPng = async (element_attibutes: ElementAttributes) => {
  const svgHtml =
    (await element_attibutes.element?.evaluate((el) => {
      // Apply font color
      const fontColor = window.getComputedStyle(el).color;
      (el as HTMLElement).style.color = fontColor;

      return el.outerHTML;
    })) || "";

  const svgBuffer = Buffer.from(svgHtml);
  const pngBuffer = await sharp(svgBuffer)
    .resize(
      Math.round(element_attibutes.position!.width!),
      Math.round(element_attibutes.position!.height!)
    )
    .toFormat("png")
    .toBuffer();
  return pngBuffer;
};

async function getSlidesAttributes(
  slides: ElementHandle<Element>[],
  screenshotsDir: string
): Promise<SlideAttributesResult[]> {
  const slideAttributes = await Promise.all(
    slides.map((slide) =>
      getAllChildElementsAttributes({ element: slide, screenshotsDir })
    )
  );
  return slideAttributes;
}

async function getSlidesAndSpeakerNotes(page: Page) {
  const slides_wrapper = await getSlidesWrapper(page);
  const speakerNotes = await getSpeakerNotes(slides_wrapper);
  const slides = await slides_wrapper.$$(":scope > div > div");
  return { slides, speakerNotes };
}

async function getSlidesWrapper(page: Page): Promise<ElementHandle<Element>> {
  const slides_wrapper = await page.$("#presentation-slides-wrapper");
  if (!slides_wrapper) {
    throw new ApiError("Presentation slides not found");
  }
  return slides_wrapper;
}

async function getSpeakerNotes(slides_wrapper: ElementHandle<Element>) {
  return await slides_wrapper.evaluate((el) => {
    return Array.from(el.querySelectorAll("[data-speaker-note]")).map(
      (el) => el.getAttribute("data-speaker-note") || ""
    );
  });
}

async function getAllChildElementsAttributes({
  element,
  rootRect = null,
  depth = 0,
  inheritedFont,
  inheritedBackground,
  inheritedBorderRadius,
  inheritedZIndex,
  inheritedOpacity,
  domPath = "",
  screenshotsDir,
}: GetAllChildElementsAttributesArgs): Promise<SlideAttributesResult> {
  if (!rootRect) {
    const rootAttributes = await getElementAttributes(element);
    inheritedFont = rootAttributes.font;
    inheritedBackground = rootAttributes.background;
    inheritedZIndex = rootAttributes.zIndex;
    inheritedOpacity = rootAttributes.opacity;
    rootRect = {
      left: rootAttributes.position?.left ?? 0,
      top: rootAttributes.position?.top ?? 0,
      width: rootAttributes.position?.width ?? 1280,
      height: rootAttributes.position?.height ?? 720,
    };
  }

  const directChildElementHandles = await element.$$(":scope > *");

  const allResults: { attributes: ElementAttributes; depth: number }[] = [];

  for (const [childIndex, childElementHandle] of directChildElementHandles.entries()) {
    const childDomPath = domPath ? `${domPath}.${childIndex}` : `${childIndex}`;
    const attributes = await getElementAttributes(childElementHandle);
    attributes.domPath = childDomPath;
    attributes.depth = depth;

    if (
      ["style", "script", "link", "meta", "path"].includes(attributes.tagName)
    ) {
      continue;
    }

    const bulletOnlyText = attributes.innerText?.trim();
    if (
      attributes.isListItem &&
      bulletOnlyText &&
      (bulletOnlyText === "\u2022" || bulletOnlyText === "\u00B7")
    ) {
      continue;
    }

    if (
      inheritedFont &&
      !attributes.font &&
      attributes.innerText &&
      attributes.innerText.trim().length > 0
    ) {
      attributes.font = inheritedFont;
    }
    if (inheritedBackground && !attributes.background && attributes.shadow) {
      attributes.background = inheritedBackground;
    }
    if (inheritedBorderRadius && !attributes.borderRadius) {
      attributes.borderRadius = inheritedBorderRadius;
    }
    if (inheritedZIndex !== undefined && attributes.zIndex === 0) {
      attributes.zIndex = inheritedZIndex;
    }
    if (
      inheritedOpacity !== undefined &&
      (attributes.opacity === undefined || attributes.opacity === 1)
    ) {
      attributes.opacity = inheritedOpacity;
    }

    if (
      attributes.position &&
      attributes.position.left !== undefined &&
      attributes.position.top !== undefined
    ) {
      attributes.position = {
        left: attributes.position.left - rootRect!.left,
        top: attributes.position.top - rootRect!.top,
        width: attributes.position.width,
        height: attributes.position.height,
      };
    }

    // Ignore elements with no size (width or height)
    if (
      attributes.position === undefined ||
      attributes.position.width === undefined ||
      attributes.position.height === undefined ||
      attributes.position.width === 0 ||
      attributes.position.height === 0
    ) {
      continue;
    }

    // If element is paragraph and contains only inline formatting tags, don't go deeper
    if (attributes.tagName === "p") {
      const innerElementTagNames = await childElementHandle.evaluate((el) => {
        return Array.from(el.querySelectorAll("*")).map((e) =>
          e.tagName.toLowerCase()
        );
      });

      const allowedInlineTags = new Set(["strong", "u", "em", "code", "s"]);
      const hasOnlyAllowedInlineTags = innerElementTagNames.every((tag) =>
        allowedInlineTags.has(tag)
      );

      if (innerElementTagNames.length > 0 && hasOnlyAllowedInlineTags) {
        attributes.innerText = await childElementHandle.evaluate((el) => {
          return el.innerHTML;
        });
        allResults.push({ attributes, depth });
        continue;
      }
    }

    if (
      attributes.tagName === "svg" ||
      attributes.tagName === "canvas" ||
      attributes.tagName === "table"
    ) {
      attributes.should_screenshot = true;
      attributes.element = childElementHandle;
    }

    allResults.push({ attributes, depth });

    // If the element is a canvas, or table, we don't need to go deeper
    if (attributes.should_screenshot && attributes.tagName !== "svg") {
      continue;
    }

    const childResults = await getAllChildElementsAttributes({
      element: childElementHandle,
      rootRect: rootRect,
      depth: depth + 1,
      domPath: childDomPath,
      inheritedFont: attributes.font || inheritedFont,
      inheritedBackground: attributes.background || inheritedBackground,
      inheritedBorderRadius: attributes.borderRadius || inheritedBorderRadius,
      inheritedZIndex: attributes.zIndex || inheritedZIndex,
      inheritedOpacity: attributes.opacity || inheritedOpacity,
      screenshotsDir,
    });
    allResults.push(
      ...childResults.elements.map((attr) => ({
        attributes: {
          ...attr,
          depth: depth + 1,
        },
        depth: depth + 1,
      }))
    );
  }

  let backgroundColor = inheritedBackground?.color;
  if (depth === 0) {
    const elementsWithRootPosition = allResults.filter(({ attributes }) => {
      return (
        attributes.position &&
        attributes.position.left === 0 &&
        attributes.position.top === 0 &&
        attributes.position.width === rootRect!.width &&
        attributes.position.height === rootRect!.height
      );
    });

    for (const { attributes } of elementsWithRootPosition) {
      if (attributes.background && attributes.background.color) {
        backgroundColor = attributes.background.color;
        break;
      }
    }
  }

  const filteredResults =
    depth === 0
      ? allResults.filter(({ attributes }) => {
          const hasBackground =
            attributes.background && attributes.background.color;
          const hasBorder = attributes.border && attributes.border.color;
          const hasShadow = attributes.shadow && attributes.shadow.color;
          const hasText =
            attributes.innerText && attributes.innerText.trim().length > 0;
          const hasImage = attributes.imageSrc;
          const isSvg = attributes.tagName === "svg";
          const isCanvas = attributes.tagName === "canvas";
          const isTable = attributes.tagName === "table";

          const occupiesRoot =
            attributes.position &&
            attributes.position.left === 0 &&
            attributes.position.top === 0 &&
            attributes.position.width === rootRect!.width &&
            attributes.position.height === rootRect!.height;

          const hasVisualProperties =
            hasBackground || hasBorder || hasShadow || hasText;
          const hasSpecialContent = hasImage || isSvg || isCanvas || isTable;

          return (hasVisualProperties && !occupiesRoot) || hasSpecialContent;
        })
      : allResults;

  if (depth === 0) {
    const mergeBulletMarkers = (
      results: { attributes: ElementAttributes; depth: number }[]
    ) => {
      const getMarkerInfo = (attr: ElementAttributes) => {
        if (!attr.innerText || !attr.position) return null;
        if (attr.isListItem) return null;

        const trimmed = attr.innerText.replace(/\u00A0/g, " ").trim();
        if (!trimmed) return null;

        const pos = attr.position;
        if (pos.width === undefined || pos.height === undefined) {
          return null;
        }

        let type: "ul" | "ol" | null = null;
        let listItemIndex: number | undefined;

        const normalized = trimmed === "â€¢" ? "•" : trimmed;
        const numMatch = normalized.match(/^(\d+)[\.\)]$/);
        if (numMatch) {
          type = "ol";
          const num = parseInt(numMatch[1], 10);
          listItemIndex = isNaN(num) ? undefined : Math.max(0, num - 1);
        } else if (/^[\u2022\u00B7-]$/.test(normalized)) {
          type = "ul";
        }

        if (!type) return null;

        const fontSize = attr.font?.size ?? 14;
        const maxWidth = Math.max(fontSize * 2.2, 24);
        const maxHeight = Math.max(fontSize * 2.5, 30);

        if (pos.width > maxWidth || pos.height > maxHeight) {
          return null;
        }

        return { type, listItemIndex };
      };

      const markers = results
        .map((entry, index) => {
          const info = getMarkerInfo(entry.attributes);
          if (!info) return null;
          return { index, attributes: entry.attributes, info };
        })
        .filter(Boolean) as {
        index: number;
        attributes: ElementAttributes;
        info: { type: "ul" | "ol"; listItemIndex?: number };
      }[];

      if (markers.length < 2) {
        return results;
      }

      const bucketSize = 20;
      const markerBuckets = new Map<number, number>();
      for (const marker of markers) {
        const left = marker.attributes.position?.left ?? 0;
        const bucket = Math.round(left / bucketSize);
        markerBuckets.set(bucket, (markerBuckets.get(bucket) ?? 0) + 1);
      }

      const removed = new Set<number>();
      const usedTargets = new Set<number>();

      for (const marker of markers) {
        if (!marker.attributes.position) continue;

        const markerPos = marker.attributes.position;
        if (markerPos.left === undefined) continue;
        if (markerPos.top === undefined || markerPos.height === undefined) continue;
        if (markerPos.width === undefined) continue;

        const bucket = Math.round(markerPos.left / bucketSize);
        if ((markerBuckets.get(bucket) ?? 0) < 2) {
          continue;
        }

        const markerCenterY = markerPos.top + markerPos.height / 2;
        const yTolerance = Math.max(markerPos.height * 0.6, 6);

        let bestIndex = -1;
        let bestDx = Number.POSITIVE_INFINITY;

        for (let i = 0; i < results.length; i++) {
          if (i === marker.index || removed.has(i) || usedTargets.has(i)) {
            continue;
          }

          const candidate = results[i].attributes;
          if (!candidate.position || !candidate.innerText) continue;
          if (candidate.isListItem) continue;

          const candidateText = candidate.innerText.trim();
          if (!candidateText) continue;
          if (getMarkerInfo(candidate)) continue;

          const candidatePos = candidate.position;
          if (
            candidatePos.left === undefined ||
            candidatePos.top === undefined ||
            candidatePos.height === undefined ||
            candidatePos.width === undefined
          ) {
            continue;
          }

          const dx = candidatePos.left - markerPos.left;
          if (dx <= 0) continue;

          const maxDx = Math.max(markerPos.width * 8, 200);
          if (dx > maxDx) continue;

          const candidateCenterY =
            candidatePos.top + candidatePos.height / 2;
          if (Math.abs(candidateCenterY - markerCenterY) > yTolerance) {
            continue;
          }

          if (dx < bestDx) {
            bestDx = dx;
            bestIndex = i;
          }
        }

        if (bestIndex === -1) continue;

        const target = results[bestIndex].attributes;
        if (!target.position) continue;

        const targetPos = target.position;
        if (targetPos.left === undefined || targetPos.width === undefined) {
          continue;
        }

        const dx = targetPos.left - markerPos.left;
        targetPos.left = markerPos.left;
        targetPos.width += dx;

        target.isListItem = true;
        target.listType = marker.info.type;
        target.listLevel = 0;
        target.listIndent = dx;
        target.listHanging = dx;
        if (marker.info.type === "ol") {
          target.listItemIndex = marker.info.listItemIndex;
        }

        removed.add(marker.index);
        usedTargets.add(bestIndex);
      }

      return results.filter((_, index) => !removed.has(index));
    };

    const mergedResults = mergeBulletMarkers(filteredResults);
    const sortedElements = mergedResults
      .sort((a, b) => {
        const epsilon = 1;
        const posA = a.attributes.position;
        const posB = b.attributes.position;
        const isFullBleedA = !!(
          posA &&
          rootRect &&
          Math.abs((posA.left ?? 0) - 0) <= epsilon &&
          Math.abs((posA.top ?? 0) - 0) <= epsilon &&
          Math.abs((posA.width ?? 0) - rootRect.width) <= epsilon &&
          Math.abs((posA.height ?? 0) - rootRect.height) <= epsilon
        );
        const isFullBleedB = !!(
          posB &&
          rootRect &&
          Math.abs((posB.left ?? 0) - 0) <= epsilon &&
          Math.abs((posB.top ?? 0) - 0) <= epsilon &&
          Math.abs((posB.width ?? 0) - rootRect.width) <= epsilon &&
          Math.abs((posB.height ?? 0) - rootRect.height) <= epsilon
        );
        const isImageA =
          !!a.attributes.imageSrc ||
          a.attributes.tagName === "img" ||
          (typeof a.attributes.className === "string" &&
            a.attributes.className.includes("image"));
        const isImageB =
          !!b.attributes.imageSrc ||
          b.attributes.tagName === "img" ||
          (typeof b.attributes.className === "string" &&
            b.attributes.className.includes("image"));
        const isBackgroundA = isImageA && isFullBleedA;
        const isBackgroundB = isImageB && isFullBleedB;

        if (isBackgroundA !== isBackgroundB) {
          return isBackgroundA ? -1 : 1;
        }

        const zIndexA = a.attributes.zIndex || 0;
        const zIndexB = b.attributes.zIndex || 0;

        if (zIndexA !== zIndexB) {
          return zIndexA - zIndexB;
        }

        const depthDiff = a.depth - b.depth;
        if (depthDiff !== 0) {
          return depthDiff;
        }

        const domPathA = a.attributes.domPath || "";
        const domPathB = b.attributes.domPath || "";
        if (domPathA !== domPathB) {
          return domPathA.localeCompare(domPathB);
        }

        const idA = a.attributes.id || "";
        const idB = b.attributes.id || "";
        if (idA !== idB) {
          return idA.localeCompare(idB);
        }

        return 0;
      })
      .map(({ attributes }) => {
        if (
          attributes.shadow &&
          attributes.shadow.color &&
          (!attributes.background || !attributes.background.color) &&
          backgroundColor
        ) {
          attributes.background = {
            color: backgroundColor,
            opacity: undefined,
          };
        }
        return attributes;
      });

    return {
      elements: sortedElements,
      backgroundColor,
    };
  } else {
    return {
      elements: filteredResults.map(({ attributes }) => attributes),
      backgroundColor,
    };
  }
}

async function getElementAttributes(
  element: ElementHandle<Element>
): Promise<ElementAttributes> {
  const attributes = await element.evaluate((el: Element) => {
    function colorToHex(color: string): {
      hex: string | undefined;
      opacity: number | undefined;
    } {
      if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") {
        return { hex: undefined, opacity: undefined };
      }

      if (color.startsWith("rgba(") || color.startsWith("hsla(")) {
        const match = color.match(/rgba?\(([^)]+)\)|hsla?\(([^)]+)\)/);
        if (match) {
          const values = match[1] || match[2];
          const parts = values.split(",").map((part) => part.trim());

          if (parts.length >= 4) {
            const opacity = parseFloat(parts[3]);
            const rgbColor = color
              .replace(/rgba?\(|hsla?\(|\)/g, "")
              .split(",")
              .slice(0, 3)
              .join(",");
            const rgbString = color.startsWith("rgba")
              ? `rgb(${rgbColor})`
              : `hsl(${rgbColor})`;

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = rgbString;
              const hexColor = ctx.fillStyle;
              const hex = hexColor.startsWith("#")
                ? hexColor.substring(1)
                : hexColor;
              const result = {
                hex,
                opacity: isNaN(opacity) ? undefined : opacity,
              };

              return result;
            }
          }
        }
      }

      if (color.startsWith("rgb(") || color.startsWith("hsl(")) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = color;
          const hexColor = ctx.fillStyle;
          const hex = hexColor.startsWith("#")
            ? hexColor.substring(1)
            : hexColor;
          return { hex, opacity: undefined };
        }
      }

      if (color.startsWith("#")) {
        const hex = color.substring(1);
        return { hex, opacity: undefined };
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return { hex: color, opacity: undefined };

      ctx.fillStyle = color;
      const hexColor = ctx.fillStyle;
      const hex = hexColor.startsWith("#") ? hexColor.substring(1) : hexColor;
      const result = { hex, opacity: undefined };

      return result;
    }

    function hasOnlyTextNodes(el: Element): boolean {
      const children = el.childNodes;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.nodeType === Node.ELEMENT_NODE) {
          return false;
        }
      }
      return true;
    }

    function parsePosition(el: Element) {
      const rect = el.getBoundingClientRect();
      return {
        left: isFinite(rect.left) ? rect.left : 0,
        top: isFinite(rect.top) ? rect.top : 0,
        width: isFinite(rect.width) ? rect.width : 0,
        height: isFinite(rect.height) ? rect.height : 0,
      };
    }

    function parseBackground(computedStyles: CSSStyleDeclaration) {
      const backgroundColorResult = colorToHex(computedStyles.backgroundColor);

      const background = {
        color: backgroundColorResult.hex,
        opacity: backgroundColorResult.opacity,
      };

      // Return undefined if background has no meaningful values
      if (!background.color && background.opacity === undefined) {
        return undefined;
      }

      return background;
    }

    function parseBackgroundImage(computedStyles: CSSStyleDeclaration) {
      const backgroundImage = computedStyles.backgroundImage;

      if (!backgroundImage || backgroundImage === "none") {
        return undefined;
      }

      // Extract URL from background-image style
      const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
      }

      return undefined;
    }

    function parseBorder(computedStyles: CSSStyleDeclaration) {
      const borderColorResult = colorToHex(computedStyles.borderColor);
      const borderWidth = parseFloat(computedStyles.borderWidth);

      if (borderWidth === 0) {
        return undefined;
      }

      const border = {
        color: borderColorResult.hex,
        width: isNaN(borderWidth) ? undefined : borderWidth,
        opacity: borderColorResult.opacity,
      };

      // Return undefined if border has no meaningful values
      if (
        !border.color &&
        border.width === undefined &&
        border.opacity === undefined
      ) {
        return undefined;
      }

      return border;
    }

    function parseShadow(computedStyles: CSSStyleDeclaration) {
      const boxShadow = computedStyles.boxShadow;
      if (boxShadow !== "none") {
      }
      let shadow: {
        offset?: [number, number];
        color?: string;
        opacity?: number;
        radius?: number;
        angle?: number;
        spread?: number;
        inset?: boolean;
      } = {};

      if (boxShadow && boxShadow !== "none") {
        const shadows: string[] = [];
        let currentShadow = "";
        let parenCount = 0;

        for (let i = 0; i < boxShadow.length; i++) {
          const char = boxShadow[i];
          if (char === "(") {
            parenCount++;
          } else if (char === ")") {
            parenCount--;
          } else if (char === "," && parenCount === 0) {
            shadows.push(currentShadow.trim());
            currentShadow = "";
            continue;
          }
          currentShadow += char;
        }

        if (currentShadow.trim()) {
          shadows.push(currentShadow.trim());
        }

        let selectedShadow = "";
        let bestShadowScore = -1;

        for (let i = 0; i < shadows.length; i++) {
          const shadowStr = shadows[i];

          const shadowParts = shadowStr.split(" ");
          const numericParts: number[] = [];
          const colorParts: string[] = [];
          let isInset = false;
          let currentColor = "";
          let inColorFunction = false;

          for (let j = 0; j < shadowParts.length; j++) {
            const part = shadowParts[j];
            const trimmedPart = part.trim();
            if (trimmedPart === "") continue;

            if (trimmedPart.toLowerCase() === "inset") {
              isInset = true;
              continue;
            }

            if (trimmedPart.match(/^(rgba?|hsla?)\s*\(/i)) {
              inColorFunction = true;
              currentColor = trimmedPart;
              continue;
            }

            if (inColorFunction) {
              currentColor += " " + trimmedPart;

              const openParens = (currentColor.match(/\(/g) || []).length;
              const closeParens = (currentColor.match(/\)/g) || []).length;

              if (openParens <= closeParens) {
                colorParts.push(currentColor);
                currentColor = "";
                inColorFunction = false;
              }
              continue;
            }

            const numericValue = parseFloat(trimmedPart);
            if (!isNaN(numericValue)) {
              numericParts.push(numericValue);
            } else {
              colorParts.push(trimmedPart);
            }
          }

          let hasVisibleColor = false;
          if (colorParts.length > 0) {
            const shadowColor = colorParts.join(" ");
            const colorResult = colorToHex(shadowColor);
            hasVisibleColor = !!(
              colorResult.hex &&
              colorResult.hex !== "000000" &&
              colorResult.opacity !== 0
            );
          }

          const hasNonZeroValues = numericParts.some((value) => value !== 0);

          let shadowScore = 0;
          if (hasNonZeroValues) {
            shadowScore += numericParts.filter((value) => value !== 0).length;
          }
          if (hasVisibleColor) {
            shadowScore += 2;
          }

          if (
            (hasNonZeroValues || hasVisibleColor) &&
            shadowScore > bestShadowScore
          ) {
            selectedShadow = shadowStr;
            bestShadowScore = shadowScore;
          }
        }

        if (!selectedShadow && shadows.length > 0) {
          selectedShadow = shadows[0];
        }

        if (selectedShadow) {
          const shadowParts = selectedShadow.split(" ");
          const numericParts: number[] = [];
          const colorParts: string[] = [];
          let isInset = false;
          let currentColor = "";
          let inColorFunction = false;

          for (let i = 0; i < shadowParts.length; i++) {
            const part = shadowParts[i];
            const trimmedPart = part.trim();
            if (trimmedPart === "") continue;

            if (trimmedPart.toLowerCase() === "inset") {
              isInset = true;
              continue;
            }

            if (trimmedPart.match(/^(rgba?|hsla?)\s*\(/i)) {
              inColorFunction = true;
              currentColor = trimmedPart;
              continue;
            }

            if (inColorFunction) {
              currentColor += " " + trimmedPart;

              const openParens = (currentColor.match(/\(/g) || []).length;
              const closeParens = (currentColor.match(/\)/g) || []).length;

              if (openParens <= closeParens) {
                colorParts.push(currentColor);
                currentColor = "";
                inColorFunction = false;
              }
              continue;
            }

            const numericValue = parseFloat(trimmedPart);
            if (!isNaN(numericValue)) {
              numericParts.push(numericValue);
            } else {
              colorParts.push(trimmedPart);
            }
          }

          if (numericParts.length >= 2) {
            const offsetX = numericParts[0];
            const offsetY = numericParts[1];
            const blurRadius = numericParts.length >= 3 ? numericParts[2] : 0;
            const spreadRadius = numericParts.length >= 4 ? numericParts[3] : 0;

            // Only create shadow if color is present
            if (colorParts.length > 0) {
              const shadowColor = colorParts.join(" ");
              const shadowColorResult = colorToHex(shadowColor);

              if (shadowColorResult.hex) {
                shadow = {
                  offset: [offsetX, offsetY],
                  color: shadowColorResult.hex,
                  opacity: shadowColorResult.opacity,
                  radius: blurRadius,
                  spread: spreadRadius,
                  inset: isInset,
                  angle: Math.atan2(offsetY, offsetX) * (180 / Math.PI),
                };
              }
            }
          }
        }
      }

      // Return undefined if shadow is empty (no meaningful values)
      if (Object.keys(shadow).length === 0) {
        return undefined;
      }

      return shadow;
    }

    function parseFont(computedStyles: CSSStyleDeclaration) {
      const fontSize = parseFloat(computedStyles.fontSize);
      const fontWeight = parseInt(computedStyles.fontWeight);
      const fontColorResult = colorToHex(computedStyles.color);
      const fontFamily = computedStyles.fontFamily;
      const fontStyle = computedStyles.fontStyle;

      let fontName = undefined;
      if (fontFamily !== "initial") {
        const firstFont = fontFamily.split(",")[0].trim().replace(/['"]/g, "");
        fontName = firstFont;
      }

      const font = {
        name: fontName,
        family: fontFamily,
        size: isNaN(fontSize) ? undefined : fontSize,
        weight: isNaN(fontWeight) ? undefined : fontWeight,
        color: fontColorResult.hex,
        italic: fontStyle === "italic",
      };

      // Return undefined if font has no meaningful values
      if (
        !font.name &&
        font.size === undefined &&
        font.weight === undefined &&
        !font.color &&
        !font.italic
      ) {
        return undefined;
      }

      return font;
    }

    function parseLineHeight(computedStyles: CSSStyleDeclaration, el: Element) {
      const lineHeight = computedStyles.lineHeight;
      const innerText = el.textContent || "";

      const htmlEl = el as HTMLElement;

      const fontSize = parseFloat(computedStyles.fontSize);
      const computedLineHeight = parseFloat(computedStyles.lineHeight);

      const singleLineHeight = !isNaN(computedLineHeight)
        ? computedLineHeight
        : fontSize * 1.2;

      const hasExplicitLineBreaks =
        innerText.includes("\n") ||
        innerText.includes("\r") ||
        innerText.includes("\r\n");
      const hasTextWrapping = htmlEl.offsetHeight > singleLineHeight * 2;
      const hasOverflow = htmlEl.scrollHeight > htmlEl.clientHeight;

      const isMultiline =
        hasExplicitLineBreaks || hasTextWrapping || hasOverflow;

      if (isMultiline && lineHeight && lineHeight !== "normal") {
        const parsedLineHeight = parseFloat(lineHeight);
        if (!isNaN(parsedLineHeight)) {
          return parsedLineHeight;
        }
      }

      return undefined;
    }

    function parseMargin(computedStyles: CSSStyleDeclaration) {
      const marginTop = parseFloat(computedStyles.marginTop);
      const marginBottom = parseFloat(computedStyles.marginBottom);
      const marginLeft = parseFloat(computedStyles.marginLeft);
      const marginRight = parseFloat(computedStyles.marginRight);
      const marginObj = {
        top: isNaN(marginTop) ? undefined : marginTop,
        bottom: isNaN(marginBottom) ? undefined : marginBottom,
        left: isNaN(marginLeft) ? undefined : marginLeft,
        right: isNaN(marginRight) ? undefined : marginRight,
      };

      return marginObj.top === 0 &&
        marginObj.bottom === 0 &&
        marginObj.left === 0 &&
        marginObj.right === 0
        ? undefined
        : marginObj;
    }

    function parsePadding(computedStyles: CSSStyleDeclaration) {
      const paddingTop = parseFloat(computedStyles.paddingTop);
      const paddingBottom = parseFloat(computedStyles.paddingBottom);
      const paddingLeft = parseFloat(computedStyles.paddingLeft);
      const paddingRight = parseFloat(computedStyles.paddingRight);
      const paddingObj = {
        top: isNaN(paddingTop) ? undefined : paddingTop,
        bottom: isNaN(paddingBottom) ? undefined : paddingBottom,
        left: isNaN(paddingLeft) ? undefined : paddingLeft,
        right: isNaN(paddingRight) ? undefined : paddingRight,
      };

      return paddingObj.top === 0 &&
        paddingObj.bottom === 0 &&
        paddingObj.left === 0 &&
        paddingObj.right === 0
        ? undefined
        : paddingObj;
    }

    function parseBorderRadius(
      computedStyles: CSSStyleDeclaration,
      el: Element
    ) {
      const borderRadius = computedStyles.borderRadius;
      let borderRadiusValue;

      if (borderRadius && borderRadius !== "0px") {
        const radiusParts = borderRadius
          .split(" ")
          .map((part) => parseFloat(part));
        if (radiusParts.length === 1) {
          borderRadiusValue = [
            radiusParts[0],
            radiusParts[0],
            radiusParts[0],
            radiusParts[0],
          ];
        } else if (radiusParts.length === 2) {
          borderRadiusValue = [
            radiusParts[0],
            radiusParts[1],
            radiusParts[0],
            radiusParts[1],
          ];
        } else if (radiusParts.length === 3) {
          borderRadiusValue = [
            radiusParts[0],
            radiusParts[1],
            radiusParts[2],
            radiusParts[1],
          ];
        } else if (radiusParts.length === 4) {
          borderRadiusValue = radiusParts;
        }

        // Clamp border radius values to be between 0 and half the width/height
        if (borderRadiusValue) {
          const rect = el.getBoundingClientRect();
          const maxRadiusX = rect.width / 2;
          const maxRadiusY = rect.height / 2;

          borderRadiusValue = borderRadiusValue.map((radius, index) => {
            // For top-left and bottom-right corners, use maxRadiusX
            // For top-right and bottom-left corners, use maxRadiusY
            const maxRadius =
              index === 0 || index === 2 ? maxRadiusX : maxRadiusY;
            return Math.max(0, Math.min(radius, maxRadius));
          });
        }
      }

      return borderRadiusValue;
    }

    function parseShape(el: Element, borderRadiusValue: number[] | undefined) {
      if (el.tagName.toLowerCase() === "img") {
        return borderRadiusValue &&
          borderRadiusValue.length === 4 &&
          borderRadiusValue.every((radius: number) => radius === 50)
          ? "circle"
          : "rectangle";
      }
      return undefined;
    }

    function parseFilters(computedStyles: CSSStyleDeclaration) {
      const filter = computedStyles.filter;
      if (!filter || filter === "none") {
        return undefined;
      }

      const filters: {
        invert?: number;
        brightness?: number;
        contrast?: number;
        saturate?: number;
        hueRotate?: number;
        blur?: number;
        grayscale?: number;
        sepia?: number;
        opacity?: number;
      } = {};

      // Parse filter functions
      const filterFunctions = filter.match(/[a-zA-Z]+\([^)]*\)/g);
      if (filterFunctions) {
        filterFunctions.forEach((func) => {
          const match = func.match(/([a-zA-Z]+)\(([^)]*)\)/);
          if (match) {
            const filterType = match[1];
            const value = parseFloat(match[2]);

            if (!isNaN(value)) {
              switch (filterType) {
                case "invert":
                  filters.invert = value;
                  break;
                case "brightness":
                  filters.brightness = value;
                  break;
                case "contrast":
                  filters.contrast = value;
                  break;
                case "saturate":
                  filters.saturate = value;
                  break;
                case "hue-rotate":
                  filters.hueRotate = value;
                  break;
                case "blur":
                  filters.blur = value;
                  break;
                case "grayscale":
                  filters.grayscale = value;
                  break;
                case "sepia":
                  filters.sepia = value;
                  break;
                case "opacity":
                  filters.opacity = value;
                  break;
              }
            }
          }
        });
      }

      // Return undefined if no filters were parsed
      return Object.keys(filters).length > 0 ? filters : undefined;
    }

    function parseListInfo(el: Element) {
      const liEl = el.closest("li");
        if (!liEl) {
          return {
            isListItem: false,
            listType: undefined,
            listLevel: undefined,
            listStyleType: undefined,
            listStylePosition: undefined,
            listIndent: undefined,
            listHanging: undefined,
            listItemIndex: undefined,
          };
        }

      const listEl = liEl.closest("ul,ol");
      const listType = listEl ? listEl.tagName.toLowerCase() : undefined;
      const listStyles = listEl ? window.getComputedStyle(listEl) : undefined;
      const listStyleType = listStyles?.listStyleType;
      const listStylePosition = listStyles?.listStylePosition as
        | "inside"
        | "outside"
        | undefined;

      const wrapper = document.getElementById("presentation-slides-wrapper");
      let listLevelCount = 0;
      let listIndentPx = 0;
      let currentList = listEl;

      while (currentList && (!wrapper || wrapper.contains(currentList))) {
        listLevelCount += 1;
        const cs = window.getComputedStyle(currentList);
        const paddingLeft = parseFloat(cs.paddingLeft || "0");
        const marginLeft = parseFloat(cs.marginLeft || "0");
        listIndentPx += (isNaN(paddingLeft) ? 0 : paddingLeft) + (isNaN(marginLeft) ? 0 : marginLeft);
        const nextParent = currentList.parentElement;
        currentList = nextParent ? nextParent.closest("ul,ol") : null;
      }

      const listLevel = Math.max(0, listLevelCount - 1);

      let listItemIndex: number | undefined;
      const parent = liEl.parentElement;
      if (parent) {
        const items = Array.from(parent.children).filter(
          (child) => (child as HTMLElement).tagName?.toLowerCase() === "li"
        );
        const index = items.indexOf(liEl);
        listItemIndex = index >= 0 ? index : undefined;
      }

        return {
          isListItem: true,
          listType: listType as "ul" | "ol" | undefined,
          listLevel,
          listStyleType: listStyleType || undefined,
          listStylePosition,
          listIndent: listIndentPx > 0 ? listIndentPx : undefined,
          listHanging: undefined,
          listItemIndex,
        };
      }

    function parsePrefixListFallback(el: Element) {
      const rawText = el.textContent || "";
      const trimmed = rawText.replace(/^\s+/, "");
      if (!trimmed) {
        return null;
      }

      const bulletMatch = trimmed.match(/^[\u2022\u00B7]\s+/);
      const dashMatch = trimmed.match(/^-\\s+/);
      const numMatch = trimmed.match(/^(\\d+)[\\.)]\\s+/);

      const type = numMatch ? "ol" : bulletMatch || dashMatch ? "ul" : null;
      if (!type) {
        return null;
      }

      const parent = el.parentElement;
      if (!parent) {
        return null;
      }

      const siblings = Array.from(parent.children).filter(
        (child) => child.nodeType === Node.ELEMENT_NODE
      );

      let matchCount = 0;
      let matchedIndex = -1;
      for (const sibling of siblings) {
        const siblingText = (sibling.textContent || "").replace(/^\s+/, "");
        if (!siblingText) continue;

        const siblingBullet = siblingText.match(/^[\u2022\u00B7]\s+/);
        const siblingDash = siblingText.match(/^-\\s+/);
        const siblingNum = siblingText.match(/^(\\d+)[\\.)]\\s+/);
        const siblingType = siblingNum
          ? "ol"
          : siblingBullet || siblingDash
          ? "ul"
          : null;

        if (siblingType && siblingType === type) {
          if (sibling === el) {
            matchedIndex = matchCount;
          }
          matchCount += 1;
        }
      }

      if (matchCount < 2) {
        return null;
      }

      const numberMatch = numMatch ? parseInt(numMatch[1], 10) : undefined;

        return {
          isListItem: true,
          listType: type as "ul" | "ol",
          listLevel: 0,
          listStyleType: type === "ol" ? "decimal" : "disc",
          listStylePosition: undefined,
          listIndent: undefined,
          listHanging: undefined,
          listItemIndex:
            type === "ol"
              ? numberMatch && numberMatch > 0
                ? numberMatch - 1
                : matchedIndex >= 0
              ? matchedIndex
              : undefined
            : undefined,
      };
    }

    function parseElementAttributes(el: Element) {
      let tagName = el.tagName.toLowerCase();

      const computedStyles = window.getComputedStyle(el);

      const position = parsePosition(el);

      const shadow = parseShadow(computedStyles);

      const background = parseBackground(computedStyles);

      const border = parseBorder(computedStyles);

      const font = parseFont(computedStyles);

      const lineHeight = parseLineHeight(computedStyles, el);

      const margin = parseMargin(computedStyles);

      const padding = parsePadding(computedStyles);

      const innerText = hasOnlyTextNodes(el)
        ? el.textContent || undefined
        : undefined;

      const zIndex = parseInt(computedStyles.zIndex);
      const zIndexValue = isNaN(zIndex) ? 0 : zIndex;

      const textAlign = computedStyles.textAlign as
        | "left"
        | "center"
        | "right"
        | "justify";
      const objectFit = computedStyles.objectFit as
        | "contain"
        | "cover"
        | "fill"
        | undefined;

      const parsedBackgroundImage = parseBackgroundImage(computedStyles);
      const imageSrc = (el as HTMLImageElement).src || parsedBackgroundImage;

      const borderRadiusValue = parseBorderRadius(computedStyles, el);

      const shape = parseShape(el, borderRadiusValue) as
        | "rectangle"
        | "circle"
        | undefined;

      const textWrap = computedStyles.whiteSpace !== "nowrap";

      const filters = parseFilters(computedStyles);

      const opacity = parseFloat(computedStyles.opacity);
      const elementOpacity = isNaN(opacity) ? undefined : opacity;

      const listInfo = parseListInfo(el);
      const fallbackListInfo = !listInfo.isListItem
        ? parsePrefixListFallback(el)
        : null;
      const effectiveListInfo = fallbackListInfo ?? listInfo;
      let listIndentForModel: number | undefined = effectiveListInfo.listIndent;
      let listHangingForModel: number | undefined = effectiveListInfo.listHanging;
      if (effectiveListInfo.isListItem) {
        const listStylePos = effectiveListInfo.listStylePosition ?? "outside";
        if (listStylePos !== "inside") {
          if (effectiveListInfo.listStyleType) {
            const fontSizePx = font?.size ?? 16;
            const fontSizePt = Math.round(fontSizePx * 0.75);
            const minHangingPt = Math.max(12, Math.round(fontSizePt * 0.9));
            const desiredHangingPt = Math.max(minHangingPt, Math.round(fontSizePt * 1.2));
            const minIndentPt =
              desiredHangingPt + Math.max(8, Math.round(fontSizePt * 0.4));
            const desiredIndentPt = Math.max(
              Math.round(fontSizePt * 1.4),
              minIndentPt
            );

            const indentPx = Math.round(desiredIndentPt / 0.75);
            const hangingPx = Math.round(desiredHangingPt / 0.75);

            if (position && position.left !== undefined) {
              position.left = position.left - indentPx;
              if (position.width !== undefined) {
                position.width = position.width + indentPx;
              }
            }
            listIndentForModel = indentPx;
            listHangingForModel = hangingPx;
          } else {
            const shift = effectiveListInfo.listIndent ?? 0;
            if (shift > 0 && position && position.left !== undefined) {
              position.left = position.left - shift;
              if (position.width !== undefined) {
                position.width = position.width + shift;
              }
            }
          }
        }
      }

      return {
        tagName: tagName,
        id: el.id,
        className:
          el.className && typeof el.className === "string"
            ? el.className
            : el.className
            ? el.className.toString()
            : undefined,
        innerText: innerText,
        opacity: elementOpacity,
        background: background,
        border: border,
        shadow: shadow,
        font: font,
        position: position,
        margin: margin,
        padding: padding,
        zIndex: zIndexValue,
        textAlign: textAlign !== "left" ? textAlign : undefined,
        lineHeight: lineHeight,
        borderRadius: borderRadiusValue,
        imageSrc: imageSrc,
        objectFit: objectFit,
        clip: false,
        overlay: undefined,
        shape: shape,
        connectorType: undefined,
        textWrap: textWrap,
        should_screenshot: false,
        element: undefined,
        filters: filters,
        isListItem: effectiveListInfo.isListItem,
        listType: effectiveListInfo.listType,
        listLevel: effectiveListInfo.listLevel,
        listStyleType: effectiveListInfo.listStyleType,
        listStylePosition: effectiveListInfo.listStylePosition,
        listIndent: listIndentForModel,
        listHanging: listHangingForModel,
        listItemIndex: effectiveListInfo.listItemIndex,
      };
    }

    return parseElementAttributes(el);
  });
  return attributes;
}
