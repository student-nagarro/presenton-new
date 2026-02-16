# CHANGES.md

> Stand: basierend auf den unten dokumentierten Commits (Februar 2026).
---

## Änderungen nach Commits

### Commit 1 — Upstream-Fixes  
**Hash:** `703d0fe0c44ba03e02fc5fee04538347a8fa33f5`  
**Titel:** Upstream-fixes: Bugfixs nach update am 11.02.2026 (Temp. autosave aus, importfixes)

**Problem / Kontext (nach Update 11.02.2026):**
- Template-Editor zeigte instabiles Verhalten.
- Autosave führte zu Race-Conditions bzw. ungültigen States.
- Import-Flow brauchte Stabilisierung via Flag/Erkennung.

**Änderungen (Dateien):**
- `useTemplateLayoutsAutoSave.ts`
  - Autosave triggerte zu häufig → instabile Layout-States.
  - Großteil der Autosave-Logik entfernt/abgeschaltet (≈160 Zeilen weniger).
  - **Wirkung:** Editor stabiler, weniger Auto-Save-Fehler nach Update.
- `index.tsx`
  - Mini-Fix in Template-Registrierung/Import-Flow (z. B. neue Pack-Erkennung).
  - **Wirkung:** Template-Index stabil nach Update/Import.
- `constants.ts`
  - Neue Konstante(n) / Flag für Import-Fix ergänzt.
  - **Wirkung:** Import-Flow steuerbar/gestabilisiert.

---

### Commit 2 — Nagarro Assets & Template Pack  
**Hash:** `cf348c2d4e9152c5a1f890008c6be438f5ae72c5`  
**Titel:** Nagarro-Hintergründe, Fonts (inkl. Fontträger), Layout-Renderer + settings.json hinzugefügt.

**Problem / Kontext:**
Das Nagarro-Template sollte vollständig nutzbar sein, aber es fehlten:
- Backgrounds (PNG)
- Fonts + Font-Carrier
- Layout-Renderer + Settings + Registrierung

**Änderungen (Dateien/Ordner):**
- `servers/fastapi/static/images/nagarro_fluidic/*`
  - Alle Folien-PNGs + `equip_carrier.pptx` hinzugefügt.
  - **Wirkung:** Background-Assets & Carrier vorhanden; Export kann darauf basieren.
- `servers/nextjs/app/fonts/*`
  - Equip / Equip Extended TTF-Dateien hinzugefügt.
  - **Wirkung:** Fonts lokal verfügbar (Next/DOM-Render).
- `servers/nextjs/app/presentation-templates/nagarro-fluidic/*`
  - Nagarro-Layouts + Renderer implementiert.
  - **Wirkung:** Template-Pack vollständig.
- `settings.json`
  - Pack-Konfiguration (Name, Default, Description) angelegt.
  - **Wirkung:** Pack kann sauber in UI registriert/ausgewählt werden.
- `index.tsx`
  - Pack registriert.
  - **Wirkung:** “Nagarro Fluidic” erscheint in der Template-Auswahl.

---

### Commit 3 — Export Core  
**Hash:** `24d80f414a6b9cd46c0bf2635f1ca98cfe1a49ea`  
**Titel:** Export Core (Template/Slide-Size, Fonts, Bullets, Master-View, Model-Erweiterung)

#### Problem 1: Slide-Size falsch (Default statt Carrier)
**Ursache:** In NEU fehlte ein `PPTX_TEMPLATE_PATH`-Mechanismus → Präsentation wurde immer mit Default-Größe erstellt.

**Änderung:**
- `export_utils.py`: `PPTX_TEMPLATE_PATH` (wie ALT) wieder eingeführt.
- `presentation.py`: Template-Pfad akzeptieren und an `PptxPresentationCreator` durchreichen.
- `pptx_presentation_creator.py`: wenn `template_path` gesetzt:
  - Präsentation aus Carrier laden
  - Slides leeren
  - Slide-Size folgt Carrier

**Wirkung:** Export übernimmt **13.333" × 7.5"** aus Carrier; kein Skalierungsdrift.  
**Klarstellung:** „1280×720“ ist px/Canvas-Denke (UI), PPTX arbeitet mit EMU/pt/inch.

