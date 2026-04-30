# Line Graph Extraction Validation Report

## Purpose
This validation checks whether XY line graph extraction returns data close to known ground-truth values.

## Test setup
A synthetic XY plot was generated in memory with known calibration:

- X range: 0 to 100
- Y range: 0 to 100
- Plot area: 800 px × 400 px
- Target line: `y = 50 + 30 sin(2πx / 100)`
- Additional blue line added to simulate a multi-line chart
- Target extraction color: red

## Findings before fixes
The existing line extraction methods worked reasonably on clean color-separated lines, but the **X-step interpolation tool had a major weakness**: it scanned near `Y = 0` instead of scanning the full calibrated Y range. This caused it to miss most of the target line when the line was far from zero.

## Fixes added
1. Added a new algorithm: **XY line trace**
   - Designed specifically for XY line graphs.
   - Scans column-by-column.
   - Groups matching color pixels into vertical runs.
   - Follows the most continuous run to avoid jumping to other marks.

2. Fixed **X-step interpolation**
   - It now scans the full calibrated Y range by default.
   - Optional `Y scan px` can still be used to restrict scanning if needed.

## Validation results after fixes
Typical results on the synthetic multi-line test:

| Algorithm | Points found | RMSE vs known line | Notes |
|---|---:|---:|---|
| Color thinning | 155 | ~0.239 | Good but sparse/thinned |
| Averaging window | 200 | ~0.066 | Very good for smooth lines |
| XY line trace | 399 | ~0.069 | Best default for line graphs |
| X-step interpolation | 101 | ~0.071 | Best when fixed X intervals are required |

## Recommendation for users
For line graphs, especially multi-line graphs:

1. Pick the exact line color using **Pick color**.
2. Set tolerance conservatively, usually between **20 and 60**.
3. Use **XY line trace** as the first-choice algorithm.
4. Use **X-step interpolation** when you need output at fixed X values such as every 1, 5, or 10 units.
5. If unwanted points are detected, lower tolerance or manually delete outliers from the data table.
