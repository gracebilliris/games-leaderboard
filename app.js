const TEAM_COLORS = {
  0: { bg: '#1e3a2a', fg: '#4ade80', border: '#22c55e' },
  1: { bg: '#3a2a1e', fg: '#fbbf24', border: '#f59e0b' },
  2: { bg: '#2a1e3a', fg: '#c084fc', border: '#a855f7' },
};

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
    total: p.scores.reduce((a, b) => a + b, 0),
    best: Math.min(...p.scores),
    worst: Math.max(...p.scores),
  }));
}

function computeTeamTotals(teams, players) {
  return teams.map((t, i) => {
    const roster = players.filter(p => p.team === i);
    const total = roster.reduce((s, p) => s + p.total, 0);
    return {
      name: t,
      index: i,
      players: roster,
      total,
      avg: roster.length ? total / roster.length : 0,
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
  const sorted = [...teams].sort((a, b) => a.total - b.total);
  tbody.innerHTML = sorted.map((t, i) => {
    const c = TEAM_COLORS[t.index];
    return `<tr class="${rankRowClass(i)}">
      <td>${i + 1}</td>
      <td><span class="team-badge" style="background:${c.bg};color:${c.fg};border-color:${c.border}">${t.name}</span></td>
      <td>${t.players.map(p => p.name).join(', ')}</td>
      <td><strong>${t.total}</strong></td>
      <td>${t.avg.toFixed(1)}</td>
    </tr>`;
  }).join('');
}

function renderPlayerTable(players, teams, sortMode) {
  const tbody = document.querySelector('#player-table tbody');
  const sorted = [...players];
  switch (sortMode) {
    case 'total-desc': sorted.sort((a, b) => b.total - a.total); break;
    case 'name': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'team': sorted.sort((a, b) => a.team - b.team || a.total - b.total); break;
    default: sorted.sort((a, b) => a.total - b.total);
  }
  tbody.innerHTML = sorted.map((p, i) => {
    const c = TEAM_COLORS[p.team];
    return `<tr class="${sortMode === 'total' ? rankRowClass(i) : ''}">
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td><span class="team-badge" style="background:${c.bg};color:${c.fg};border-color:${c.border}">${teams[p.team]}</span></td>
      <td><strong>${p.total}</strong></td>
      <td>${p.best}</td>
      <td>${p.worst}</td>
    </tr>`;
  }).join('');
}

function scoreColor(score, min, max) {
  if (max === min) return { bg: 'rgba(74,222,128,0.15)', fg: 'var(--ink)' };
  const t = (score - min) / (max - min);
  const hue = 130 - t * 130;
  return { bg: `hsla(${hue}, 65%, 40%, 0.35)`, fg: '#fff' };
}

function renderScorecard(players, holes) {
  const table = document.querySelector('#scorecard');
  const allScores = players.flatMap(p => p.scores);
  const min = Math.min(...allScores);
  const max = Math.max(...allScores);

  const head = `<thead><tr><th>Player</th>${
    Array.from({ length: holes }, (_, i) => `<th>H${i + 1}</th>`).join('')
  }<th>Total</th></tr></thead>`;

  const body = `<tbody>${players.map(p => `
    <tr>
      <td>${p.name}</td>
      ${p.scores.map(s => {
        const c = scoreColor(s, min, max);
        return `<td><span class="cell" style="background:${c.bg};color:${c.fg}">${s}</span></td>`;
      }).join('')}
      <td class="total-col">${p.total}</td>
    </tr>`).join('')}</tbody>`;

  table.innerHTML = head + body;
}

let chartInstance = null;
function renderChart(players, teams, holes) {
  const ctx = document.getElementById('chart');
  const datasets = players.map(p => {
    const c = TEAM_COLORS[p.team];
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
  const holes = DATA.holes || DATA.players[0].scores.length;
  const players = computePlayerTotals(DATA.players);
  const teams = computeTeamTotals(DATA.teams, players);

  const dateStr = DATA.date ? new Date(DATA.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  document.getElementById('subtitle').textContent = [DATA.event, dateStr, `${holes} holes`].filter(Boolean).join(' · ');

  renderTeamTable(teams);
  renderPlayerTable(players, DATA.teams, 'total');
  renderScorecard(players, holes);
  renderChart(players, DATA.teams, holes);

  document.getElementById('sort-select').addEventListener('change', (e) => {
    renderPlayerTable(players, DATA.teams, e.target.value);
  });
}

loadData().then(renderAll);
