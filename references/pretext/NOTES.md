# Pretext — Text Measurement & Layout Engine

> Zero-CLS text rendering. Canvas + DOM hybrid. For Forge OS living canvas HUD.

## Repo: github.com/chenglou/pretext | NPM: @chenglou/pretext

## Core Architecture

Two-phase design eliminates DOM layout reflow:

1. **`prepare(text, font, options)`** — One-time segmentation + canvas measurement. ~19ms for 500 texts. Cache this.
2. **`layout(prepared, maxWidth, lineHeight)`** — Pure arithmetic line-breaking. ~0.09ms hot path. Call on resize.

## API Surface

| Function | Use Case | Performance |
|----------|----------|-------------|
| `prepare()` + `layout()` | Dynamic text height | <1ms per call |
| `prepareWithSegments()` + `layoutWithLines()` | Manual layout (segment-driven) | No string materialization |
| `walkLineRanges()` | Shrinkwrap layout | Binary searchable |
| `layoutNextLine()` + `LayoutCursor` | Variable-width flows | Iterator pattern |

## Key Details

- Uses `canvas.measureText()` as font engine ground truth
- Full i18n via `Intl.Segmenter` (CJK, Thai, Arabic, emoji, mixed-bidi)
- Renders to DOM, Canvas, or SVG
- Emoji correction auto-detects canvas vs DOM width differential
- **Caveat:** `system-ui` resolves differently on macOS between canvas/DOM — use named fonts

## Zero-CLS Claim

Precomputed line heights prevent text reflow after load. Height known before render. No layout shift.

## How to Use in Forge OS

**Phase 3 (Layout Engine):** `packages/layout-engine/` wraps Pretext for:
- Canvas HUD text rendering (StatCards, NodeCards, labels)
- TokenGauge — pre-measured number displays (no shift on "$4.23" → "$4.24")
- Dynamic font sizing for agent labels at any zoom level
- PDF generation page-break calculator

**Phase 4 (Living Canvas):** Pipeline node labels, batch progress text, context meters all use Pretext measurement → canvas render.
