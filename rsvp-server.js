/**
 * rsvp-server.js
 * ─────────────────────────────────────────────────
 * Lightweight RSVP server for Sushant & Suwarna's wedding site.
 * Saves form submissions to rsvp_responses.csv
 *
 * SETUP:
 *   1. Place this file in the root of your website folder
 *   2. Run:  node rsvp-server.js
 *   3. Keep it running while guests RSVP
 *   4. Open rsvp_responses.csv in Excel anytime to view responses
 *
 * REQUIREMENTS: Node.js (any version 14+). No npm install needed.
 *
 * PORT: 3737 (change below if needed)
 * ─────────────────────────────────────────────────
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT     = 3737;
const CSV_FILE = path.join(__dirname, 'rsvp_responses.csv');
const CSV_HEADER = 'Timestamp,Name,Phone,Attendance,Events,Message\n';

/* ── Create CSV with header if it doesn't exist ── */
if (!fs.existsSync(CSV_FILE)) {
  fs.writeFileSync(CSV_FILE, CSV_HEADER, 'utf8');
  console.log('📄 Created rsvp_responses.csv');
}

/* ── Escape a value for CSV ── */
function csvEscape(val) {
  const s = String(val ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

/* ── Build a CSV row ── */
function buildRow(data) {
  return [
    data.timestamp || new Date().toLocaleString('en-NP', { timeZone: 'Asia/Kathmandu' }),
    data.name      || '',
    data.phone     || '',
    data.attendance|| '',
    data.events    || '',
    data.message   || '',
  ].map(csvEscape).join(',') + '\n';
}

/* ── HTTP Server ── */
const server = http.createServer((req, res) => {

  /* CORS – allow the local HTML file to POST */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  /* ── POST /rsvp ── */
  if (req.method === 'POST' && req.url === '/rsvp') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const row  = buildRow(data);

        fs.appendFile(CSV_FILE, row, 'utf8', (err) => {
          if (err) {
            console.error('❌ Failed to write CSV:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: err.message }));
          }

          console.log(`✅ RSVP saved: ${data.name} — ${data.attendance}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        });

      } catch (parseErr) {
        console.error('❌ JSON parse error:', parseErr.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  /* ── GET /responses — view all RSVPs in the browser ── */
  if (req.method === 'GET' && req.url === '/responses') {
    try {
      const csv = fs.readFileSync(CSV_FILE, 'utf8');
      const rows = csv.trim().split('\n').map(r => {
        return r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
                .map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"'));
      });

      const [header, ...data] = rows;
      const tableRows = data.map(row =>
        `<tr>${row.map(cell => `<td>${escHtml(cell)}</td>`).join('')}</tr>`
      ).join('');

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>RSVP Responses — ${data.length} total</title>
<style>
  body { font-family: sans-serif; padding: 2rem; background: #faf6f0; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #2c2218; }
  .meta { font-size: 0.85rem; color: #888; margin-bottom: 2rem; }
  table { border-collapse: collapse; width: 100%; background: #fff; }
  th { background: #2c2218; color: #fff; padding: 0.7rem 1rem; text-align: left; font-size: 0.8rem; letter-spacing: 0.05em; }
  td { padding: 0.6rem 1rem; border-bottom: 1px solid #efe0c0; font-size: 0.85rem; }
  tr:hover td { background: #faf6f0; }
  .badge { display:inline-block; padding: 0.2rem 0.6rem; border-radius: 99px; font-size:0.72rem; font-weight:600; }
  .Attending { background:#d4e0d4; color:#3d5c3d; }
  .Not-Sure { background:#fef3cd; color:#7a5c00; }
  .Not-Attending { background:#fde8e8; color:#7a2020; }
  .dl { display:inline-block; margin-top:1.5rem; padding:0.6rem 1.4rem; background:#c4a96b; color:#fff; text-decoration:none; font-size:0.8rem; border-radius:4px; }
</style></head>
<body>
<h1>💍 Wedding RSVP Responses</h1>
<div class="meta">${data.length} response(s) &nbsp;·&nbsp; CSV file: rsvp_responses.csv</div>
<a class="dl" href="/download">⬇ Download CSV</a>
<br><br>
<table>
  <thead><tr>${header.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr></thead>
  <tbody>${tableRows.replace(
    /(<td>)(Attending|Not Sure|Not Attending)(<\/td>)/g,
    (_, a, v, b) => `${a}<span class="badge ${v.replace(' ','-')}">${v}</span>${b}`
  )}</tbody>
</table>
</body></html>`);
    } catch (e) {
      res.writeHead(500); return res.end('Error reading CSV');
    }
  }

  /* ── GET /download — download the CSV ── */
  if (req.method === 'GET' && req.url === '/download') {
    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="rsvp_responses.csv"',
    });
    return fs.createReadStream(CSV_FILE).pipe(res);
  }

  /* ── 404 for everything else ── */
  res.writeHead(404);
  res.end('Not found. Try /responses to view RSVPs.');
});

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

server.listen(PORT, () => {
  console.log('');
  console.log('  💍 Wedding RSVP Server running!');
  console.log('');
  console.log(`  ✅ Listening on  http://localhost:${PORT}`);
  console.log(`  📊 View RSVPs   http://localhost:${PORT}/responses`);
  console.log(`  ⬇  Download CSV http://localhost:${PORT}/download`);
  console.log(`  📄 CSV file:    rsvp_responses.csv`);
  console.log('');
  console.log('  Keep this window open while guests are RSVPing.');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
