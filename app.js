const TEAM_COLORS = {
  0: { bg: '#1e3a2a', fg: '#4ade80', border: '#22c55e' },
  1: { bg: '#3a2a1e', fg: '#fbbf24', border: '#f59e0b' },
  2: { bg: '#2a1e3a', fg: '#c084fc', border: '#a855f7' },
};

TEAM_COLORS[3] = { bg: '#3a1e2a', fg: '#f472b6', border: '#ec4899' };

let DATA = null;

async function loadData() {
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('missing');
    DATA = await res.json();
  } catch (e) {
    DATA = null;
  }
}

function computePlayerTotals(players) {
  return players.map(p => ({
    ...p,
    total: p.dns ? null : p.scores.reduce((a, b) => a + b, 0),
    best: p.dns || p.scores.length === 0 ? null : Math.min(...p.scores),
    worst: p.dns || p.scores.length === 0 ? null : Math.max(...p.scores),
  }));
}

function computeTeamTotals(teams, players) {
  return teams.map((t, i) => {
    const roster = players.filter(p => p.team === i);
    const active = roster.filter(p => !p.dns);
    const dns = active.length === 0 && roster.length > 0;
    const total = active.reduce((s, p) => s + p.total, 0);
    return {
      name: t,
      index: i,
      players: roster,
      total: dns ? null : total,
      avg: !dns && active.length ? total / active.length : null,
      dns,
    };
  });
}

function rankRowClass(i) {
  if (i === 0) return 'rank-1';
  if (i === 1) return 'rank-2';
  if (i === 2) return 'rank-3';
  return '';
}

function renderTeamTable(teams) {
  const tbody = document.querySelector('#team-table tbody');
  const active = teams.filter(t => !t.dns).sort((a, b) => a.total - b.total);
  const dns = teams.filter(t => t.dns);
  const rows = [
    ...active.map((t, i) => {
      const c = TEAM_COLORS[t.index] || TEAM_COLORS[0];
      return `<tr class="${rankRowClass(i)}">
        <td>${i + 1}</td>
        <td><span class="team-badge" style="background:${c.bg};color:${c.fg};border-color:${c.border}">${t.name}</span></td>
        <td>${t.players.map(p => p.name).join(', ')}</td>
        <td><strong>${t.total}</strong></td>
        <td>${t.avg.toFixed(1)}</td>
      </tr>`;
    }),
    ...dns.map(t => {
      const c = TEAM_COLORS[t.index] || TEAM_COLORS[0];
      return `<tr class="dns-row">
        <td>—</td>
        <td><span class="team-badge" style="background:${c.bg};color:${c.fg};border-color:${c.border}">${t.name}</span></td>
        <td>${t.players.map(p => p.name).join(', ')}</td>
        <td colspan="2"><span class="dns-tag">DNS</span></td>
      </tr>`;
    }),
  ];
  tbody.innerHTML = rows.join('');
}

function renderPlayerTable(players, teams, sortMode) {
  const tbody = document.querySelector('#player-table tbody');
  const active = players.filter(p => !p.dns);
  const dns = players.filter(p => p.dns);
  switch (sortMode) {
    case 'total-desc': active.sort((a, b) => b.total - a.total); break;
    case 'name': active.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'team': active.sort((a, b) => a.team - b.team || a.total - b.total); break;
    default: active.sort((a, b) => a.total - b.total);
  }
  const rows = [
    ...active.map((p, i) => {
      const c = TEAM_COLORS[p.team] || TEAM_COLORS[0];
      return `<tr class="${sortMode === 'total' ? rankRowClass(i) : ''}">
        <td>${i + 1}</td>
        <td>${p.name}</td>
        <td><span class="team-badge" style="background:${c.bg};color:${c.fg};border-color:${c.border}">${teams[p.team]}</span></td>
        <td><strong>${p.total}</strong></td>
        <td>${p.best}</td>
        <td>${p.worst}</td>
      </tr>`;
    }),
    ...dns.map(p => {
      const c = TEAM_COLORS[p.team] || TEAM_COLORS[0];
      return `<tr class="dns-row">
        <td>—</td>
        <td>${p.name}</td>
        <td><span class="team-badge" style="background:${c.bg};color:${c.fg};border-color:${c.border}">${teams[p.team]}</span></td>
        <td colspan="3"><span class="dns-tag">DNS</span></td>
      </tr>`;
    }),
  ];
  tbody.innerHTML = rows.join('');
}

function scoreColor(score, min, max) {
  if (max === min) return { bg: 'rgba(74,222,128,0.15)', fg: 'var(--ink)' };
  const t = (score - min) / (max - min);
  const hue = 130 - t * 130;
  return { bg: `hsla(${hue}, 65%, 40%, 0.35)`, fg: '#fff' };
}

