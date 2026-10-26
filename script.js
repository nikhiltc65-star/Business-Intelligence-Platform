/* InsightBoard: interactive BI dashboard powered by synthetic demo data. */
const REGIONS = ['North', 'South', 'East'];
const TEAMS = ['Retail', 'Enterprise', 'Online'];
const PRODUCTS = ['Laptop', 'Phone', 'Accessory'];
const BASE_PRICE = { Laptop: 65000, Phone: 28000, Accessory: 2500 };
const REGION_FACTOR = { North: 1, South: 1.12, East: 0.92 };
const TEAM_FACTOR = { Retail: 1, Enterprise: 1.35, Online: 1.15 };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function seededRandom(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
const random = seededRandom(42);
const round2 = (n) => Math.round(n * 100) / 100;
const allTransactions = [];
const anomalyDates = new Set(['2025-02-07', '2025-03-23', '2025-05-01', '2025-06-12', '2025-07-22', '2025-09-02', '2025-10-15', '2025-11-19', '2025-12-17']);

// Generate a repeatable dataset so every visitor sees the same demo values.
for (let day = 0; day < 365; day++) {
  const date = new Date(Date.UTC(2025, 0, 1 + day));
  const dateText = date.toISOString().slice(0, 10);
  const seasonal = [2, 3, 9, 10, 11].includes(date.getUTCMonth()) ? 1.12 : 1;
  for (const region of REGIONS) {
    for (const team of TEAMS) {
      for (const product of PRODUCTS) {
        const units = 1 + Math.floor(random() * 8);
        let revenue = BASE_PRICE[product] * units * TEAM_FACTOR[team] * REGION_FACTOR[region] * seasonal * (0.88 + random() * 0.26);
        let unusual = anomalyDates.has(dateText) && region === 'South' && product === 'Laptop' && team === 'Enterprise';
        if (unusual) revenue *= 5.2;
        revenue = round2(revenue);
        const cost = round2(revenue * (unusual ? 0.61 : 0.58 + random() * 0.21));
        allTransactions.push({
          date: dateText, region, team, product, units,
          revenue, cost, profit: round2(revenue - cost),
          margin: revenue ? round2((revenue - cost) / revenue * 100) : 0,
          unusual
        });
      }
    }
  }
}

const currency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0
}).format(value || 0);
const number = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value || 0);
const byId = (id) => document.getElementById(id);
let charts = {};

function selectedTransactions() {
  const period = byId('periodFilter').value;
  const region = byId('regionFilter').value;
  const team = byId('teamFilter').value;
  const product = byId('productFilter').value;
  const monthRanges = { Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11] };
  return allTransactions.filter((row) => {
    const month = Number(row.date.slice(5, 7)) - 1;
    const inPeriod = period === 'all' || (month >= monthRanges[period][0] && month <= monthRanges[period][1]);
    return inPeriod && (region === 'All' || row.region === region) &&
      (team === 'All' || row.team === team) && (product === 'All' || row.product === product);
  });
}

function sum(rows, key) { return rows.reduce((total, row) => total + Number(row[key] || 0), 0); }
function groupSum(rows, key, valueKey) {
  const map = new Map();
  rows.forEach((row) => map.set(row[key], (map.get(row[key]) || 0) + Number(row[valueKey] || 0)));
  return map;
}
function niceMoneyAxis(value) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
  return `₹${value}`;
}

function calculateOutliers(rows) {
  const flags = new Set();
  // Apply the IQR threshold separately to each product to avoid comparing
  // accessory prices directly with laptop prices.
  for (const product of PRODUCTS) {
    const group = rows.filter((row) => row.product === product).sort((a, b) => a.revenue - b.revenue);
    if (group.length < 4) continue;
    const percentile = (values, p) => values[Math.min(values.length - 1, Math.floor((values.length - 1) * p))];
    const values = group.map((row) => row.revenue);
    const q1 = percentile(values, 0.25);
    const q3 = percentile(values, 0.75);
    const upper = q3 + 1.5 * (q3 - q1);
    group.forEach((row) => { if (row.revenue > upper) flags.add(row); });
  }
  return [...flags].sort((a, b) => b.revenue - a.revenue);
}

function makeChart(id, config) {
  if (charts[id]) charts[id].destroy();
  const canvas = byId(id);
  if (canvas) charts[id] = new Chart(canvas, config);
}
const chartScales = {
  x: { grid: { display: false }, ticks: { color: '#8a93a3', font: { family: 'DM Sans', size: 10 } }, border: { display: false } },
  y: { grid: { color: '#eef1f6' }, ticks: { color: '#8a93a3', font: { family: 'DM Sans', size: 10 }, callback: niceMoneyAxis }, border: { display: false } }
};
const tooltipOptions = { backgroundColor: '#171a2c', padding: 11, titleFont: { family: 'DM Sans' }, bodyFont: { family: 'DM Sans' }, displayColors: true };

