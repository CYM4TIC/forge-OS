# Block 5: Layout Engine — The OS Text Primitive

> **Sessions:** 2 | **Batches:** OS-B5.A, OS-B5.B | **Source:** BUILD-PLAN.md Block 5
> **Dependency:** Build this before the dashboard. The dashboard is built on it.

---

## OS-B5.A: Core Engine
- Initialize `runtime/` as Node.js + React project (Vite)
- `npm install @chenglou/pretext`
- Build `runtime/src/engine/layout/`:
  - `prepare.ts` — batch prepare for arrays of text blocks, font caching, memoization
  - `measure.ts` — single text measurement, multi-breakpoint measurement (375/768/1280), height-for-width
  - `fit.ts` — fit-to-container solver: given text + container width + min/max font size, find optimal size. Binary search over layout() calls (<1ms total)
  - `virtual.ts` — pre-compute heights for virtualized list items. Given array of text items + container width, return height map for react-window/react-virtuoso
  - `canvas.ts` — canvas text renderer: draw prepared text to canvas context with line breaks, colors, alignment. Support for styled spans (bold, color, badges)
  - `types.ts` — PreparedText, LayoutResult, MeasureOptions, FitResult, VirtualHeightMap

## OS-B5.B: Document Generation + PDF
- `pdf.ts` — page-break calculator: given content blocks + page dimensions, compute which blocks fit per page. Render pages to canvas, export as PDF blob.
- Document generation engine (`runtime/src/integrations/document-gen/`):
  - Gate report template
  - Project brief template
  - Build report template
  - Retrospective template
- Test: generate a PDF from sample data, verify page breaks and typography

### Exit Gate
- Layout engine builds and passes tests
- All 7 source files in `runtime/src/engine/layout/`
- Document generation engine produces valid PDFs
- Pushed to GitHub: "Layout engine operational"

---
