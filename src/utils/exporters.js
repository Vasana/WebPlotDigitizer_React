export function toCsv(points, labels = ['x', 'y']) {
  const rows = [['series', 'pixel_x', 'pixel_y', ...labels, 'source']];
  for (const p of points) rows.push([p.series || 'Series 1', p.px, p.py, ...labels.map((_, i) => p.values?.[i] ?? (i === 0 ? p.x : i === 1 ? p.y : '')), p.source || 'manual']);
  return rows.map(r => r.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
}
export function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
