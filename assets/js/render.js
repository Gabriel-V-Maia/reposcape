/* assets/js/render.js — lógica da página city.html */

let ALL_BUILDINGS = [];
let CITY_DATA = null;

// ── Inicialização ────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  injectStars();
  animateLoadingBars();

  try {
    if (USERNAME) {
      await loadGithubCity(USERNAME);
    } else if (SEED !== null) {
      await loadSeedCity(SEED);
    }
  } catch (err) {
    showError(err.message || 'Erro inesperado.');
  }
});

function injectStars() {
  const vp = document.getElementById('city-viewport');
  if (!vp) return;
  // Stars serão desenhadas no fundo do viewport após ele aparecer
  // Usamos o bg gradient do CSS; estrelas são opcionais aqui
}

function animateLoadingBars() {
  const anim = document.getElementById('loading-anim');
  if (!anim) return;
  const colors = ['#3178c6','#f0db4f','#3572A5','#00ADD8','#dea584','#e34c26','#F05138'];
  for (let i = 0; i < 9; i++) {
    const bar = document.createElement('div');
    bar.className = 'loading-bar';
    const h = 16 + Math.random() * 32;
    bar.style.cssText = `height:${h}px;background:${colors[i % colors.length]};animation-delay:${i * 0.13}s`;
    anim.appendChild(bar);
  }
}

// ── Loaders ──────────────────────────────────────────────────────────────────

async function loadGithubCity(username) {
  setLoadingText('Buscando repositórios...', `@${username}`);

  const res = await fetch(`/api/city/${username}`);
  const json = await res.json();

  if (!json.ok) throw new Error(json.error);

  CITY_DATA = json.data;
  ALL_BUILDINGS = json.data.buildings;
  renderCity();
  showCity(json.data);
}

async function loadSeedCity(seed) {
  setLoadingText('Gerando cidade aleatória...', `seed #${seed}`);

  const res = await fetch(`/api/seed?s=${seed}&n=24`);
  const json = await res.json();

  if (!json.ok) throw new Error(json.error);

  CITY_DATA = json.data;
  ALL_BUILDINGS = json.data.buildings;
  renderCity();
  showCity(json.data);
}

// ── Render ───────────────────────────────────────────────────────────────────

function getFilteredBuildings() {
  const filter = document.getElementById('filter-sel')?.value || 'all';
  const sort   = document.getElementById('sort-sel')?.value || 'commits';

  let list = [...ALL_BUILDINGS];
  if (filter === 'original') list = list.filter(b => !b.fork);
  if (filter === 'forks')    list = list.filter(b => b.fork);

  if (sort === 'commits') list.sort((a, b) => b.commits - a.commits);
  else if (sort === 'stars') list.sort((a, b) => b.stars - a.stars);
  else list.sort((a, b) => a.name.localeCompare(b.name));

  return list;
}