function renderScorecard(players, holes) {
  const table = document.querySelector('#scorecard');
  const active = players.filter(p => !p.dns);
  const dns = players.filter(p => p.dns);
  const allScores = active.flatMap(p => p.scores);
  const min = Math.min(...allScores);
  const max = Math.max(...allScores);

  const head = `<thead><tr><th>Player</th>${
    Array.from({ length: holes }, (_, i) => `<th>H${i + 1}</th>`).join('')
  }<th>Total</th></tr></thead>`;

  const activeRows = active.map(p => `
    <tr>
      <td>${p.name}</td>
      ${p.scores.map(s => {
        const c = scoreColor(s, min, max);
        return `<td><span class="cell" style="background:${c.bg};color:${c.fg}">${s}</span></td>`;
      }).join('')}
      <td class="total-col">${p.total}</td>
    </tr>`).join('');

  const dnsRows = dns.map(p => `
    <tr class="dns-row">
      <td>${p.name}</td>
      <td colspan="${holes + 1}"><span class="dns-tag">DNS</span></td>
    </tr>`).join('');

  table.innerHTML = head + `<tbody>${activeRows}${dnsRows}</tbody>`;
}

let chartInstance = null;
function renderChart(players, teams, holes) {
  const ctx = document.getElementById('chart');
  const datasets = players.filter(p => !p.dns).map(p => {
    const c = TEAM_COLORS[p.team] || TEAM_COLORS[0];
    let running = 0;
    const cumulative = p.scores.map(s => (running += s));
    return {
      label: `${p.name} (${teams[p.team]})`,
      data: cumulative,
      borderColor: c.fg,
      backgroundColor: c.fg + '33',
      tension: 0.25,
      borderWidth: 2,
      pointRadius: 3,
    };
  });

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array.from({ length: holes }, (_, i) => `H${i + 1}`),
      datasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#e8f5ec', boxWidth: 12 } },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { ticks: { color: '#98b0a2' }, grid: { color: '#26382d' } },
        y: { ticks: { color: '#98b0a2' }, grid: { color: '#26382d' }, title: { display: true, text: 'Cumulative strokes', color: '#98b0a2' } },
      },
    },
  });
}

function renderEmpty() {
  document.getElementById('subtitle').textContent = 'No results yet — add scores to data.json to see the leaderboard.';
  const empty = '<tbody><tr><td class="empty" colspan="6">Waiting for results…</td></tr></tbody>';
  document.querySelector('#team-table').insertAdjacentHTML('beforeend', empty);
  document.querySelector('#player-table').insertAdjacentHTML('beforeend', empty);
  document.querySelector('#scorecard').innerHTML = '<tbody><tr><td class="empty">Waiting for results…</td></tr></tbody>';
}

function renderAll() {
  if (!DATA || !DATA.players || DATA.players.length === 0) {
    renderEmpty();
    return;
  }
  const holes = DATA.holes || (DATA.players.find(p => !p.dns) || DATA.players[0]).scores.length;
  const players = computePlayerTotals(DATA.players);
  const teams = computeTeamTotals(DATA.teams, players);

  const dateStr = DATA.date ? new Date(DATA.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const parts = [DATA.event, dateStr, `${holes} holes`].filter(Boolean).join(' · ');
  const notes = DATA.notes ? ` — ${DATA.notes}` : '';
  document.getElementById('subtitle').textContent = parts + notes;

  renderTeamTable(teams);
  renderPlayerTable(players, DATA.teams, 'total');
  renderScorecard(players, holes);
  renderChart(players, DATA.teams, holes);

  document.getElementById('sort-select').addEventListener('change', (e) => {
    renderPlayerTable(players, DATA.teams, e.target.value);
  });
}

loadData().then(renderAll).then(loadGallery);

async function loadGallery() {
  try {
    const res = await fetch('photos/manifest.json', { cache: 'no-store' });
    if (!res.ok) return;
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) return;

    const card = document.getElementById('gallery-card');
    const gallery = document.getElementById('gallery');
    const srcs = items.map(item => 'photos/' + (typeof item === 'string' ? item : item.src));
    gallery.innerHTML = items.map((item, i) => {
      const src = typeof item === 'string' ? item : item.src;
      const caption = typeof item === 'string' ? '' : (item.caption || '');
      return `<figure data-index="${i}">
        <img src="photos/${src}" alt="${caption}" loading="lazy" />
        ${caption ? `<figcaption>${caption}</figcaption>` : ''}
      </figure>`;
    }).join('');
    card.hidden = false;

    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    let currentIndex = -1;

    const show = (i) => {
      currentIndex = (i + srcs.length) % srcs.length;
      lightboxImg.src = srcs[currentIndex];
      counter.textContent = `${currentIndex + 1} / ${srcs.length}`;
      lightbox.hidden = false;
    };
    const close = () => { lightbox.hidden = true; lightboxImg.src = ''; currentIndex = -1; };

    gallery.addEventListener('click', (e) => {
      const fig = e.target.closest('figure');
      if (!fig) return;
      show(parseInt(fig.dataset.index, 10));
    });
    document.getElementById('lightbox-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      show(currentIndex - 1);
    });
    document.getElementById('lightbox-next').addEventListener('click', (e) => {
      e.stopPropagation();
      show(currentIndex + 1);
    });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target === lightboxImg) close();
    });
    document.addEventListener('keydown', (e) => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(currentIndex - 1);
      else if (e.key === 'ArrowRight') show(currentIndex + 1);
    });
  } catch (_) {}
}
