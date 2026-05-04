// ── Geometry ──────────────────────────────────────────────────────────────────

function getCorner(num, L, B) {
  return { 1:[0,0], 2:[L,0], 3:[0,B], 4:[L,B] }[num];
}

function circleIntersect(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1, dy = y2 - y1;
  const d  = Math.hypot(dx, dy);
  const EPS = 1e-9;
  if (d < EPS)                    return null;
  if (d > r1 + r2 + EPS)         return null;
  if (d < Math.abs(r1 - r2) - EPS) return null;
  const a  = (r1*r1 - r2*r2 + d*d) / (2*d);
  const h  = Math.sqrt(Math.max(0, r1*r1 - a*a));
  const mx = x1 + a*dx/d, my = y1 + a*dy/d;
  return [
    [mx + h*dy/d, my - h*dx/d],
    [mx - h*dy/d, my + h*dx/d],
  ];
}

function insideRect(x, y, L, B, tol = 0.05) {
  return x >= -tol && x <= L + tol && y >= -tol && y <= B + tol;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ctxRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function parseExcluded(str, maxN) {
  const result = new Set();
  if (!str.trim()) return result;
  for (const token of str.split(/[\s,;]+/)) {
    const n = parseInt(token, 10);
    if (!isNaN(n) && n >= 1 && n <= maxN) result.add(n - 1); // 0-based index
  }
  return result;
}

function pickLuckyLoser(cols, rows, winCol, winRow, excludedByOrg) {
  const blocked = new Set(excludedByOrg);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nc = winCol + dc, nr = winRow + dr;
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows)
        blocked.add(nr * cols + nc);
    }
  }
  const pool = [];
  for (let i = 0; i < cols * rows; i++) {
    if (!blocked.has(i)) pool.push(i);
  }
  if (pool.length === 0) return null;
  const idx = pool[Math.floor(Math.random() * pool.length)];
  return { col: idx % cols, row: Math.floor(idx / cols), num: idx + 1 };
}

// ── Main calculation ──────────────────────────────────────────────────────────