function renderCity() {
  const stage = document.getElementById('city-stage');
  const tooltip = document.getElementById('tooltip');
  stage.innerHTML = '';

  const buildings = getFilteredBuildings();

  document.getElementById('repo-count').textContent = `${buildings.length} repos`;

  buildings.forEach(b => {
    const wrap = document.createElement('div');
    wrap.className = 'b-wrap';

    // Antenna
    if (b.antenna) {
      const ant = document.createElement('div');
      ant.className = 'b-antenna';
      ant.style.height = `${b.antenna_height}px`;
      wrap.appendChild(ant);
    }

    // Label
    const label = document.createElement('div');
    label.className = 'b-label';
    label.textContent = b.name;
    wrap.appendChild(label);

    // Body
    const body = document.createElement('div');
    body.className = 'b-body';
    body.style.width  = b.width + 'px';
    body.style.height = b.height + 'px';
    body.style.background = b.color;

    // Windows
    const wins = b.windows;
    if (wins && wins.cols > 0 && wins.rows > 0) {
      const wgrid = document.createElement('div');
      wgrid.className = 'b-windows';
      wgrid.style.gridTemplateColumns = `repeat(${wins.cols}, 1fr)`;
      wgrid.style.gridTemplateRows    = `repeat(${wins.rows}, 1fr)`;
      wins.lit.forEach(lit => {
        const w = document.createElement('div');
        w.className = 'b-win';
        w.style.background = lit
          ? 'rgba(255, 238, 140, 0.75)'
          : 'rgba(0, 0, 0, 0.45)';
        wgrid.appendChild(w);
      });
      body.appendChild(wgrid);
    }

    if (b.fork) {
      const tag = document.createElement('div');
      tag.className = 'b-fork-tag';
      tag.textContent = 'fork';
      body.appendChild(tag);
    }

    wrap.appendChild(body);

    wrap.addEventListener('mouseenter', (e) => showTooltip(b, e));
    wrap.addEventListener('mousemove',  (e) => moveTooltip(e));
    wrap.addEventListener('mouseleave', hideTooltip);
    wrap.addEventListener('click', () => {
      if (b.url && b.url !== '#') window.open(b.url, '_blank');
    });

    stage.appendChild(wrap);
  });

  setTimeout(() => {
    const scroll = document.getElementById('city-scroll');
    scroll.scrollLeft = (scroll.scrollWidth - scroll.clientWidth) / 2;
  }, 80);
}

function applyFilter() {
  renderCity();
}

// TODO: REDO
function showCity(data) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('city-viewport').style.display = 'block';
  document.getElementById('filter-bar').style.display = 'flex';

  
  const sub = document.getElementById('header-sub');
  sub.textContent = `${data.buildings.length} repos · ${data.total_commits.toLocaleString('pt-BR')} commits`;

  document.getElementById('ground-label').textContent =
    data.is_seed ? `seed #${data.seed}` : `github.com/${data.username}`;

  const legend = document.getElementById('lang-legend');
  (data.languages || []).slice(0, 4).forEach(lang => {
    const dot = document.createElement('div');
    dot.className = 'lang-dot';
    dot.innerHTML = `<div class="lang-dot-circle" style="background:${lang.color}"></div>${lang.name}`;
    legend.appendChild(dot);
  });

  drawStars(document.getElementById('city-viewport'), 90);
}

function setLoadingText(text, sub = '') {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading-sub').textContent = sub;
}

function showError(msg) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error-screen').style.display = 'flex';
  document.getElementById('error-text').textContent = msg;
}

function showTooltip(b, e) {
  const tt = document.getElementById('tooltip');
  document.getElementById('tt-name').textContent = b.name + (b.fork ? ' 🍴' : '');
  document.getElementById('tt-commits').textContent =
    b.commits.toLocaleString('pt-BR') + ' commits';
  document.getElementById('tt-meta').innerHTML = `
    ${b.description ? `<div style="margin-bottom:4px;color:#c9d1d9">${b.description.slice(0, 90)}${b.description.length > 90 ? '…' : ''}</div>` : ''}
    <div>⭐ ${b.stars} stars</div>
    ${b.language !== 'Unknown'
      ? `<div class="tt-lang"><div class="lang-dot-circle" style="background:${b.color}"></div>${b.language}</div>`
      : ''}
    ${b.url && b.url !== '#'
      ? `<a class="tt-link" href="${b.url}" target="_blank">Abrir no GitHub ↗</a>`
      : ''}
  `;
  tt.style.display = 'block';
  moveTooltip(e);
}

function moveTooltip(e) {
  const tt = document.getElementById('tooltip');
  const x = Math.min(e.clientX + 16, window.innerWidth - 280);
  const y = Math.min(e.clientY - 20, window.innerHeight - 180);
  tt.style.left = x + 'px';
  tt.style.top  = y + 'px';
}

function hideTooltip() {
  document.getElementById('tooltip').style.display = 'none';
}