function renderCharts(rows) {
  const monthly = Array(12).fill(0);
  rows.forEach((row) => { monthly[Number(row.date.slice(5, 7)) - 1] += row.revenue; });
  makeChart('revenueChart', {
    type: 'line',
    data: { labels: MONTHS, datasets: [{ label: 'Revenue', data: monthly.map(round2), borderColor: '#7561e9', backgroundColor: 'rgba(117,97,233,.12)', fill: true, tension: .35, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2.5 }] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { display: false }, tooltip: { ...tooltipOptions, callbacks: { label: (ctx) => ` Revenue: ${currency(ctx.raw)}` } } }, scales: chartScales }
  });

  const regionMap = groupSum(rows, 'region', 'revenue');
  makeChart('regionChart', {
    type: 'bar', data: { labels: REGIONS, datasets: [{ data: REGIONS.map((r) => round2(regionMap.get(r) || 0)), backgroundColor: ['#8978f1', '#49b99a', '#f0ae70'], borderRadius: 6, maxBarThickness: 40 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...tooltipOptions, callbacks: { label: (ctx) => ` Revenue: ${currency(ctx.raw)}` } } }, scales: chartScales }
  });

  const productMap = groupSum(rows, 'product', 'revenue');
  makeChart('productChart', {
    type: 'doughnut', data: { labels: PRODUCTS, datasets: [{ data: PRODUCTS.map((p) => round2(productMap.get(p) || 0)), backgroundColor: ['#7964e9', '#47b99b', '#f2b16d'], borderColor: '#fff', borderWidth: 4, hoverOffset: 5 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 17, boxWidth: 7, color: '#788294', font: { family: 'DM Sans', size: 10 } } }, tooltip: { ...tooltipOptions, callbacks: { label: (ctx) => ` ${ctx.label}: ${currency(ctx.raw)}` } } } }
  });

  const teamMap = groupSum(rows, 'team', 'revenue');
  makeChart('teamChart', {
    type: 'bar', data: { labels: TEAMS, datasets: [{ data: TEAMS.map((t) => round2(teamMap.get(t) || 0)), backgroundColor: ['#7964e9', '#47b99b', '#f2b16d'], borderRadius: 6, maxBarThickness: 40 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...tooltipOptions, callbacks: { label: (ctx) => ` Revenue: ${currency(ctx.raw)}` } } }, scales: chartScales }
  });
}

function renderAnomalies(rows) {
  const anomalies = calculateOutliers(rows);
  byId('anomalyCount').textContent = `${number(anomalies.length)} flagged`;
  byId('rowSummary').textContent = `Analysed ${number(rows.length)} transactions · Showing up to 8 outliers`;
  const body = byId('anomalyTable');
  if (!anomalies.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty-state">No potential outliers found for these filters. Try another segment.</td></tr>';
    return;
  }
  body.innerHTML = anomalies.slice(0, 8).map((row) => `
    <tr>
      <td>${row.date}</td><td>${row.region}</td><td>${row.team}</td><td>${row.product}</td>
      <td class="money-cell">${currency(row.revenue)}</td><td>${currency(row.profit)}</td>
      <td><span class="flag">Review</span></td>
    </tr>`).join('');
}

function updateDashboard() {
  const rows = selectedTransactions();
  const revenue = sum(rows, 'revenue');
  const profit = sum(rows, 'profit');
  const units = sum(rows, 'units');
  byId('revenueKpi').textContent = currency(revenue);
  byId('profitKpi').textContent = currency(profit);
  byId('marginKpi').textContent = `${revenue ? (profit / revenue * 100).toFixed(1) : '0.0'}%`;
  byId('unitsKpi').textContent = number(units);
  byId('transactionFoot').textContent = `${number(rows.length)} transactions`;
  renderCharts(rows);
  renderAnomalies(rows);
}

function downloadCsv() {
  const rows = selectedTransactions();
  const headers = ['date', 'region', 'team', 'product', 'units', 'revenue', 'cost', 'profit', 'profit_margin_pct'];
  const lines = [headers.join(',')];
  rows.forEach((row) => lines.push(headers.map((header) => {
    const value = header === 'profit_margin_pct' ? row.margin : row[header];
    return `"${String(value).replaceAll('"', '""')}"`;
  }).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'filtered_sales_data.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

['periodFilter', 'regionFilter', 'teamFilter', 'productFilter'].forEach((id) => {
  byId(id).addEventListener('change', updateDashboard);
});
byId('resetFilters').addEventListener('click', () => {
  byId('periodFilter').value = 'all';
  byId('regionFilter').value = 'All';
  byId('teamFilter').value = 'All';
  byId('productFilter').value = 'All';
  updateDashboard();
});
byId('downloadCsv').addEventListener('click', downloadCsv);
updateDashboard();
