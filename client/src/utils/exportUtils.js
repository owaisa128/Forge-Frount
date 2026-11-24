/**
 * Export JSON array of objects to a CSV file download
 * @param {Array<Object>} data 
 * @param {string} filename 
 */
export const exportToCSV = (data, filename = 'forge_export.csv') => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No data available to export.');
  }

  // Extract CSV headers
  const keys = Object.keys(data[0]);
  const csvRows = [];

  // Header row
  csvRows.push(keys.map(key => `"${key}"`).join(','));

  // Data rows
  for (const row of data) {
    const values = keys.map(key => {
      const val = row[key] === null || row[key] === undefined ? '' : row[key];
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generate a printable HTML document window for PDF export
 * @param {string} reportTitle 
 * @param {string} subtitle 
 * @param {Array<string>} headers 
 * @param {Array<Array<string>>} rows 
 */
export const exportToPDFReport = (reportTitle, subtitle, headers, rows) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow pop-ups to generate PDF reports.');
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${reportTitle} - FORGE</title>
        <style>
          :root {
            color-scheme: dark;
            --forge-bg-base: #0A0C0D;
            --forge-bg-surface: #14171A;
            --forge-bg-surface-raised: #1B1F22;
            --forge-border-subtle: rgba(255, 255, 255, .1);
            --forge-text-primary: #F4F4F2;
            --forge-text-secondary: #A6A8A5;
            --forge-lime: #C8FF4D;
            --forge-font-display: "Bebas Neue", Impact, sans-serif;
            --forge-font-body: "Inter Variable", Inter, system-ui, sans-serif;
            --forge-font-label: "JetBrains Mono Variable", "JetBrains Mono", monospace;
          }
          body { margin: 48px; background: var(--forge-bg-base); color: var(--forge-text-primary); font: 400 14px/1.5 var(--forge-font-body); print-color-adjust: exact; }
          .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--forge-border-subtle); }
          .title { margin: 0; color: var(--forge-text-primary); font: 400 32px/.94 var(--forge-font-display); }
          .subtitle { margin-top: 8px; color: var(--forge-text-secondary); font-size: 14px; }
          table { width: 100%; margin-top: 24px; border: 1px solid var(--forge-border-subtle); border-collapse: collapse; background: var(--forge-bg-surface); font-size: 14px; }
          th { padding: 12px; background: var(--forge-bg-surface-raised); color: var(--forge-text-primary); font: 500 12px/1.4 var(--forge-font-label); text-align: left; text-transform: uppercase; letter-spacing: .08em; }
          td { padding: 12px; border-bottom: 1px solid var(--forge-border-subtle); }
          tr:nth-child(even) { background: var(--forge-bg-surface-raised); }
          .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--forge-border-subtle); color: var(--forge-text-secondary); font-size: 13px; text-align: left; }
          @media print { body { background: var(--forge-bg-base); } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">FORGE — ${reportTitle}</h1>
          <p class="subtitle">${subtitle} • Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          FORGE • Confidential User Report
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
