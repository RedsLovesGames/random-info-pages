const requested = new URLSearchParams(location.search).get('action');

const ROUTES = {
  table: ['tableData'], sort: ['tableData', 'tableSortColumn'], filter: ['tableData', 'tableFilterColumn'], edit: ['tableData'],
  'rename-column': ['tableData', 'tableRenameColumn'], 'change-type': ['tableData', 'tableTypeColumn'],
  dedupe: ['cleanData', 'cleanDedupe'], trim: ['cleanData', 'cleanTrim'], missing: ['cleanData', 'cleanFillValue'],
  'split-column': ['transformData', 'transformColumn'], 'combine-columns': ['transformData', 'transformCombineColumns'],
  transpose: ['transformData', 'transformTranspose'], group: ['transformData', 'transformGroupColumn'], join: ['transformData', 'transformJoinFile'], pivot: ['transformData', 'transformPivotRow'],
  statistics: ['statisticsData', 'statsColumn'], frequency: ['statisticsData', 'frequencyColumn'], correlation: ['statisticsData', 'corrX'],
  sql: ['sqlData', 'sqlQuery'], chart: ['chartData', 'chartType'], convert: ['exportData'],
};

if (requested && ROUTES[requested]) {
  const [panelButtonId, focusId] = ROUTES[requested];
  const workspace = document.getElementById('dataWorkspace');
  let routed = false;
  const tryRoute = () => {
    if (routed || !workspace || workspace.hidden) return;
    const hasRows = document.querySelector('#dataTable tbody tr') || document.querySelector('#dataTable .data-empty');
    if (!hasRows) return;
    routed = true;
    document.getElementById(panelButtonId)?.click();
    if (focusId) setTimeout(() => document.getElementById(focusId)?.focus(), 0);
  };
  const observer = new MutationObserver(tryRoute);
  observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
  tryRoute();
  setTimeout(() => observer.disconnect(), 30000);
}
