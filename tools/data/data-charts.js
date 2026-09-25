import { loadPlot } from './data-engines.js';

function finiteRows(rows, columns) {
  return (rows || []).filter(row => columns.every(column => column && row[column] !== null && row[column] !== undefined && row[column] !== ''));
}

export async function renderDataChart(target, rows, options = {}) {
  const Plot = await loadPlot();
  const type = options.type || 'bar';
  const x = options.x;
  const y = options.y;
  const z = options.z;
  const width = Math.max(320, Math.min(1100, target?.clientWidth || 900));
  const common = {
    width,
    height: 420,
    marginLeft: 58,
    marginBottom: 48,
    grid: true,
    style: { background: 'transparent', color: '#171714', fontSize: '12px' },
    ariaLabel: `${type} chart${x ? ` of ${x}` : ''}${y ? ` and ${y}` : ''}`,
  };

  let chart;
  if (type === 'histogram') {
    if (!x) throw new Error('Choose a numeric X column for a histogram.');
    const data = finiteRows(rows, [x]).map(row => ({ ...row, [x]: Number(row[x]) })).filter(row => Number.isFinite(row[x]));
    chart = Plot.plot({
      ...common,
      y: { label: 'Count' },
      marks: [Plot.rectY(data, Plot.binX({ y: 'count' }, { x, thresholds: 20, tip: true })), Plot.ruleY([0])],
    });
  } else if (type === 'box') {
    if (!y) throw new Error('Choose a numeric Y column for a box plot.');
    const data = finiteRows(rows, [y]).map(row => ({ ...row, [y]: Number(row[y]) })).filter(row => Number.isFinite(row[y]));
    chart = Plot.plot({ ...common, marks: [Plot.boxY(data, { x: x || undefined, y, tip: true })] });
  } else if (type === 'heatmap') {
    if (!x || !y || !z) throw new Error('Heatmap requires X, Y, and value columns.');
    const data = finiteRows(rows, [x, y, z]);
    chart = Plot.plot({
      ...common,
      color: { legend: true },
      marks: [Plot.cell(data, { x, y, fill: z, tip: true }), Plot.frame()],
    });
  } else if (type === 'scatter') {
    if (!x || !y) throw new Error('Scatter requires X and Y columns.');
    const data = finiteRows(rows, [x, y]);
    chart = Plot.plot({ ...common, marks: [Plot.dot(data, { x, y, tip: true, r: 4 }), Plot.frame()] });
  } else if (type === 'line') {
    if (!x || !y) throw new Error('Line chart requires X and Y columns.');
    const data = finiteRows(rows, [x, y]);
    chart = Plot.plot({ ...common, marks: [Plot.lineY(data, { x, y, tip: true }), Plot.dot(data, { x, y, tip: true, r: 2.5 })] });
  } else {
    if (!x || !y) throw new Error('Bar chart requires X and Y columns.');
    const data = finiteRows(rows, [x, y]);
    chart = Plot.plot({ ...common, marks: [Plot.barY(data, { x, y, tip: true }), Plot.ruleY([0])] });
  }

  target.replaceChildren(chart);
  return chart;
}