function calculate() {
  const L    = parseFloat(document.getElementById('lengte').value);
  const B    = parseFloat(document.getElementById('breedte').value);
  const cols = parseInt(document.getElementById('numCols').value);
  const rows = parseInt(document.getElementById('numRows').value);
  const hA   = parseInt(document.getElementById('hoekA').value);
  const hB   = parseInt(document.getElementById('hoekB').value);
  const dA   = parseFloat(document.getElementById('afstandA').value);
  const dB   = parseFloat(document.getElementById('afstandB').value);

  if ([L,B,dA,dB].some(v => isNaN(v) || v <= 0) || cols < 1 || rows < 1)
    return showError('Vul alle velden in met positieve getallen.');
  if (cols * rows > 100000)
    return showError('Raster te groot — maximaal 100 000 vakjes (bv. 1000 × 100).');
  if (hA === hB)
    return showError('Kies twee verschillende hoeken.');

  const afstandCRaw = document.getElementById('afstandC').value.trim();
  const hasC = afstandCRaw !== '' && parseFloat(afstandCRaw) > 0;
  const hC   = hasC ? parseInt(document.getElementById('hoekC').value) : null;
  const dC   = hasC ? parseFloat(afstandCRaw) : null;

  const excludedByOrg = parseExcluded(
    document.getElementById('uitgesloten').value,
    cols * rows
  );

  const [ax, ay] = getCorner(hA, L, B);
  const [bx, by] = getCorner(hB, L, B);

  const pts = circleIntersect(ax, ay, dA, bx, by, dB);
  if (!pts) return showError('De cirkels snijden niet — controleer de afstanden.');

  const inside = pts.filter(([x, y]) => insideRect(x, y, L, B));
  if (inside.length === 0)
    return showError('Geen snijpunt binnen het veld — controleer de afstanden.');

  let point, ambiguous = false, resolvedByC = false;
  if (inside.length === 2) {
    if (hasC && hC !== hA && hC !== hB) {
      const [ccx, ccy] = getCorner(hC, L, B);
      const distToC = ([x, y]) => Math.abs(Math.hypot(x - ccx, y - ccy) - dC);
      point = distToC(inside[0]) <= distToC(inside[1]) ? inside[0] : inside[1];
      resolvedByC = true;
    } else {
      ambiguous = true;
      const margin = ([x, y]) => Math.min(x, L-x, y, B-y);
      point = margin(inside[0]) >= margin(inside[1]) ? inside[0] : inside[1];
    }
  } else {
    point = inside[0];
  }

  const [px, py] = point;
  const cellW = L / cols;
  const cellH = B / rows;
  const col = Math.min(Math.max(0, Math.floor(px / cellW)), cols - 1);
  const row = Math.min(Math.max(0, Math.floor(py / cellH)), rows - 1);
  const vakjeNum = row * cols + col + 1;

  const luckyLoser = pickLuckyLoser(cols, rows, col, row, excludedByOrg);

  document.getElementById('output-card').style.display    = 'block';
  document.getElementById('full-grid-card').style.display = 'block';

  drawField({ L, B, cols, rows, cellW, cellH, ax, ay, dA, bx, by, dB,
              px, py, col, row, allPts: pts, hA, hB, hC, dC, hasC, luckyLoser });
  renderFullGrid(cols, rows, col, row, luckyLoser, excludedByOrg);

  // Corner coords of winning cell
  const fmt = v => v.toFixed(3);
  const c0 = [fmt(col * cellW),       fmt(row * cellH)      ];
  const c1 = [fmt((col+1) * cellW),   fmt(row * cellH)      ];
  const c2 = [fmt(col * cellW),       fmt((row+1) * cellH)  ];
  const c3 = [fmt((col+1) * cellW),   fmt((row+1) * cellH)  ];

  // 3×3 neighbour grid
  const gridCells = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nc = col + dc, nr = row + dr;
      const isWin = dc === 0 && dr === 0;
      if (isWin) {
        gridCells.push(`<div style="background:rgba(34,197,94,0.2);border:2px solid #22c55e;border-radius:4px;
          padding:.35rem;text-align:center;font-weight:800;color:#22c55e;font-size:.95rem">#${vakjeNum}</div>`);
      } else if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
        const n = nr * cols + nc + 1;
        gridCells.push(`<div style="background:rgba(234,179,8,0.12);border:1px dashed rgba(234,179,8,0.45);
          border-radius:4px;padding:.35rem;text-align:center;color:#fbbf24;font-size:.88rem;font-weight:600">#${n}</div>`);
      } else {
        gridCells.push(`<div style="border:1px solid #1e293b;border-radius:4px;padding:.35rem;
          text-align:center;color:#334155;font-size:.88rem">—</div>`);
      }
    }
  }

  // Distance verification
  const calcDistA = Math.hypot(px - ax, py - ay);
  const calcDistB = Math.hypot(px - bx, py - by);
  const fmtErr = v => v < 0.001
    ? '<span style="color:#4ade80">✓ 0.000</span>'
    : `<span style="color:#f87171">Δ ${v.toFixed(3)}</span>`;

  let calcCRow = '';
  if (hasC) {
    const [ccx, ccy] = getCorner(hC, L, B);
    const calcDistC = Math.hypot(px - ccx, py - ccy);
    calcCRow = `
      <tr style="border-top:1px solid #1e293b">
        <td style="padding:.3rem .5rem .3rem 0;color:#a78bfa">Hoek ${hC} → punt</td>
        <td style="text-align:right;padding:.3rem .4rem;color:#cbd5e1">${dC.toFixed(3)} m</td>
        <td style="text-align:right;padding:.3rem .4rem;color:#cbd5e1">${calcDistC.toFixed(3)} m</td>
        <td style="text-align:right;padding:.3rem 0 .3rem .4rem">${fmtErr(Math.abs(calcDistC - dC))}</td>
      </tr>`;
  }

  const luckyHtml = luckyLoser
    ? `<div class="result-box lucky">
        <div class="vakje-label">Lucky Loser</div>
        <div class="vakje-num lucky">Vakje #${luckyLoser.num}</div>
        <div class="coords-detail" style="margin-top:.4rem">
          Kolom ${luckyLoser.col + 1} &nbsp;|&nbsp; Rij ${luckyLoser.row + 1}
        </div>
      </div>`
    : `<div class="result-box empty">
        <div class="vakje-label">Lucky Loser</div>
        <div style="color:#64748b;font-size:.9rem;margin-top:.25rem">
          Geen lucky loser mogelijk — pool is leeg.
        </div>
      </div>`;

  document.getElementById('result-text').innerHTML = `
    <div class="winners-row">
      <div class="result-box">
        <div class="vakje-label">Winnaar</div>
        <div class="vakje-num">Vakje #${vakjeNum}</div>
        <div class="coords-detail">
          X = ${px.toFixed(3)} m &nbsp;|&nbsp; Y = ${py.toFixed(3)} m<br>
          ${cols} kol. × ${rows} rijen &nbsp;|&nbsp; cel ${cellW.toFixed(3)} m × ${cellH.toFixed(3)} m
        </div>
      </div>
      ${luckyHtml}
    </div>

    <div class="detail-sections">
      <hr style="border:none;border-top:1px solid #2d3d52;margin:.75rem 0">
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:.6rem">
        Loodrechte afstanden
      </div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:.4rem 1rem;font-size:.82rem;font-family:monospace;max-width:480px">
        <div style="color:#94a3b8">&#8592; Kant van parking (links)</div>
        <div><span style="color:#64748b">X</span> = <strong style="color:#e2e8f0">${px.toFixed(3)} m</strong></div>
        <div style="color:#94a3b8">&#8594; Kant van parking (rechts)</div>
        <div><span style="color:#64748b">Lengte − X</span> = <strong style="color:#e2e8f0">${(L - px).toFixed(3)} m</strong></div>
        <div style="color:#94a3b8">&#8593; Kant van straat (boven)</div>
        <div><span style="color:#64748b">Y</span> = <strong style="color:#e2e8f0">${py.toFixed(3)} m</strong></div>
        <div style="color:#94a3b8">&#8595; Kant van straat (onder)</div>
        <div><span style="color:#64748b">Breedte − Y</span> = <strong style="color:#e2e8f0">${(B - py).toFixed(3)} m</strong></div>
      </div>

      <hr style="border:none;border-top:1px solid #2d3d52;margin:.75rem 0">
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:.6rem">
        Afstandscontrole
      </div>
      <table style="font-size:.82rem;font-family:monospace;border-collapse:collapse;width:100%;max-width:420px">
        <thead>
          <tr style="color:#64748b;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em">
            <th style="text-align:left;padding:.2rem .5rem .2rem 0;font-weight:600">Meting</th>
            <th style="text-align:right;padding:.2rem .4rem;font-weight:600">Ingevoerd</th>
            <th style="text-align:right;padding:.2rem .4rem;font-weight:600">Berekend</th>
            <th style="text-align:right;padding:.2rem 0 .2rem .4rem;font-weight:600">Verschil</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-top:1px solid #1e293b">
            <td style="padding:.3rem .5rem .3rem 0;color:#38bdf8">Hoek ${hA} → punt</td>
            <td style="text-align:right;padding:.3rem .4rem;color:#cbd5e1">${dA.toFixed(3)} m</td>
            <td style="text-align:right;padding:.3rem .4rem;color:#cbd5e1">${calcDistA.toFixed(3)} m</td>
            <td style="text-align:right;padding:.3rem 0 .3rem .4rem">${fmtErr(Math.abs(calcDistA - dA))}</td>
          </tr>
          <tr style="border-top:1px solid #1e293b">
            <td style="padding:.3rem .5rem .3rem 0;color:#fb923c">Hoek ${hB} → punt</td>
            <td style="text-align:right;padding:.3rem .4rem;color:#cbd5e1">${dB.toFixed(3)} m</td>
            <td style="text-align:right;padding:.3rem .4rem;color:#cbd5e1">${calcDistB.toFixed(3)} m</td>
            <td style="text-align:right;padding:.3rem 0 .3rem .4rem">${fmtErr(Math.abs(calcDistB - dB))}</td>
          </tr>
          ${calcCRow}
        </tbody>
      </table>

      <hr style="border:none;border-top:1px solid #2d3d52;margin:.75rem 0">
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:.6rem">
        Omgeving winnaar (vakjenummers)
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.3rem;max-width:240px;font-family:monospace">
        ${gridCells.join('')}
      </div>

      <hr style="border:none;border-top:1px solid #2d3d52;margin:.75rem 0">
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:.5rem">
        Hoekpunten winnend vakje
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem .75rem;font-size:.82rem;font-family:monospace">
        <span style="color:#94a3b8">↖ links-boven</span>  <strong>(${c0[0]}, ${c0[1]})</strong>
        <span style="color:#94a3b8">↗ rechts-boven</span> <strong>(${c1[0]}, ${c1[1]})</strong>
        <span style="color:#94a3b8">↙ links-onder</span>  <strong>(${c2[0]}, ${c2[1]})</strong>
        <span style="color:#94a3b8">↘ rechts-onder</span> <strong>(${c3[0]}, ${c3[1]})</strong>
      </div>

      ${ambiguous ? '<div class="warn-txt" style="margin-top:.5rem">&#9888; Beide snijpunten lagen binnen het veld — meest centrale punt gekozen. Voeg Meting C toe voor zekerheid.</div>' : ''}
      ${resolvedByC ? '<div style="color:#a78bfa;font-size:.8rem;margin-top:.3rem">&#10003; Meting C heeft het snijpunt eenduidig bepaald.</div>' : ''}
    </div>`;
}

