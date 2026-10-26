# Business Intelligence Dashboard

An interactive, browser-based BI dashboard built with **HTML, CSS, JavaScript and Chart.js**. It uses generated synthetic sales records to demonstrate KPI reporting, sales trends, region and team comparisons, product mix, potential revenue outliers, filters and CSV export.

## Features

- Revenue, profit, profit margin and units sold KPIs
- Filters for period, region, team and product
- Interactive revenue trend, regional comparison, team performance and product mix charts
- IQR-based potential outlier detection
- Export filtered transactions to CSV
- Responsive layout for desktop and mobile
- Repeatable synthetic data generated in the browser

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser. For a smoother development workflow, use the VS Code **Live Server** extension.
3. An internet connection is needed to load Chart.js and Google Fonts from their CDNs.

No server, database or package installation is required for this front-end demo.

## Files

- `index.html`: dashboard structure
- `style.css`: responsive styling
- `script.js`: synthetic data generation, KPIs, filters, charts, outlier detection and CSV export

## Next steps

A future version could connect the dashboard to a Python API and a SQL database, add real CSV imports, and evaluate forecasting models against historical data.
