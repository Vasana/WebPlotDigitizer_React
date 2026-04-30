export default function DataTable({ points, labels = ['x', 'y'], onDelete }) {
  return <section className="dataPanel">
    <div className="tableHeader"><h2>Extracted data</h2><span>{points.length} point{points.length === 1 ? '' : 's'}</span></div>
    <div className="tableWrap"><table><thead><tr><th>#</th><th>series</th><th>px</th><th>py</th>{labels.map(l => <th key={l}>{l}</th>)}<th>source</th><th></th></tr></thead><tbody>
      {points.length === 0 && <tr><td colSpan={7 + labels.length} className="emptyRow">No points yet. Use manual mode or auto-detect.</td></tr>}
      {points.map((p, i) => <tr key={p.id || i}><td>{i + 1}</td><td>{p.series || 'Series 1'}</td><td>{p.px.toFixed(2)}</td><td>{p.py.toFixed(2)}</td>{labels.map((_, j) => <td key={j}>{fmt(p.values?.[j] ?? (j === 0 ? p.x : j === 1 ? p.y : undefined))}</td>)}<td>{p.source}</td><td><button className="mini" onClick={() => onDelete(i)}>×</button></td></tr>)}
    </tbody></table></div>
  </section>;
}
function fmt(v) { return typeof v === 'string' ? v : Number.isFinite(v) ? Number(v).toPrecision(8) : '—'; }
