# WebPlotDigitizer React

A React/Vite conversion of the uploaded WebPlotDigitizer source. This version keeps the original digitization workflow but reorganizes it into React components, small ES modules, and a responsive modern UI.

## Implemented

- Responsive React/Vite UI with canvas viewer, zoom, live cursor values and mobile layout.
- Image upload and project save/resume JSON workflow.
- Multi-series extraction and CSV/JSON export.
- Manual point digitization and color picking.
- XY, Bar, Map and Image axes.
- Advanced axes migrated from the original source:
  - Polar axes with degrees/radians, clockwise/anticlockwise and log-r options.
  - Ternary axes with 0–1 or 0–100 range and normal/reverse orientation.
  - Circular chart recorder axes with day/week rotation, direction and date/number time parsing.
- Multiple automated extraction modes:
  - Color thinning.
  - Connected-component blob detector.
  - Averaging-window line extraction.
  - X-step interpolation for calibrated XY plots.

## Run locally

```bash
npm install
npm run dev
```

## Build for hosting

```bash
npm run build
```

Deploy the generated `dist` folder to Netlify, Vercel, GitHub Pages, Cloudflare Pages or any static hosting provider.

## Notes on parity with upstream WebPlotDigitizer

This project now covers the major advanced axes and extraction algorithms identified in the migration notes. Remaining items that still need deeper upstream parity are full PDF page import, exact legacy `.tar` project compatibility, cloud/AI service integrations, original dialog-by-dialog UI parity, undo-stack parity, measurement tools and all upstream test fixtures. The code is intentionally modular so those features can be added under `src/core`, `src/components`, and `src/utils` without returning to a single global JavaScript namespace.