function showError(msg) {
  document.getElementById('output-card').style.display    = 'block';
  document.getElementById('full-grid-card').style.display = 'none';
  document.getElementById('result-text').innerHTML =
    `<div class="result-box error">${msg}</div>`;
}

// ── Canvas: field overview ────────────────────────────────────────────────────

function drawField({ L, B, cols, rows, cellW, cellH, ax, ay, dA, bx, by, dB,
                     px, py, col, row, allPts, hA, hB, hC, dC, hasC, luckyLoser }) {
  const canvas = document.getElementById('fieldCanvas');
  const PAD = 52;
  const containerW = canvas.parentElement.clientWidth || 800;
  const maxW  = Math.min(containerW, 820);
  const scale = Math.min((maxW - 2*PAD) / L, (560 - 2*PAD) / B);

  const W = Math.round(L * scale + 2*PAD);
  const H = Math.round(B * scale + 2*PAD);
  canvas.width  = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  const fx = x => PAD + x * scale;   // field-coord → canvas-x
  const fy = y => PAD + y * scale;   // field-coord → canvas-y

  // Background
  ctx.fillStyle = '#080f1a';
  ctx.fillRect(0, 0, W, H);

  // Grass
  const grad = ctx.createLinearGradient(fx(0), fy(0), fx(L), fy(B));
  grad.addColorStop(0, '#14532d');
  grad.addColorStop(1, '#166534');
  ctx.fillStyle = grad;
  ctx.fillRect(fx(0), fy(0), L*scale, B*scale);

  // Grid lines
  const pixW = cellW * scale, pixH = cellH * scale;
  if (pixW >= 2) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.5;
    const stepC = pixW < 4 ? Math.ceil(4 / pixW) : 1;
    for (let c = 0; c <= cols; c += stepC) {
      ctx.beginPath(); ctx.moveTo(fx(c*cellW), fy(0)); ctx.lineTo(fx(c*cellW), fy(B)); ctx.stroke();
    }
  }
  if (pixH >= 2) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.5;
    const stepR = pixH < 4 ? Math.ceil(4 / pixH) : 1;
    for (let r = 0; r <= rows; r += stepR) {
      ctx.beginPath(); ctx.moveTo(fx(0), fy(r*cellH)); ctx.lineTo(fx(L), fy(r*cellH)); ctx.stroke();
    }
  }

  const cellPixW = Math.max(cellW * scale, 2);
  const cellPixH = Math.max(cellH * scale, 2);

  // Neighbour cells — amber fill
  const neighbourOffsets = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  ctx.fillStyle = 'rgba(234,179,8,0.18)';
  neighbourOffsets.forEach(([dc, dr]) => {
    const nc = col + dc, nr = row + dr;
    if (nc >= 0 && nc < cols && nr >= 0 && nr < rows)
      ctx.fillRect(fx(nc*cellW), fy(nr*cellH), cellPixW, cellPixH);
  });

  // Lucky loser cell
  if (luckyLoser) {
    ctx.fillStyle = 'rgba(245,158,11,0.35)';
    ctx.fillRect(fx(luckyLoser.col*cellW), fy(luckyLoser.row*cellH), cellPixW, cellPixH);
  }

  // Winning cell — glow
  const winX = fx(col * cellW), winY = fy(row * cellH);
  const glow = ctx.createRadialGradient(
    winX + cellPixW/2, winY + cellPixH/2, 0,
    winX + cellPixW/2, winY + cellPixH/2, Math.max(cellPixW, cellPixH)
  );
  glow.addColorStop(0, 'rgba(34,197,94,0.55)');
  glow.addColorStop(1, 'rgba(34,197,94,0.15)');
  ctx.fillStyle = glow;
  ctx.fillRect(winX, winY, cellPixW, cellPixH);

  // Neighbour borders
  if (cellPixW >= 3 && cellPixH >= 3) {
    ctx.strokeStyle = 'rgba(234,179,8,0.55)'; ctx.lineWidth = 1;
    ctx.setLineDash([3,2]);
    neighbourOffsets.forEach(([dc, dr]) => {
      const nc = col + dc, nr = row + dr;
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows)
        ctx.strokeRect(fx(nc*cellW), fy(nr*cellH), cellPixW, cellPixH);
    });
    ctx.setLineDash([]);
  }

  // Lucky loser border
  if (luckyLoser) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = Math.max(1.5, Math.min(3, cellPixW / 5));
    ctx.strokeRect(fx(luckyLoser.col*cellW), fy(luckyLoser.row*cellH), cellPixW, cellPixH);
  }

  // Winning cell border
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = Math.max(1.5, Math.min(3, cellPixW / 5));
  ctx.strokeRect(winX, winY, cellPixW, cellPixH);

  // Cell numbers
  if (cellPixW >= 14 && cellPixH >= 11) {
    const winNum = row * cols + col + 1;
    const fs = Math.min(13, Math.max(7, Math.floor(Math.min(cellPixW, cellPixH) * 0.38)));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    neighbourOffsets.forEach(([dc, dr]) => {
      const nc = col + dc, nr = row + dr;
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
        const num = nr * cols + nc + 1;
        ctx.font = `bold ${fs}px system-ui`;
        ctx.fillStyle = 'rgba(8,15,26,0.5)';
        ctx.fillText(String(num), fx(nc*cellW) + cellPixW/2 + 1, fy(nr*cellH) + cellPixH/2 + 1);
        ctx.fillStyle = 'rgba(234,179,8,0.95)';
        ctx.fillText(String(num), fx(nc*cellW) + cellPixW/2, fy(nr*cellH) + cellPixH/2);
      }
    });

    if (luckyLoser) {
      const lx = fx(luckyLoser.col*cellW) + cellPixW/2;
      const ly = fy(luckyLoser.row*cellH) + cellPixH/2;
      ctx.font = `bold ${fs}px system-ui`;
      ctx.fillStyle = 'rgba(8,15,26,0.5)';
      ctx.fillText(String(luckyLoser.num), lx + 1, ly + 1);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(String(luckyLoser.num), lx, ly);
    }

    ctx.font = `bold ${fs}px system-ui`;
    ctx.fillStyle = 'rgba(8,15,26,0.5)';
    ctx.fillText(String(winNum), winX + cellPixW/2 + 1, winY + cellPixH/2 + 1);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(String(winNum), winX + cellPixW/2, winY + cellPixH/2);
  }

  // Circles (clipped to canvas)
  const drawCircle = (ox, oy, radius, color) => {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.beginPath(); ctx.arc(fx(ox), fy(oy), radius * scale, 0, Math.PI * 2);
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  };
  drawCircle(ax, ay, dA, 'rgba(56,189,248,0.55)');
  drawCircle(bx, by, dB, 'rgba(251,146,60,0.55)');
  if (hasC) {
    const [ccx, ccy] = getCorner(hC, L, B);
    drawCircle(ccx, ccy, dC, 'rgba(167,139,250,0.55)');
  }

  // Distance lines (dashed)
  ctx.setLineDash([4,3]); ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(56,189,248,0.35)';
  ctx.beginPath(); ctx.moveTo(fx(ax), fy(ay)); ctx.lineTo(fx(px), fy(py)); ctx.stroke();
  ctx.strokeStyle = 'rgba(251,146,60,0.35)';
  ctx.beginPath(); ctx.moveTo(fx(bx), fy(by)); ctx.lineTo(fx(px), fy(py)); ctx.stroke();
  if (hasC) {
    const [ccx, ccy] = getCorner(hC, L, B);
    ctx.strokeStyle = 'rgba(167,139,250,0.35)';
    ctx.beginPath(); ctx.moveTo(fx(ccx), fy(ccy)); ctx.lineTo(fx(px), fy(py)); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Field border
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
  ctx.strokeRect(fx(0), fy(0), L*scale, B*scale);

  // Axis ticks
  ctx.fillStyle = '#4b5e77'; ctx.font = '10px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const ticksX = Math.min(10, cols);
  for (let i = 0; i <= ticksX; i++) {
    const v = (L / ticksX) * i;
    ctx.fillText(Number.isInteger(v) ? v : v.toFixed(1), fx(v), fy(B) + 5);
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const ticksY = Math.min(10, rows);
  for (let i = 0; i <= ticksY; i++) {
    const v = (B / ticksY) * i;
    ctx.fillText(Number.isInteger(v) ? v : v.toFixed(1), fx(0) - 5, fy(v));
  }

  // Axis labels
  ctx.fillStyle = '#475569'; ctx.font = '11px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('X  —  Kant van straat (m)', fx(L/2), H - 2);
  ctx.save();
  ctx.translate(13, fy(B/2)); ctx.rotate(-Math.PI/2);
  ctx.textBaseline = 'top';
  ctx.fillText('Y  —  Kant van parking (m)', 0, 0);
  ctx.restore();

  // Corner dots + labels
  [[0,0,'H1',-1,-1],[L,0,'H2',1,-1],[0,B,'H3',-1,1],[L,B,'H4',1,1]].forEach(([cfx,cfy,lbl,sx,sy]) => {
    ctx.fillStyle = '#475569';
    ctx.beginPath(); ctx.arc(fx(cfx), fy(cfy), 4, 0, Math.PI*2); ctx.fill();
    ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#64748b';
    ctx.textAlign = sx < 0 ? 'right' : 'left';
    ctx.textBaseline = sy < 0 ? 'bottom' : 'top';
    ctx.fillText(lbl, fx(cfx) + sx*7, fy(cfy) + sy*7);
  });

  // Highlight selected corners
  const highlightCorner = (ox, oy, color) => {
    ctx.beginPath(); ctx.arc(fx(ox), fy(oy), 9, 0, Math.PI*2);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  };
  highlightCorner(ax, ay, '#38bdf8');
  highlightCorner(bx, by, '#fb923c');
  if (hasC) { const [ccx, ccy] = getCorner(hC, L, B); highlightCorner(ccx, ccy, '#a78bfa'); }

  // Rejected intersection point
  allPts.forEach(([ix, iy]) => {
    if (Math.abs(ix - px) > 0.001 || Math.abs(iy - py) > 0.001) {
      ctx.beginPath(); ctx.arc(fx(ix), fy(iy), 5, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(239,68,68,0.4)'; ctx.fill();
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#ef4444'; ctx.font = '9px system-ui';
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('✕', fx(ix)+7, fy(iy)-4);
    }
  });

  // Crosshair
  ctx.strokeStyle = 'rgba(34,197,94,0.3)'; ctx.lineWidth = 1;
  ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(fx(0), fy(py)); ctx.lineTo(fx(L), fy(py)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx(px), fy(0)); ctx.lineTo(fx(px), fy(B)); ctx.stroke();
  ctx.setLineDash([]);

  // Intersection dot
  ctx.beginPath(); ctx.arc(fx(px), fy(py), 8, 0, Math.PI*2);
  ctx.fillStyle = '#22c55e'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();

  // Winning cell corners
  const winCorners = [
    { cfx: col*cellW,       cfy: row*cellH,       ta:-1, tb:-1 },
    { cfx: (col+1)*cellW,   cfy: row*cellH,       ta: 1, tb:-1 },
    { cfx: col*cellW,       cfy: (row+1)*cellH,   ta:-1, tb: 1 },
    { cfx: (col+1)*cellW,   cfy: (row+1)*cellH,   ta: 1, tb: 1 },
  ];
  const showCornerLabels = cellPixW >= 48 && cellPixH >= 28;
  winCorners.forEach(({ cfx, cfy, ta, tb }) => {
    ctx.beginPath(); ctx.arc(fx(cfx), fy(cfy), 4.5, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5; ctx.stroke();
    if (showCornerLabels) {
      const lbl = `(${cfx.toFixed(2)},${cfy.toFixed(2)})`;
      ctx.font = 'bold 9px system-ui';
      const tw = ctx.measureText(lbl).width;
      const lx = fx(cfx) + ta*(tw/2 + 5), ly = fy(cfy) + tb*10;
      ctx.fillStyle = 'rgba(8,15,26,0.75)';
      ctx.fillRect(lx - tw/2 - 2, ly - 7, tw + 4, 13);
      ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lbl, lx, ly);
    }
  });

  // Coordinate label next to intersection dot
  const lblTxt = `(${px.toFixed(2)}, ${py.toFixed(2)})`;
  const lblX = fx(px) + 12, lblY = fy(py) - 6;
  ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(8,15,26,0.7)';
  ctx.fillRect(lblX - 2, lblY - 13, ctx.measureText(lblTxt).width + 4, 15);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(lblTxt, lblX, lblY);

  // Legend
  const legItems = [
    ['#38bdf8', `Hoek ${hA}  (${dA} m)`],
    ['#fb923c', `Hoek ${hB}  (${dB} m)`],
    ...(hasC ? [['#a78bfa', `Hoek ${hC}  (${dC} m)`]] : []),
    ['#22c55e', 'Winnaar'],
    ...(luckyLoser ? [['#f59e0b', `Lucky loser (#${luckyLoser.num})`]] : []),
    ['rgba(234,179,8,0.7)', 'Buurvakjes'],
  ];
  const legX0 = fx(0) + 8, legY0 = fy(0) + 10;
  const legW = 160, legH = legItems.length * 17 + 8;
  ctx.fillStyle = 'rgba(8,15,26,0.65)';
  ctxRoundRect(ctx, legX0, legY0, legW, legH, 4);
  ctx.fill();
  ctx.font = '10px system-ui';
  legItems.forEach(([color, text], i) => {
    const y = legY0 + 8 + i * 17;
    ctx.fillStyle = color; ctx.fillRect(legX0 + 6, y, 10, 10);
    ctx.fillStyle = '#cbd5e1'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(text, legX0 + 20, y);
  });
}

// ── Canvas: full grid ─────────────────────────────────────────────────────────

let _fullGridWinCol = 0, _fullGridWinRow = 0, _fullGridCell = 28, _fullGridRows = 1;

function renderFullGrid(cols, rows, winCol, winRow, luckyLoser, excludedByOrg) {
  _fullGridWinCol = winCol;
  _fullGridWinRow = winRow;
  _fullGridRows   = rows;

  const canvas  = document.getElementById('fullGridCanvas');
  const wrapper = document.getElementById('full-grid-scroll');
  const wrapW   = wrapper.clientWidth || 800;

  const CELL  = Math.max(20, Math.min(52, Math.floor((wrapW - 2) / cols)));
  _fullGridCell = CELL;

  const HDR_W = Math.max(24, String(rows).length * 8 + 10);
  const HDR_H = 22;

  canvas.width  = HDR_W + cols * CELL + 1;
  canvas.height = HDR_H + rows * CELL + 1;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#080f1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Build neighbour set (0-based indices)
  const neighbourSet = new Set();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nc = winCol + dc, nr = winRow + dr;
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows)
        neighbourSet.add(nr * cols + nc);
    }
  }

  const luckyIdx = luckyLoser ? luckyLoser.row * cols + luckyLoser.col : -1;
  const fs = Math.max(7, Math.min(13, Math.floor(CELL * 0.42)));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x   = HDR_W + c * CELL;
      const y   = HDR_H + r * CELL;
      const idx = r * cols + c;
      const isWin      = c === winCol && r === winRow;
      const isLucky    = idx === luckyIdx;
      const isExcluded = excludedByOrg.has(idx);
      const isNeighbour = neighbourSet.has(idx);

      // Priority: win > lucky > excluded > neighbour > normal
      ctx.fillStyle = isWin       ? 'rgba(34,197,94,0.32)'
                    : isLucky     ? 'rgba(245,158,11,0.35)'
                    : isExcluded  ? 'rgba(239,68,68,0.15)'
                    : isNeighbour ? 'rgba(234,179,8,0.22)'
                    : '#1a2540';
      ctx.fillRect(x, y, CELL, CELL);

      ctx.strokeStyle = isWin       ? '#22c55e'
                      : isLucky     ? '#f59e0b'
                      : isExcluded  ? 'rgba(239,68,68,0.5)'
                      : isNeighbour ? 'rgba(234,179,8,0.6)'
                      : '#243050';
      ctx.lineWidth = (isWin || isLucky) ? 1.5 : 0.5;
      if (isNeighbour && !isWin && !isLucky && !isExcluded) ctx.setLineDash([3,2]);
      ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      ctx.setLineDash([]);

      ctx.font = `${(isWin || isLucky || isNeighbour) ? 'bold ' : ''}${fs}px system-ui`;
      ctx.fillStyle = isWin       ? '#4ade80'
                    : isLucky     ? '#fbbf24'
                    : isExcluded  ? 'rgba(239,68,68,0.55)'
                    : isNeighbour ? '#fbbf24'
                    : '#3d5070';
      ctx.fillText(String(idx + 1), x + CELL/2, y + CELL/2);
    }
  }

  // Thick border over winner
  { const x = HDR_W + winCol*CELL, y = HDR_H + winRow*CELL;
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2.5;
    ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2); }

  // Thick border over lucky loser
  if (luckyLoser) {
    const x = HDR_W + luckyLoser.col*CELL, y = HDR_H + luckyLoser.row*CELL;
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5;
    ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
  }

  // Column headers
  ctx.fillStyle = '#111c30';
  ctx.fillRect(HDR_W, 0, cols * CELL + 1, HDR_H);
  const hFs = Math.max(6, Math.min(10, Math.floor(CELL * 0.35)));
  ctx.font = `bold ${hFs}px system-ui`; ctx.fillStyle = '#4b5e77';
  for (let c = 0; c < cols; c++)
    ctx.fillText(String(c + 1), HDR_W + c*CELL + CELL/2, HDR_H/2);

  // Row headers
  ctx.fillStyle = '#111c30';
  ctx.fillRect(0, HDR_H, HDR_W, rows * CELL + 1);
  ctx.font = `bold ${hFs}px system-ui`; ctx.fillStyle = '#4b5e77';
  ctx.textAlign = 'right';
  for (let r = 0; r < rows; r++)
    ctx.fillText(String(r + 1), HDR_W - 4, HDR_H + r*CELL + CELL/2);

  // Corner
  ctx.fillStyle = '#080f1a';
  ctx.fillRect(0, 0, HDR_W, HDR_H);

  // Separator lines
  ctx.strokeStyle = '#2d3d52'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, HDR_H); ctx.lineTo(canvas.width, HDR_H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(HDR_W, 0); ctx.lineTo(HDR_W, canvas.height); ctx.stroke();

  scrollToWinner();
}

function scrollToWinner() {
  const wrapper = document.getElementById('full-grid-scroll');
  const HDR_W   = Math.max(24, String(_fullGridRows).length * 8 + 10);
  const HDR_H   = 22;
  const wx = HDR_W + _fullGridWinCol * _fullGridCell;
  const wy = HDR_H + _fullGridWinRow * _fullGridCell;
  wrapper.scrollLeft = Math.max(0, wx - wrapper.clientWidth  / 2 + _fullGridCell / 2);
  wrapper.scrollTop  = Math.max(0, wy - wrapper.clientHeight / 2 + _fullGridCell / 2);
}