#### Problem 2: Fonts/Theme falsch (Inter statt Equip; Headings)
**Ursache:** Theme-Fonts wurden nicht gesetzt; `python-pptx` nutzt Default-Theme.

**Änderung:**
- `pptx_presentation_creator.py`: `set_theme_fonts` auf Equip / Equip Extended + Mapping für Gewicht/Headings.

**Wirkung:** PPTX nutzt Marken-Schriften für Body/Headings.

#### Problem 3: Markdown-Runs werden als Literale exportiert (`**bold**`)
**Ursache:** HTML-Inline-Parsing fehlte → `**` blieb Text.

**Änderung:**
- `html_to_text_runs_service.py`: Parser erzeugt echte Runs (bold/italic).

**Wirkung:** PPTX enthält korrekte Bold/Italic-Runs statt Sternchen-Literalen.

#### Problem 4: Bullets kleben am Text / fehlen
**Ursache:** Ohne `marL/indent` im XML ist Bullet-Abstand praktisch 0.

**Änderung:**
- `pptx_presentation_creator.py`: `apply_list_indents` setzt `marL` und `indent` direkt als XML-Attribute (EMU).
- Fallback-Berechnung für `list_indent / list_hanging` (inkl. späterem Clamp-Tuning).

**Wirkung:** Bullets sind nativ + Abstand ist im XML sichtbar.  
**Hinweis:** Spacing-Tuning (Clamp/Hanging-Faktor) kann in der Praxis Follow-up bleiben.

#### Problem 5: PPTX öffnet in Master-Ansicht
**Ursache:** `lastView` in `viewProps.xml` fehlte oder war falsch.

**Änderung:**
- `pptx_presentation_creator.py`: nach Save `lastView="sldView"` setzen.

**Wirkung:** PPTX öffnet normal in Folienansicht.

#### Model-Erweiterung für List-Support
**Ursache:** Python-Model kannte `list_*` nicht → keine Indents/Levels im Writer.

**Änderung:**
- `pptx_models.py`: `list_type`, `list_level`, `list_indent`, `list_hanging`, `list_item_index`.

**Wirkung:** TS-List-Infos werden sauber bis Python durchgereicht.

**Dateien in diesem Commit:**
- `export_utils.py`
- `presentation.py`
- `pptx_presentation_creator.py`
- `html_to_text_runs_service.py`
- `pptx_models.py`

---

### Commit 4 — Export Scrape & Model  
**Hash:** `3ffcc7b89203950f82441c3c29647f5974953651`  
**Titel:** Export Scrape & Model (Determinismus, List-Meta, Bullet-Merge, Mapping)

#### Problem 1: Nicht-deterministischer Export
**Ursache:** Export startete bevor Layout stabil war; Animationen liefen; Screenshot-IDs instabil.

**Änderung:**
- `PdfMakerPage.tsx`: setzt `__PRESENTON_EXPORT_READY__`.
- `TiptapTextReplacer.tsx`: wartet auf Editor-Ready.
- `route.ts`:
  - wartet auf `__PRESENTON_EXPORT_READY__`
  - Animationen deaktivieren
  - stabile Screenshot-IDs (domPath hashing)

**Wirkung:** Gleiche Inputs → gleiche Exports; weniger Race-Fehler.

#### Problem 2: Bullets nicht erkennbar / nur Textzeichen
**Ursache:** DOM-Scraper hatte keinen List-Kontext (`ul/ol/li`).

**Änderung:**
- `route.ts`:
  - `parseListInfo` liest `listType`, `listLevel`, `listStyle`, `listIndent`, `listItemIndex`
  - Prefix-Fallback (nur wenn ≥2 Items) für “•”, “-”, “1.”
  - Bullet-Marker-Merge (Marker-Shape + Text-Box)
- `element_attibutes.ts` (Name im Repo prüfen): neue `list`-Felder
- `pptx_models.ts`: `list`-Felder im TS-Model
- `pptx_models_utils.ts`: `listIndent/listHanging` → PPTX-Paragraph

**Wirkung:** Bullet-Infos werden nativ ans PPTX-Model übergeben.

#### Problem 3: Bullets verschoben / doppelte Einrückung
**Ursache:** `<ul>` hat Padding; TS übernahm Position bereits „rechts“, plus `marL` → doppelt.

**Änderung:**
- `route.ts`: Bei List-Items Shape links zurückschieben (um indent), width erweitern.
- `listIndent/listHanging` bewusst setzen (nicht 0).

**Wirkung:** Text startet am Header-Align; Einrückung erfolgt nur einmal via `marL/indent`.

**Dateien in diesem Commit:**
- `route.ts`
- `element_attibutes.ts` (ggf. Schreibweise im Repo abgleichen)
- `pptx_models.ts`
- `pptx_models_utils.ts`
- `PdfMakerPage.tsx`
- `TiptapTextReplacer.tsx`

---

### Commit 5 — Next UI/Asset-Compat  
**Hash:** `ed661b9c0ddcffde650eac76af8e4d2acd6fc301` *(laut Liste; Hash bitte prüfen)*  
**Titel:** Next UI/Asset-Compat (Fonts, Globals, Layout-Shim, Static-Rewrite)

#### Problem 1: Next konnte FastAPI-Assets nicht direkt liefern
**Ursache:** Backgrounds liegen unter FastAPI static, keine Next-Route.

**Änderung:**
- `next.config.mjs`: Rewrite `/static/*` → FastAPI.

**Wirkung:** Backgrounds laden im Browser/Export ohne 404.

#### Problem 2: Fonts in Next nicht geladen
**Ursache:** Equip-Fonts fehlten im Next-Layout.

**Änderung:**
- `layout.tsx`: `next/font/local` für Equip/Equip Extended.
- `globals.css`: `--font-equip` angewendet.

**Wirkung:** Browser/DOM-Scrape nutzt gleiche Fonts wie PPTX.

#### Problem 3: Layout-ID Compat
**Ursache:** ältere Slides ohne `templateId`-Prefix.

**Änderung:**
- `V1ContentRender.tsx`: falls kein “:”, prefix `nagarro-fluidic:`.

**Wirkung:** Alte Layout-IDs funktionieren ohne Migration.

**Dateien in diesem Commit:**
- `next.config.mjs`
- `layout.tsx`
- `globals.css`
- `V1ContentRender.tsx`

---

### Commit 6 — Nagarro Template Bullets + Word-Limit (Slide 36)  
**Hash:** `2feb659583a47ddf604c8444f7dcda7bb5bbb779`
**Titel:** Nagarro Template Bullets + Word-Limit Slide 36

#### Problem 1: Bullets als „eigene Shapes“ statt echte Listen
**Ursache:** Templates nutzten `<span>•</span>` + Text im Flex-Row.

**Änderung:**
- Betroffene Nagarro-Layouts auf `<ul><li>` umgestellt.
- Einheitliche Styles:
  - `listStyleType: "disc"`
  - `listStylePosition: "outside"`
  - `paddingLeft: "1.2em"`

**Wirkung:** Export erkennt echte Listen; Bullet-Meta ist zuverlässig.

#### Problem 2: Doppelte Bullet-Zeichen (Eingabe enthält “•”)
**Ursache:** Texteingabe konnte Bullet-Prefix enthalten.

**Änderung:**
- `normalizeBullets` entfernt Prefix `•/·/-/*` (inkl. mis-encoded `â€¢`).

**Wirkung:** Keine Doppel-Bullets im PPTX.

#### Problem 3: Slide 36 zu lange Bullets
**Ursache:** Nur Zeichenlimit, keine Wortbegrenzung.

**Änderung:**
- `MAX_BULLET_WORDS = 20`
- Zod-Refine: Bullet max 20 Wörter
- Render-Fallback: `clampWords()` begrenzt auf 20 Wörter

**Wirkung:** Generierte Texte bleiben im Box-Budget.

**Dateien in diesem Commit:**
- `BgSlide10ContentLayout.tsx`
- `BgSlide13SplitLayout.tsx`
- `BgSlide14TextLayout.tsx`
- `BgSlide15AgendaLayout.tsx`
- `BgSlide17AgendaLayout.tsx`
- `BgSlide26BodyLayout.tsx`
- `BgSlide27BodyLayout.tsx`
- `BgSlide32BodyLayout.tsx`
- `BgSlide33BodyLayout.tsx`
- `BgSlide34BodyLayout.tsx`
- `BgSlide35BodyLayout.tsx`
- `BgSlide36BodyLayout.tsx`
- `BgSlide39BodyLayout.tsx`
