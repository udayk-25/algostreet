/* ============================================
   AlgoStreet — Main App Logic
   SPA router + page renderers + charts
   ============================================ */

// ─── DataService (real NSE/BSE market data) ────
const DataService = {
  // Static fallback data (used when APIs are unavailable/rate-limited)
  fallback: {
    nifty: { price: 22487, chg: 0.68 },
    sensex: { price: 74119, chg: 0.72 },
    vix: { price: 14.8, chg: -2.1 },
    banknifty: { price: 47820, chg: 0.45 },
    niftyit: { price: 38240, chg: 1.12 },
    reliance: { price: 2912, chg: 2.3 },
    tcs: { price: 3918, chg: -0.8 },
    hdfc: { price: 1698, chg: 1.1 },
    infy: { price: 1756, chg: 1.4 },
    icici: { price: 1082, chg: 0.9 },
  },

  fmtPrice(p) { return p >= 1000 ? p.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : p.toFixed(2); },
  fmtChg(c) { return (c >= 0 ? '+' : '') + c.toFixed(2) + '%'; },
  chgClass(c) { return c >= 0 ? 'up' : 'down'; },

  // Stooq — free, no API key, works from browser
  async fetchStooq(symbol) {
    try {
      const r = await fetch(`https://stooq.com/q/l/?s=${symbol}&f=sd2t2ohlcv&h&e=json`, { mode: 'cors' });
      if (!r.ok) return null;
      const d = await r.json();
      return d?.symbols?.[0] ?? null;
    } catch { return null; }
  },

  // Yahoo Finance (query1 — works CORS-free from browser)
  async fetchYahoo(symbol) {
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
        { mode: 'cors' }
      );
      if (!r.ok) return null;
      const d = await r.json();
      const meta = d?.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const price = meta.regularMarketPrice ?? meta.previousClose;
      const prev = meta.chartPreviousClose ?? meta.previousClose;
      const chg = prev > 0 ? ((price - prev) / prev) * 100 : 0;
      return { price, chg };
    } catch { return null; }
  },

  updateTickerEl(priceId, chgId, price, chg) {
    const pEl = document.getElementById(priceId);
    const cEl = document.getElementById(chgId);
    if (pEl) pEl.textContent = '₹' + this.fmtPrice(price);
    if (cEl) { cEl.textContent = this.fmtChg(chg); cEl.className = 'ticker-chg ' + this.chgClass(chg); }
  },

  updateMetricEl(id, price, chg) {
    const el = document.getElementById(id);
    if (!el) return;
    const cls = chg >= 0 ? 'var(--green)' : 'var(--red)';
    el.innerHTML = `<span style="color:${cls};font-size:1.4rem;font-weight:800">${this.fmtPrice(price)}</span> <span style="color:${cls};font-size:12px;font-weight:700">${this.fmtChg(chg)}</span>`;
  },

  // Duplicate ticker content for seamless loop animation
  duplicateTicker() {
    const scroll = document.getElementById('tickerScroll');
    if (scroll && scroll.children.length > 0 && !scroll.dataset.duped) {
      scroll.innerHTML += scroll.innerHTML;
      scroll.dataset.duped = '1';
    }
  },

  async loadAll() {
    const fb = this.fallback;

    // Immediately show fallback data (so ticker renders instantly)
    this.updateTickerEl('niftyPrice', 'niftyChg', fb.nifty.price, fb.nifty.chg);
    this.updateTickerEl('sensexPrice', 'sensexChg', fb.sensex.price, fb.sensex.chg);
    this.updateTickerEl('vixPrice', 'vixChg', fb.vix.price, fb.vix.chg);
    this.updateTickerEl('reliancePrice', 'relianceChg', fb.reliance.price, fb.reliance.chg);
    this.updateTickerEl('tcsPrice', 'tcsChg', fb.tcs.price, fb.tcs.chg);
    this.updateTickerEl('hdfcPrice', 'hdfcChg', fb.hdfc.price, fb.hdfc.chg);
    this.updateTickerEl('infyPrice', 'infyChg', fb.infy.price, fb.infy.chg);
    this.updateTickerEl('iciciPrice', 'iciciChg', fb.icici.price, fb.icici.chg);
    this.updateMetricEl('moNifty', fb.nifty.price, fb.nifty.chg);
    this.updateMetricEl('moSensex', fb.sensex.price, fb.sensex.chg);
    this.updateMetricEl('moVix', fb.vix.price, fb.vix.chg);
    this.updateMetricEl('moBankNifty', fb.banknifty.price, fb.banknifty.chg);
    this.updateMetricEl('moNiftyIT', fb.niftyit.price, fb.niftyit.chg);
    this.duplicateTicker();

    // Fetch real data in background (Yahoo Finance NSE tickers)
    const tickers = [
      ['%5ENSEI', 'niftyPrice', 'niftyChg', 'moNifty'],
      ['%5EBSESN', 'sensexPrice', 'sensexChg', 'moSensex'],
      ['%5EINDIAVIX', 'vixPrice', 'vixChg', 'moVix'],
      ['%5ENSEBANK', 'nbnPrice', 'nbnChg', 'moBankNifty'],
      ['RELIANCE.NS', 'reliancePrice', 'relianceChg', null],
      ['TCS.NS', 'tcsPrice', 'tcsChg', null],
      ['HDFCBANK.NS', 'hdfcPrice', 'hdfcChg', null],
      ['INFY.NS', 'infyPrice', 'infyChg', null],
      ['ICICIBANK.NS', 'iciciPrice', 'iciciChg', null],
    ];

    for (const [sym, priceId, chgId, metricId] of tickers) {
      this.fetchYahoo(sym).then(data => {
        if (!data) return;
        this.updateTickerEl(priceId, chgId, data.price, data.chg);
        if (metricId) this.updateMetricEl(metricId, data.price, data.chg);
      });
    }

    // After all fetches settle, re-duplicate ticker with real values
    setTimeout(() => this.duplicateTicker(), 4000);
  }
};

// ─── State ───────────────────────────────────
const state = {
  currentPage: 'home',
  selectedTemplate: null,
  builderMode: 'simple',
  templates: [],
  filters: { risk: 'all', horizon: 'all', search: '' },
  liveChartData: [],
};

// ─── Templates Data (mirrors API /api/templates) ──────────────────────────────
const TEMPLATES = [
  {
    id: 'blue-chip-rebound',
    name: 'Blue Chip Rebound',
    tagline: 'Buy the dip on India\'s strongest companies',
    risk_level: 'low',
    horizon: 'swing',
    sector: 'diversified',
    instruments: ['equity'],
    tags: ['mean-reversion', 'blue-chip', 'nifty50'],
    min_capital_inr: 50000,
    avg_monthly_return_pct: 2.3,
    max_drawdown_pct: 8.5,
    win_rate: 0.64,
    sharpe_ratio: 1.42,
    author: 'AlgoStreet',
    author_type: 'official',
    active_users: 2847,
    avg_rating: 4.3,
    params: {
      entry_drop_pct: { label: 'Buy when stock drops by (%)', min: 1, max: 10, step: 0.5, default: 3, unit: '%' },
      target_pct: { label: 'Sell when profit reaches (%)', min: 0.5, max: 10, step: 0.5, default: 2, unit: '%' },
      stop_loss_pct: { label: 'Exit if loss exceeds (%)', min: 0.5, max: 10, step: 0.5, default: 1.5, unit: '%' },
      max_stocks: { label: 'Max stocks to hold at once', min: 1, max: 10, step: 1, default: 3, unit: '' },
      hold_days: { label: 'Auto-exit after (days)', min: 1, max: 20, step: 1, default: 5, unit: 'd' },
    },
  },
  {
    id: 'nifty-momentum-pro',
    name: 'Nifty Momentum Pro',
    tagline: 'Ride the winners, cut the laggards',
    risk_level: 'medium',
    horizon: 'positional',
    sector: 'diversified',
    instruments: ['equity'],
    tags: ['momentum', 'nifty500', 'monthly-rebalance'],
    min_capital_inr: 100000,
    avg_monthly_return_pct: 3.8,
    max_drawdown_pct: 18.2,
    win_rate: 0.58,
    sharpe_ratio: 1.71,
    author: 'AlgoStreet',
    author_type: 'official',
    active_users: 4312,
    avg_rating: 4.6,
    params: {
      lookback_days: { label: 'How far back to measure momentum (days)', min: 30, max: 180, step: 10, default: 90, unit: 'd' },
      top_n: { label: 'Number of top stocks to buy', min: 5, max: 30, step: 1, default: 10, unit: '' },
      rsi_threshold: { label: "Don't buy if RSI is above", min: 50, max: 80, step: 1, default: 65, unit: '' },
      min_market_cap: { label: 'Min company size (₹ Cr market cap)', min: 500, max: 50000, step: 500, default: 5000, unit: 'Cr' },
    },
  },
  {
    id: 'options-wheel',
    name: 'Options Wheel',
    tagline: 'Generate steady income from your portfolio',
    risk_level: 'high',
    horizon: 'positional',
    sector: 'diversified',
    instruments: ['equity', 'fno'],
    tags: ['options', 'income', 'wheel', 'advanced'],
    min_capital_inr: 300000,
    avg_monthly_return_pct: 2.1,
    max_drawdown_pct: 22.5,
    win_rate: 0.72,
    sharpe_ratio: 1.18,
    author: 'AlgoStreet',
    author_type: 'official',
    active_users: 1289,
    avg_rating: 4.1,
    fno_required: true,
    params: {
      delta_target: { label: 'How far out-of-the-money to sell (delta)', min: 0.2, max: 0.45, step: 0.05, default: 0.3, unit: 'δ' },
      dte_entry: { label: 'Days until expiry when entering', min: 7, max: 45, step: 1, default: 21, unit: 'd' },
      profit_take_pct: { label: 'Close when profit reaches (% of max gain)', min: 25, max: 75, step: 5, default: 50, unit: '%' },
      max_positions: { label: 'Max open positions at once', min: 1, max: 5, step: 1, default: 2, unit: '' },
    },
  },
];

// ─── Router ──────────────────────────────────
function showPage(name, data) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`page-${name}`);
  if (!page) return;
  page.classList.add('active');
  state.currentPage = name;
  if (data) state.selectedTemplate = data;
  window.scrollTo(0, 0);

  // Render page content
  const renderers = {
    marketplace: renderMarketplace,
    'template-detail': renderTemplateDetail,
    builder: renderBuilder,
    dashboard: renderDashboard,
    analytics: renderAnalytics,
    community: renderCommunity,
    login: renderLogin,
  };
  if (renderers[name]) renderers[name]();

  // New feature renderers
  const extra = {
    dna: renderDNA, goals: renderGoals, 'new-goal': renderNewGoal,
    weather: renderWeather, brokers: renderBrokers, 'safety-net': renderSafetyNet
  };
  if (extra[name]) extra[name]();

  // Update nav active state
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
}

// ─── Utilities ───────────────────────────────
function fmt(n, decimals = 0) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}
function fmtPct(n) { return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'; }
function fmtCurrency(n) { return '₹' + fmt(n, 2); }
function colorClass(n) { return n >= 0 ? 'green' : 'red'; }
function riskEmoji(r) { return { low: '🟢', medium: '🟡', high: '🔴' }[r] || '⚪'; }

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// Generate sparkline equity-curve data
function genEquityCurve(days = 90, startVal = 100, trend = 0.0008) {
  const pts = [{ v: startVal }];
  for (let i = 1; i < days; i++) {
    const prev = pts[i - 1].v;
    pts.push({ v: +(prev * (1 + (Math.random() - 0.42) * 0.018 + trend)).toFixed(2) });
  }
  return pts;
}

// Draw a sparkline on a canvas
function drawSparkline(canvas, data, positive = true) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.offsetWidth || canvas.parentElement.offsetWidth || 300;
  const h = canvas.offsetHeight || 60;
  canvas.width = w * window.devicePixelRatio;
  canvas.height = h * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.clearRect(0, 0, w, h);

  const vals = data.map(d => d.v || d.value || d);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  const x = i => (i / (vals.length - 1)) * w;
  const y = v => h - ((v - min) / range) * (h - 4) - 2;

  const color = positive ? '#00d09c' : '#e85454';
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, positive ? 'rgba(0,208,156,0.25)' : 'rgba(232,84,84,0.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.beginPath();
  ctx.moveTo(x(0), y(vals[0]));
  for (let i = 1; i < vals.length; i++) ctx.lineTo(x(i), y(vals[i]));
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x(0), y(vals[0]));
  for (let i = 1; i < vals.length; i++) ctx.lineTo(x(i), y(vals[i]));
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
}

// ─── MARKETPLACE ─────────────────────────────
function renderMarketplace() {
  const root = document.getElementById('marketplace-root');
  const filtered = TEMPLATES.filter(t => {
    if (state.filters.risk !== 'all' && t.risk_level !== state.filters.risk) return false;
    if (state.filters.horizon !== 'all' && t.horizon !== state.filters.horizon) return false;
    if (state.filters.search) {
      const q = state.filters.search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.tagline.toLowerCase().includes(q) || t.tags.some(g => g.includes(q));
    }
    return true;
  });

  root.innerHTML = `
    <div class="marketplace-header">
      <div class="container">
        <h1>🛍 Strategy Marketplace</h1>
        <p>Discover and activate algorithmic trading strategies — browse like an app store.</p>
        <div class="filter-bar">
          <input class="filter-search" id="mktSearch" placeholder="🔍 Search strategies..." value="${state.filters.search}" oninput="updateFilter('search',this.value)">
          <span class="filter-chip ${state.filters.risk === 'all' ? 'active' : ''}" onclick="updateFilter('risk','all')">All Risk</span>
          <span class="filter-chip ${state.filters.risk === 'low' ? 'active' : ''}" onclick="updateFilter('risk','low')">🟢 Low</span>
          <span class="filter-chip ${state.filters.risk === 'medium' ? 'active' : ''}" onclick="updateFilter('risk','medium')">🟡 Medium</span>
          <span class="filter-chip ${state.filters.risk === 'high' ? 'active' : ''}" onclick="updateFilter('risk','high')">🔴 High</span>
          <span class="filter-chip ${state.filters.horizon === 'all' ? 'active' : ''}" onclick="updateFilter('horizon','all')">All Horizons</span>
          <span class="filter-chip ${state.filters.horizon === 'intraday' ? 'active' : ''}" onclick="updateFilter('horizon','intraday')">⚡ Intraday</span>
          <span class="filter-chip ${state.filters.horizon === 'swing' ? 'active' : ''}" onclick="updateFilter('horizon','swing')">📈 Swing</span>
          <span class="filter-chip ${state.filters.horizon === 'positional' ? 'active' : ''}" onclick="updateFilter('horizon','positional')">📅 Positional</span>
        </div>
      </div>
    </div>
    <div class="container">
      <div class="templates-grid" id="templatesGrid">
        ${filtered.length ? filtered.map(renderTemplateCard).join('') : '<p style="color:var(--text-muted);padding:2rem;grid-column:1/-1">No strategies match your filters. Try adjusting the criteria.</p>'}
      </div>
      <div class="sebi-inline">⚖️ <strong>SEBI Disclaimer:</strong> Past performance is not indicative of future results. Backtested returns shown on strategy cards are hypothetical and do not represent actual traded results. All figures are for informational purposes only.</div>
    </div>`;

  // Draw sparklines after render
  setTimeout(() => {
    filtered.forEach(t => {
      const c = document.getElementById(`spark-${t.id}`);
      if (c) drawSparkline(c, genEquityCurve(90, 100, t.risk_level === 'low' ? 0.0006 : t.risk_level === 'medium' ? 0.001 : 0.0014), true);
    });
  }, 50);
}

function renderTemplateCard(t) {
  const rClass = { low: 'risk-low', medium: 'risk-medium', high: 'risk-high' }[t.risk_level];
  const horizonLabel = { intraday: '⚡ Intraday', swing: '📈 Swing', positional: '📅 Positional' }[t.horizon] || t.horizon;
  return `
  <div class="template-card" onclick="openTemplate('${t.id}')">
    <div class="card-top">
      <div class="card-risk-badge ${rClass}">${riskEmoji(t.risk_level)} ${t.risk_level.toUpperCase()}</div>
      <div class="card-title">${t.name}</div>
      <div class="card-tagline">${t.tagline}</div>
      <div class="sparkline-container"><canvas id="spark-${t.id}"></canvas></div>
      <div class="card-stats">
        <div class="card-stat"><div class="card-stat-val green">+${t.avg_monthly_return_pct}%</div><div class="card-stat-lbl">Avg/Month*</div></div>
        <div class="card-stat"><div class="card-stat-val red">${t.max_drawdown_pct}%</div><div class="card-stat-lbl">Max DD</div></div>
        <div class="card-stat"><div class="card-stat-val">${(t.win_rate * 100).toFixed(0)}%</div><div class="card-stat-lbl">Win Rate</div></div>
      </div>
    </div>
    <div class="card-bottom">
      <div class="card-meta">
        <div class="card-meta-row">👥 ${fmt(t.active_users)} users &nbsp;·&nbsp; ${horizonLabel}</div>
        <div class="card-meta-row">💰 Min ₹${fmt(t.min_capital_inr)} &nbsp;·&nbsp; ⭐ ${t.avg_rating}</div>
      </div>
      <div class="card-actions">
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();paperTrade('${t.id}')">📄 Paper</button>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openTemplate('${t.id}')">View →</button>
      </div>
    </div>
  </div>`;
}

function updateFilter(key, val) {
  state.filters[key] = val;
  renderMarketplace();
}

function openTemplate(id) {
  state.selectedTemplate = TEMPLATES.find(t => t.id === id);
  showPage('template-detail');
}

function paperTrade(id) {
  state.selectedTemplate = TEMPLATES.find(t => t.id === id);
  showToast(`📄 "${state.selectedTemplate.name}" started in paper trading mode!`, 'success');
  setTimeout(() => showPage('dashboard'), 1200);
}

// ─── TEMPLATE DETAIL ─────────────────────────
function renderTemplateDetail() {
  const t = state.selectedTemplate;
  if (!t) { showPage('marketplace'); return; }
  const root = document.getElementById('template-detail-root');
  const curveData = genEquityCurve(90, 100000, t.risk_level === 'low' ? 0.0007 : t.risk_level === 'medium' ? 0.001 : 0.0015);
  const finalVal = curveData[curveData.length - 1].v;
  const totalReturn = ((finalVal - 100000) / 100000 * 100).toFixed(1);

  root.innerHTML = `
    <div class="detail-hero">
      <div class="container">
        <button class="btn btn-ghost btn-sm" onclick="showPage('marketplace')" style="margin-bottom:1rem">← Back to Marketplace</button>
        <div class="detail-hero-inner">
          <div class="detail-info">
            <div class="card-risk-badge ${{ 'low': 'risk-low', 'medium': 'risk-medium', 'high': 'risk-high' }[t.risk_level]}" style="margin-bottom:1rem">
              ${riskEmoji(t.risk_level)} ${t.risk_level.toUpperCase()} RISK
            </div>
            <h1 style="font-size:2.2rem;font-weight:900;margin-bottom:.5rem">${t.name}</h1>
            <p style="color:var(--text-secondary);font-size:1.05rem;margin-bottom:1.5rem">${t.tagline}</p>
            <div class="stats-row">
              <div class="stat-box"><div class="stat-box-val green">+${totalReturn}%</div><div class="stat-box-lbl">90-Day Return*</div></div>
              <div class="stat-box"><div class="stat-box-val red">${t.max_drawdown_pct}%</div><div class="stat-box-lbl">Max Drawdown</div></div>
              <div class="stat-box"><div class="stat-box-val">${(t.win_rate * 100).toFixed(0)}%</div><div class="stat-box-lbl">Win Rate</div></div>
              <div class="stat-box"><div class="stat-box-val">${t.sharpe_ratio}</div><div class="stat-box-lbl">Sharpe Ratio</div></div>
              <div class="stat-box"><div class="stat-box-val">${fmt(t.active_users)}</div><div class="stat-box-lbl">Active Users</div></div>
            </div>
            <div style="display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap">
              <button class="btn btn-outline btn-lg" onclick="startPaperTrade('${t.id}')">📄 Paper Trade First</button>
              <button class="btn btn-primary btn-lg" onclick="goLive('${t.id}')">🚀 Go Live</button>
              <button class="btn btn-ghost btn-lg" onclick="openBuilderWith('${t.id}')">🔧 Customize</button>
            </div>
            ${t.fno_required ? '<div class="sebi-inline" style="margin-top:1rem">⚠️ <strong>F&O Eligibility Required.</strong> Options trading requires SEBI-mandated F&O activation with your broker.</div>' : ''}
            <div class="sebi-inline">⚖️ *Past performance is not indicative of future results. Backtested returns are hypothetical.</div>
          </div>
          <div class="detail-chart">
            <div class="big-chart">
              <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:.5rem">📈 90-Day Paper Trade Equity Curve</div>
              <canvas id="detailChart" height="200"></canvas>
            </div>
            <div class="card" style="margin-top:1rem">
              <div style="font-size:.85rem;font-weight:600;margin-bottom:.75rem">Strategy Details</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.85rem">
                <span style="color:var(--text-muted)">Min Capital</span><span>₹${fmt(t.min_capital_inr)}</span>
                <span style="color:var(--text-muted)">Horizon</span><span>${t.horizon}</span>
                <span style="color:var(--text-muted)">Instruments</span><span>${t.instruments.join(', ')}</span>
                <span style="color:var(--text-muted)">Author</span><span><span class="badge badge-${t.author_type}">${t.author}</span></span>
                <span style="color:var(--text-muted)">Avg Return/Mo</span><span class="green">+${t.avg_monthly_return_pct}%</span>
                <span style="color:var(--text-muted)">Sharpe</span><span>${t.sharpe_ratio}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="container" style="padding:2rem 1.5rem">
      <h2 class="section-title">Configure Parameters</h2>
      <p style="color:var(--text-secondary);margin-bottom:1.5rem">Adjust to your risk appetite. The summary below updates in real time.</p>
      <div class="grid-2">
        <div>
          ${Object.entries(t.params || {}).map(([key, p]) => buildSlider(key, p)).join('')}
        </div>
        <div>
          <div class="summary-box" id="strategySummary">${buildSummary(t)}</div>
          <div class="card" style="margin-top:1rem">
            <div style="font-size:.85rem;font-weight:700;margin-bottom:.75rem">📋 Tags</div>
            <div>${t.tags.map(g => `<span style="display:inline-block;background:var(--bg-secondary);border:1px solid var(--border);border-radius:4px;padding:.2rem .6rem;font-size:.75rem;margin:.2rem">${g}</span>`).join('')}</div>
          </div>
        </div>
      </div>
    </div>`;

  setTimeout(() => {
    const c = document.getElementById('detailChart');
    if (c) drawSparkline(c, curveData, true);
  }, 50);
}

function buildSlider(key, p) {
  const id = `param-${key}`;
  const pct = ((p.default - p.min) / (p.max - p.min) * 100).toFixed(1);
  return `
  <div class="form-field">
    <label class="form-label">${p.label}</label>
    <div class="slider-wrap">
      <input type="range" class="slider" id="${id}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.default}"
        style="--val:${pct}%"
        oninput="updateSlider(this,'${id}-val','${p.unit}')"
      />
      <span class="slider-val" id="${id}-val">${p.default}${p.unit}</span>
    </div>
  </div>`;
}

function updateSlider(el, valId, unit) {
  const pct = ((el.value - el.min) / (el.max - el.min) * 100).toFixed(1);
  el.style.setProperty('--val', pct + '%');
  document.getElementById(valId).textContent = el.value + unit;
}

function buildSummary(t) {
  const summaries = {
    'blue-chip-rebound': '💡 This algo watches Nifty 50 stocks. When a stock drops <strong>3%</strong> from its previous close, it buys (up to <strong>3 stocks</strong> at once). It sells at <strong>+2% profit</strong>, exits at <strong>-1.5% loss</strong>, or after <strong>5 days</strong>.',
    'nifty-momentum-pro': '💡 This algo ranks <strong>Nifty 500 stocks</strong> by 90-day momentum. Every month, it buys the top <strong>10</strong> stocks (avoiding RSI &gt; 65 to skip overbought entries). Rebalances monthly.',
    'options-wheel': '💡 This algo sells <strong>cash-secured puts</strong> at 30-delta on Nifty 50 stocks with 21 DTE. If assigned, it switches to <strong>covered calls</strong>. Closes at 50% profit. Max <strong>2 positions</strong> at once.',
  };
  return summaries[t.id] || `💡 ${t.tagline}`;
}

function startPaperTrade(id) {
  showToast('📄 Paper trading started! Safe to explore — no real money used.', 'success');
  setTimeout(() => showPage('dashboard'), 1200);
}

function goLive(id) {
  showToast('⚠️ Complete 7-day paper trade period first to enable live trading.', 'error');
}

function openBuilderWith(id) {
  state.selectedTemplate = TEMPLATES.find(t => t.id === id);
  showPage('builder');
}

// ─── BUILDER ─────────────────────────────────
function renderBuilder() {
  const root = document.getElementById('builder-root');
  root.innerHTML = `
    <div class="page-header">
      <div class="container">
        <h1>🔧 Strategy Builder</h1>
        <p>Three ways to build: simple sliders, plain English, or full Python code.</p>
      </div>
    </div>
    <div class="container">
      <div class="builder-modes">
        <div class="mode-tab ${state.builderMode === 'simple' ? 'active' : ''}" onclick="switchBuilderMode('simple')">🎛 Simple Mode</div>
        <div class="mode-tab ${state.builderMode === 'nl' ? 'active' : ''}" onclick="switchBuilderMode('nl')">💬 Natural Language</div>
        <div class="mode-tab ${state.builderMode === 'advanced' ? 'active' : ''}" onclick="switchBuilderMode('advanced')">⚡ Advanced (Python)</div>
      </div>
      <div id="builder-content">${renderBuilderMode()}</div>
    </div>`;
}

function switchBuilderMode(mode) {
  state.builderMode = mode;
  document.querySelectorAll('.mode-tab').forEach((t, i) => {
    t.classList.toggle('active', ['simple', 'nl', 'advanced'][i] === mode);
  });
  document.getElementById('builder-content').innerHTML = renderBuilderMode();
}

function renderBuilderMode() {
  const t = state.selectedTemplate || TEMPLATES[0];
  if (state.builderMode === 'simple') {
    return `
      <div class="grid-2">
        <div>
          <div class="card" style="margin-bottom:1.5rem">
            <div class="section-title">Select Strategy Template</div>
            <select class="select-field" onchange="selectBuilderTemplate(this.value)">
              ${TEMPLATES.map(tp => `<option value="${tp.id}" ${tp.id === t.id ? 'selected' : ''}>${tp.name}</option>`).join('')}
            </select>
          </div>
          <div class="card">
            <div class="section-title">Configure Parameters</div>
            ${Object.entries(t.params || {}).map(([k, p]) => buildSlider(k, p)).join('')}
          </div>
        </div>
        <div>
          <div class="summary-box" style="margin-bottom:1rem">${buildSummary(t)}</div>
          <div class="card">
            <div class="section-title">Capital & Risk</div>
            <div class="form-field">
              <label class="form-label">Allocated Capital (₹)</label>
              <div class="slider-wrap">
                <input type="range" class="slider" min="${t.min_capital_inr}" max="500000" step="5000" value="${t.min_capital_inr}"
                  oninput="updateSlider(this,'capital-val','')"/>
                <span class="slider-val" id="capital-val">₹${fmt(t.min_capital_inr)}</span>
              </div>
            </div>
            <div class="form-field">
              <label class="form-label">Kill Switch — stop if daily loss exceeds (%)</label>
              <div class="slider-wrap">
                <input type="range" class="slider" min="1" max="5" step="0.5" value="2"
                  oninput="updateSlider(this,'kill-val','%')"/>
                <span class="slider-val" id="kill-val">2%</span>
              </div>
            </div>
          </div>
          <div class="sebi-inline">⚖️ Past performance is not indicative of future results.</div>
          <div style="margin-top:1.5rem;display:flex;gap:1rem">
            <button class="btn btn-outline" onclick="runBacktest()">📊 Run Backtest</button>
            <button class="btn btn-primary" onclick="activateStrategy()">🚀 Activate (Paper Mode)</button>
          </div>
        </div>
      </div>`;
  }

  if (state.builderMode === 'nl') {
    return `
      <div class="grid-2">
        <div>
          <div class="card">
            <div class="section-title">💬 Describe your strategy in plain English</div>
            <p style="color:var(--text-secondary);font-size:.875rem;margin-bottom:1rem">
              Write what you want the algo to do — Claude AI will convert it to working Python code.
            </p>
            <textarea class="nl-textarea" id="nlInput" placeholder="E.g.: Buy Nifty 50 stocks that have fallen more than 3% in a week and sell after 5% gain. Stop loss at 2%. Max 5 stocks at once."></textarea>
            <div style="margin-top:1rem;display:flex;gap:.75rem">
              <button class="btn btn-primary" onclick="generateNLStrategy()">✨ Generate Strategy</button>
              <button class="btn btn-ghost" onclick="loadNLExample()">📝 See Example</button>
            </div>
          </div>
        </div>
        <div>
          <div class="card">
            <div class="section-title">Generated Code Preview</div>
            <div class="code-preview" id="nlCodePreview" style="min-height:250px;color:var(--text-muted);display:flex;align-items:center;justify-content:center">
              Your generated strategy code will appear here →
            </div>
            <div id="nlAnnotations" style="margin-top:1rem"></div>
          </div>
        </div>
      </div>`;
  }

  // Advanced mode
  return `
    <div class="grid-2">
      <div>
        <div class="card" style="padding:0;overflow:hidden">
          <div style="background:rgba(255,255,255,.04);padding:.75rem 1rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:.85rem;color:var(--text-muted)">📄 strategy.py</span>
            <div style="display:flex;gap:.5rem">
              <button class="btn btn-ghost btn-sm" onclick="runBacktest()">▶ Run Backtest</button>
              <button class="btn btn-outline btn-sm" onclick="formatCode()">⚡ AI Fix</button>
            </div>
          </div>
          <div class="code-preview" id="advancedEditor" contenteditable="true" style="border-radius:0;min-height:380px;outline:none" spellcheck="false">${getBoilerplate()}</div>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:1rem">
          <div class="section-title">🤖 AI Pair Programmer</div>
          <p style="color:var(--text-secondary);font-size:.85rem;margin-bottom:1rem">Ask Claude to modify your code:</p>
          <input class="nl-textarea" style="min-height:60px;resize:none" id="aiChatInput" placeholder="E.g.: Add a stop loss at 1.5% below entry...">
          <button class="btn btn-primary btn-sm" style="margin-top:.75rem" onclick="aiPatch()">✨ Apply AI Patch</button>
        </div>
        <div class="card">
          <div class="section-title">Lint Status</div>
          <div style="color:var(--green);font-size:.875rem">✅ BaseStrategy interface: complete<br>✅ All lifecycle hooks present<br>✅ get_parameter_schema() defined<br>⚠️ backtest() not yet implemented</div>
        </div>
      </div>
    </div>`;
}

function getBoilerplate() {
  return `<span style="color:#6366f1">from</span> <span style="color:#34d399">app.strategies.base</span> <span style="color:#6366f1">import</span> *

<span style="color:#6366f1">class</span> <span style="color:#f59e0b">MyCustomStrategy</span>(BaseStrategy):
    metadata = StrategyMetadata(
        name=<span style="color:#34d399">"My Strategy"</span>,
        risk_level=RiskLevel.MEDIUM,
        min_capital_inr=<span style="color:#f59e0b">50000</span>,
        instruments=[Instrument.EQUITY],
        avg_monthly_return_pct=<span style="color:#f59e0b">0.0</span>,
        max_drawdown_pct=<span style="color:#f59e0b">10.0</span>,
        win_rate=<span style="color:#f59e0b">0.5</span>,
        sharpe_ratio=<span style="color:#f59e0b">1.0</span>,
    )

    <span style="color:#6366f1">def</span> <span style="color:#818cf8">on_market_open</span>(self, portfolio):
        <span style="color:#475569"># Add your opening logic here</span>
        <span style="color:#6366f1">return</span> []

    <span style="color:#6366f1">def</span> <span style="color:#818cf8">on_tick</span>(self, tick):
        <span style="color:#475569"># React to each price tick</span>
        <span style="color:#6366f1">return</span> []

    <span style="color:#6366f1">def</span> <span style="color:#818cf8">on_market_close</span>(self, portfolio):
        <span style="color:#475569"># Square off intraday positions</span>
        <span style="color:#6366f1">return</span> []`;
}

function selectBuilderTemplate(id) {
  state.selectedTemplate = TEMPLATES.find(t => t.id === id);
  document.getElementById('builder-content').innerHTML = renderBuilderMode();
}

function loadNLExample() {
  document.getElementById('nlInput').value = 'Buy Nifty 50 stocks that have fallen more than 3% in a week and sell after they recover 5%. Set stop loss at 2%. Maximum 3 stocks at once. Hold for at most 10 days.';
}

function generateNLStrategy() {
  const text = document.getElementById('nlInput')?.value || '';
  if (!text.trim()) { showToast('Please describe your strategy first.', 'error'); return; }
  showToast('✨ Generating strategy code via Claude AI...', 'info');
  const preview = document.getElementById('nlCodePreview');
  preview.style.display = 'block';
  preview.textContent = '⏳ Generating...';
  setTimeout(() => {
    preview.innerHTML = `<span style="color:#6366f1">class</span> <span style="color:#f59e0b">GeneratedStrategy</span>(BaseStrategy):\n  <span style="color:#475569">"""Auto-generated from: ${text.slice(0, 60)}..."""</span>\n\n  <span style="color:#6366f1">def</span> on_tick(self, tick):\n    <span style="color:#475569"># Checks if stock dropped 3% from prev close</span>\n    drop = (prev_close - tick.ltp) / prev_close * 100\n    <span style="color:#6366f1">if</span> drop >= <span style="color:#f59e0b">3.0</span>:\n        <span style="color:#6366f1">return</span> [Signal(BUY, tick.symbol)]\n    <span style="color:#6366f1">return</span> []`;
    document.getElementById('nlAnnotations').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:.4rem;font-size:.82rem">
        <span style="color:var(--green)">✅ BaseStrategy interface satisfied</span>
        <span style="color:var(--green)">✅ Entry/exit logic generated</span>
        <span style="color:var(--yellow)">⚠️ Backtest data not yet configured</span>
      </div>
      <button class="btn btn-primary" style="margin-top:1rem" onclick="activateStrategy()">🚀 Paper Trade This</button>`;
    showToast('✅ Strategy generated! Review code and paper trade first.', 'success');
  }, 1800);
}

function runBacktest() {
  showToast('📊 Running backtest on 2024 NSE data...', 'info');
  setTimeout(() => showToast('✅ Backtest complete! Sharpe: 1.42, Win Rate: 64%, Max DD: 8.5%', 'success'), 2000);
}

function activateStrategy() {
  showToast('🚀 Strategy activated in paper trade mode! Monitoring...', 'success');
  setTimeout(() => showPage('dashboard'), 1500);
}

function aiPatch() {
  const prompt = document.getElementById('aiChatInput')?.value;
  if (!prompt) return;
  showToast('🤖 AI applying patch...', 'info');
  setTimeout(() => showToast('✅ Stop-loss logic added at 1.5% below entry!', 'success'), 1500);
}

function formatCode() {
  showToast('⚡ Code validated against BaseStrategy interface.', 'success');
}

// ─── DASHBOARD ─────────────────────────────────
function renderDashboard() {
  const root = document.getElementById('dashboard-root');
  root.innerHTML = `
    <div class="page-header">
      <div class="container">
        <h1>📊 My Portfolio</h1>
        <p>Live paper trading dashboard — real-time P&L and positions.</p>
      </div>
    </div>
    <div class="container">
      <div class="grid-2" style="margin-bottom:1.5rem">
        <div class="pnl-card">
          <div style="font-size:.8rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">Today's P&L (Paper)</div>
          <div class="pnl-amount" id="livePnl">+₹3,420.75</div>
          <div class="pnl-meta">+1.22% &nbsp;·&nbsp; 3 trades today &nbsp;·&nbsp; <span class="green">●</span> Live</div>
          <div class="live-chart" style="margin-top:1rem"><canvas id="liveChart"></canvas></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div class="card"><div class="muted" style="font-size:.8rem">Total Deployed</div><div style="font-size:1.8rem;font-weight:800">₹1,50,000</div></div>
          <div class="card"><div class="muted" style="font-size:.8rem">All-Time P&L</div><div style="font-size:1.8rem;font-weight:800;color:var(--green)">+₹6,061</div></div>
          <div class="card"><div class="muted" style="font-size:.8rem">Win Rate (30d)</div><div style="font-size:1.8rem;font-weight:800">66.7%</div></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:1.5rem">
        <div class="section-title">⚡ Active Strategies</div>
        ${renderInstanceCard('Blue Chip Rebound', '+₹1,240', 'green', 'active', 'inst-001')}
        ${renderInstanceCard('Nifty Momentum Pro', '+₹4,820', 'green', 'active', 'inst-002')}
        <button class="btn btn-primary" style="margin-top:1rem" onclick="showPage('marketplace')">+ Add Strategy</button>
      </div>

      <div class="card" style="margin-bottom:1.5rem">
        <div class="section-title">📋 Open Positions</div>
        <table class="position-table">
          <thead><tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Avg Price</th><th>LTP</th><th>P&L</th></tr></thead>
          <tbody>
            <tr><td class="symbol-cell">RELIANCE</td><td class="pos-buy">BUY</td><td>5</td><td>₹2,847.50</td><td>₹2,912.50</td><td class="green">+₹325</td></tr>
            <tr><td class="symbol-cell">TCS</td><td class="pos-buy">BUY</td><td>3</td><td>₹3,950.00</td><td>₹3,918.25</td><td class="red">-₹95.25</td></tr>
            <tr><td class="symbol-cell">HDFC</td><td class="pos-buy">BUY</td><td>8</td><td>₹1,720.00</td><td>₹1,698.40</td><td class="red">-₹172.80</td></tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="section-title">🛡 Risk Controls</div>
        <div class="grid-3">
          <div style="text-align:center;padding:1rem;background:rgba(16,185,129,.08);border-radius:10px;border:1px solid rgba(16,185,129,.2)">
            <div style="font-size:1.5rem">🟢</div>
            <div style="font-weight:700;margin:.25rem 0">Kill Switch</div>
            <div style="font-size:.8rem;color:var(--text-muted)">Active at -2% daily</div>
          </div>
          <div style="text-align:center;padding:1rem;background:rgba(16,185,129,.08);border-radius:10px;border:1px solid rgba(16,185,129,.2)">
            <div style="font-size:1.5rem">🟢</div>
            <div style="font-weight:700;margin:.25rem 0">Circuit Breaker</div>
            <div style="font-size:.8rem;color:var(--text-muted)">0 / 3 losses</div>
          </div>
          <div style="text-align:center;padding:1rem;background:rgba(16,185,129,.08);border-radius:10px;border:1px solid rgba(16,185,129,.2)">
            <div style="font-size:1.5rem">🔒</div>
            <div style="font-weight:700;margin:.25rem 0">Capital Lock</div>
            <div style="font-size:.8rem;color:var(--text-muted)">₹15,000 reserved</div>
          </div>
        </div>
      </div>
    </div>`;

  setTimeout(() => {
    const c = document.getElementById('liveChart');
    if (c) {
      const data = genEquityCurve(60, 150000, 0.0008);
      drawSparkline(c, data, true);
    }
  }, 50);

  // Simulate live P&L updates
  setInterval(() => {
    const el = document.getElementById('livePnl');
    if (el && state.currentPage === 'dashboard') {
      const n = 3420.75 + (Math.random() - 0.45) * 50;
      el.textContent = (n >= 0 ? '+' : '') + '₹' + fmt(n, 2);
      el.className = 'pnl-amount ' + (n >= 0 ? '' : 'negative');
    }
  }, 2000);
}

function renderInstanceCard(name, pnl, pnlClass, status, id) {
  return `
  <div class="strategy-instance-card">
    <div class="instance-status ${status !== 'active' ? 'paused' : ''}"></div>
    <div>
      <div class="instance-name">${name}</div>
      <div style="font-size:.8rem;color:var(--text-muted)">Paper Trade · Swing · ${status}</div>
    </div>
    <div class="instance-pnl pos ${pnlClass}">${pnl}</div>
    <button class="btn btn-ghost btn-sm" onclick="showToast('⏸ Strategy paused','info')">⏸ Pause</button>
    <button class="kill-switch-btn" onclick="killStrategy('${id}')">🔴 Kill</button>
  </div>`;
}

function killStrategy(id) {
  if (confirm('⚠️ Trigger kill switch? This will square off all positions immediately.')) {
    showToast('🔴 Kill switch triggered! All positions being squared off.', 'error');
  }
}

// ─── ANALYTICS ─────────────────────────────────
function renderAnalytics() {
  const root = document.getElementById('analytics-root');
  root.innerHTML = `
    <div class="page-header">
      <div class="container">
        <h1>📈 Analytics</h1>
        <p>Strategy performance scorecard, trade journal, and CA-ready tax report.</p>
      </div>
    </div>
    <div class="container">
      <div class="tabs">
        <div class="tab active" onclick="switchTab(this,'tab-scorecard')">📊 Scorecard</div>
        <div class="tab" onclick="switchTab(this,'tab-journal')">📋 Trade Journal</div>
        <div class="tab" onclick="switchTab(this,'tab-tax')">📄 Tax Report</div>
      </div>

      <div id="tab-scorecard">
        <div class="card" style="margin-bottom:1.5rem">
          <div style="height:180px"><canvas id="analyticsChart"></canvas></div>
        </div>
        <div class="scorecard-grid">
          ${[
      ['12.4%', 'Total Return (90d)', 'green'], ['+50.3%', 'Annualised', 'green'],
      ['1.42', 'Sharpe Ratio', ''], ['1.87', 'Sortino Ratio', ''],
      ['-6.2%', 'Max Drawdown', 'red'], ['66.7%', 'Win Rate', 'green'],
      ['2.14', 'Profit Factor', ''], ['24', 'Total Trades', ''],
    ].map(([v, l, c]) => `<div class="scorecard-item"><div class="scorecard-val ${c}">${v}</div><div class="scorecard-lbl">${l}</div></div>`).join('')}
        </div>
        <div class="sebi-inline" style="margin-top:1.5rem">⚖️ Past performance is not indicative of future results. All figures are paper-trade simulation results.</div>
      </div>

      <div id="tab-journal" style="display:none">
        <div class="card">
          <div class="section-title">Recent Trades — with entry reasons</div>
          ${[
      ['RELIANCE', 'BUY', '₹2,847', '₹2,904', '+₹284', 'Dip entry: dropped -3.2% from ₹2,942'],
      ['INFY', 'SELL', '₹1,655', '₹1,622', '-₹165', 'Stop-loss -2% hit — capped loss'],
      ['TCS', 'BUY', '₹3,810', '₹3,980', '+₹510', 'Momentum rank improved to top-5'],
      ['HDFC', 'BUY', '₹1,720', '₹1,698', '-₹176', 'Still open — awaiting target'],
    ].map(([sym, side, entry, exit, pnl, reason]) => `
            <div class="trade-row">
              <span class="trade-symbol">${sym}</span>
              <span class="trade-side ${side.toLowerCase()}">${side}</span>
              <span style="font-size:.82rem;color:var(--text-muted)">${entry} → ${exit}</span>
              <span class="trade-reason">${reason}</span>
              <span class="trade-pnl ${pnl.startsWith('+') ? 'green' : 'red'}">${pnl}</span>
            </div>`).join('')}
        </div>
      </div>

      <div id="tab-tax" style="display:none">
        <div class="card">
          <div class="section-title">FY 2025-26 Capital Gains Summary</div>
          <div class="grid-2" style="margin:1rem 0">
            <div class="stat-box"><div class="stat-box-val green">₹8,420</div><div class="stat-box-lbl">Short-Term Gains</div></div>
            <div class="stat-box"><div class="stat-box-val">₹12,500</div><div class="stat-box-lbl">Long-Term Gains (₹1.25L exempt)</div></div>
            <div class="stat-box"><div class="stat-box-val red">₹1,684</div><div class="stat-box-lbl">STCG Tax (20%)</div></div>
            <div class="stat-box"><div class="stat-box-val">₹842</div><div class="stat-box-lbl">Brokerage + STT Paid</div></div>
          </div>
          <div class="sebi-inline">📋 Download trade-wise CA statement for ITR filing. This is a summary only.</div>
          <button class="btn btn-primary" style="margin-top:1rem" onclick="showToast('📄 Excel report generated!','success')">⬇ Download CA-Ready Excel</button>
        </div>
      </div>
    </div>`;

  setTimeout(() => {
    const c = document.getElementById('analyticsChart');
    if (c) drawSparkline(c, genEquityCurve(90, 100000, 0.0008), true);
  }, 50);
}

function switchTab(el, tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['tab-scorecard', 'tab-journal', 'tab-tax'].forEach(id => {
    const el2 = document.getElementById(id);
    if (el2) el2.style.display = id === tabId ? '' : 'none';
  });
}

// ─── COMMUNITY ─────────────────────────────────
function renderCommunity() {
  const root = document.getElementById('community-root');
  const leaders = [
    { rank: 1, name: 'Nifty Momentum Pro', author: 'AlgoStreet Official', ret: '+8.4%', sharpe: 1.71, users: 4312 },
    { rank: 2, name: 'Blue Chip Rebound', author: 'AlgoStreet Official', ret: '+6.9%', sharpe: 1.42, users: 2847 },
    { rank: 3, name: 'Options Wheel', author: 'AlgoStreet Official', ret: '+6.3%', sharpe: 1.18, users: 1289 },
    { rank: 4, name: 'Bank Nifty Scalper', author: 'quant_trader_raj', ret: '+5.8%', sharpe: 1.05, users: 890 },
    { rank: 5, name: 'Pharma Rotation', author: 'dr_markets', ret: '+4.2%', sharpe: 0.98, users: 445 },
  ];

  root.innerHTML = `
    <div class="page-header">
      <div class="container">
        <h1>👥 Community</h1>
        <p>Paper-trade leaderboard and strategy discovery. Clone any strategy into your library.</p>
      </div>
    </div>
    <div class="container">
      <div class="sebi-inline" style="margin-bottom:2rem">⚖️ Leaderboard shows <strong>paper-trade performance only</strong>. Past performance is not indicative of future results. Community strategies undergo SEBI compliance review before listing.</div>

      <div class="section-title">🏆 Strategy Leaderboard (30-day, Paper Trade)</div>
      ${leaders.map(l => `
        <div class="leaderboard-row">
          <div class="rank-badge ${l.rank <= 3 ? `rank-${l.rank}` : 'rank-other'}">${l.rank}</div>
          <div>
            <div class="lb-name">${l.name}</div>
            <div class="lb-meta">by ${l.author} &nbsp;·&nbsp; 👥 ${fmt(l.users)} users &nbsp;·&nbsp; Sharpe ${l.sharpe}</div>
          </div>
          <div class="lb-return">${l.ret}</div>
          <button class="btn btn-outline btn-sm" onclick="cloneStrategy('${l.name}')">Clone →</button>
        </div>`).join('')}

      <div class="card" style="margin-top:3rem">
        <div class="section-title">📤 Publish Your Strategy</div>
        <p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:1.25rem">
          Verified authors can publish strategies to the marketplace. Profit-sharing model available.
          All submissions go through automated + manual SEBI compliance review (~3 business days).
        </p>
        <button class="btn btn-primary" onclick="showPage('builder')">🔧 Build & Publish →</button>
      </div>
    </div>`;
}

function cloneStrategy(name) {
  showToast(`📋 "${name}" cloned to your library! Open Builder to customize.`, 'success');
}

// ─── LOGIN ─────────────────────────────────────
function renderLogin() {
  const root = document.getElementById('login-root');
  root.innerHTML = `
    <div class="container">
      <div class="auth-card">
        <div style="font-size:3rem;margin-bottom:.5rem">⚡</div>
        <h2>Welcome to AlgoStreet</h2>
        <p>India's most user-friendly algo trading platform</p>
        <input class="auth-input" type="email" placeholder="📧 Email address">
        <input class="auth-input" type="password" placeholder="🔑 Password">
        <button class="btn btn-primary" style="width:100%;margin-bottom:.75rem" onclick="doLogin()">Login with Email</button>
        <div class="auth-divider">— or —</div>
        <button class="btn btn-ghost" style="width:100%;margin-bottom:.5rem" onclick="doOTPLogin()">📱 Login with Mobile OTP</button>
        <div class="otp-note">New to AlgoStreet? <a href="#" onclick="showPage('marketplace')" style="color:var(--accent-light)">Start paper trading free →</a></div>
        <div class="sebi-inline" style="margin-top:1.5rem">🛡 Platform for execution only. Not financial advice. New accounts automatically start in paper trading mode for 7 days.</div>
      </div>
    </div>`;
}

function doLogin() {
  showToast('✅ Logged in! Paper trading mode active for 7 days.', 'success');
  document.getElementById('loginBtn').textContent = 'Account';
  document.getElementById('paperBadge').style.display = 'flex';
  setTimeout(() => showPage('marketplace'), 1200);
}

function doOTPLogin() {
  showToast('📱 OTP sent to your mobile number!', 'info');
}

// ─── HERO MINI CHART ─────────────────────────────
function renderHeroChart() {
  const c = document.getElementById('heroChart');
  if (!c) return;
  const data = genEquityCurve(45, 100, 0.001);
  drawSparkline(c, data, true);
}

// ─── NAV ─────────────────────────────────────────
function toggleMobileMenu() {
  const nav = document.getElementById('navLinks');
  nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
  nav.style.flexDirection = 'column';
  nav.style.position = 'fixed';
  nav.style.top = '70px'; nav.style.left = '0'; nav.style.right = '0';
  nav.style.background = 'var(--bg-secondary)';
  nav.style.padding = '1rem'; nav.style.gap = '.5rem';
  nav.style.borderBottom = '1px solid var(--border)';
  nav.style.zIndex = '99';
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
});

// ─── INIT ──────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  showPage('home');
  setTimeout(renderHeroChart, 200);
});


/* ==========================================================
   🧬 FEATURE 1 — ALGO DNA
   ========================================================== */

const DNA_QUESTIONS = [
  { id: 1, q: 'A stock you own drops 8% suddenly. What do you do?', a: 'Sell immediately — I can\'t take more losses', b: 'Hold and wait — dips are buying opportunities', cat: 'risk' },
  { id: 2, q: 'You have ₹1 lakh to invest. Which feels right?', a: 'Split safely across FDs and blue chips', b: 'Put it in high-growth mid-caps — max upside', cat: 'risk' },
  { id: 3, q: 'Markets are down 15% this year. You...', a: 'Move to cash and wait for stability', b: 'Invest more — this is the sale I\'ve been waiting for', cat: 'risk' },
  { id: 4, q: 'A stock doesn\'t move for 3 months. You...', a: 'Sell it — my money should work harder', b: 'Hold — good things take time', cat: 'patience' },
  { id: 5, q: 'What gains excite you more?', a: '5% in a single day — fast and thrilling', b: '40% over 2 years — steady and predictable', cat: 'patience' },
  { id: 6, q: 'Your investment horizon for this money is...', a: 'More than 2 years — I won\'t need it soon', b: 'Under 6 months — I may need it back quickly', cat: 'patience' },
  { id: 7, q: 'BREAKING: "Markets may crash 30% this month." You...', a: 'Panic and sell everything', b: 'Stay calm — stick to my plan', cat: 'emotion' },
  { id: 8, q: 'You made ₹20,000 profit. Your next move?', a: 'Book profits immediately — lock in the gains!', b: 'Let it run — I set a target and stick to it', cat: 'emotion' },
  { id: 9, q: 'Your neighbours are making big money in options. You...', a: 'Feel FOMO and jump in to not miss out', b: 'Stick to my strategy — their results are not mine', cat: 'emotion' },
  { id: 10, q: 'Nifty is up 2.5% today. You...', a: 'Buy more immediately to catch the rally', b: 'Check if my strategy suggests action', cat: 'emotion' },
  { id: 11, q: 'A friend shares a small company with 10x potential. You...', a: 'Ignore — too risky, unknown companies scare me', b: 'Research it and maybe put a small amount in', cat: 'risk' },
  { id: 12, q: 'Your algo loses ₹5,000 in a week. You...', a: 'Switch it off immediately', b: 'Check the logic and give it more time', cat: 'emotion' },
  { id: 13, q: 'What does "P/E ratio" mean to you?', a: 'I\'ve heard of it but I\'m not 100% sure', b: 'Price per rupee of a company\'s earnings', cat: 'knowledge' },
  { id: 14, q: 'FII selling ₹5,000 Cr in a week usually means...', a: 'I\'m not sure — global finance confuses me', b: 'Foreign money is leaving India — often bearish', cat: 'knowledge' },
  { id: 15, q: 'Options trading — how ready do you feel?', a: 'Not ready — I\'d rather stick to stocks', b: 'Ready — I understand Greeks, expiry, and risk', cat: 'knowledge' },
];

const DNA_TYPES = {
  cautious_owl: { emoji: '🦉', name: 'Cautious Owl', tagline: 'You prefer steady gains over big swings. Slow and sure.', color: '#A78BFA', desc: 'You\'re the wise investor who sleeps peacefully at night. Low-risk, long-horizon strategies suit you perfectly.' },
  bold_lion: { emoji: '🦁', name: 'Bold Lion', tagline: 'You thrive on big moves and quick decisions.', color: '#F472B6', desc: 'You love the thrill of markets and are not afraid to take calculated risks. Move fast, cut losses fast.' },
  steady_elephant: { emoji: '🐘', name: 'Steady Elephant', tagline: 'Strong, calm, and built for the long game.', color: '#67E8F9', desc: 'High risk tolerance + extreme patience — the rarest combo. You hold through storms without flinching.' },
  quick_rabbit: { emoji: '🐰', name: 'Quick Rabbit', tagline: 'Fast in, fast out — you know what you want.', color: '#86EFAC', desc: 'Low-risk, short-horizon. Frequent small wins over rare big wins. Intraday and swing strategies fit you best.' },
  balanced_eagle: { emoji: '🦅', name: 'Balanced Eagle', tagline: 'You see the whole picture and stay above the noise.', color: '#FDBA74', desc: 'Middle-of-the-range across all dimensions — stable, adaptable, resilient in any market.' },
};

const DNA_STATE = { current: 0, answers: [], profile: null };

function renderDNA() {
  DNA_STATE.current = 0; DNA_STATE.answers = []; DNA_STATE.profile = null;
  renderDNAQuestion();
}

function renderDNAQuestion() {
  const root = document.getElementById('dna-root');
  const q = DNA_QUESTIONS[DNA_STATE.current];
  if (!q) { revealDNA(); return; }
  const pct = Math.round((DNA_STATE.current / DNA_QUESTIONS.length) * 100);

  root.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;background:radial-gradient(ellipse at 60% 30%, rgba(167,139,250,0.08), transparent 60%)">
      <div style="max-width:560px;width:100%;">
        <!-- Progress -->
        <div style="margin-bottom:2rem">
          <div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--text2);margin-bottom:.5rem">
            <span>🧬 Algo DNA Quiz</span><span>Question ${DNA_STATE.current + 1} of ${DNA_QUESTIONS.length}</span>
          </div>
          <div style="height:5px;background:rgba(167,139,250,0.15);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--rose),var(--lavender));transition:width .4s ease"></div>
          </div>
        </div>
        <!-- Question Card -->
        <div class="card animate-fade-in" style="text-align:center;padding:2.5rem 2rem;margin-bottom:1.5rem;border-color:rgba(167,139,250,0.25)">
          <div style="font-size:.8rem;color:var(--text3);margin-bottom:1.5rem;text-transform:uppercase;letter-spacing:.1em">${{ risk: 'Risk Appetite', patience: 'Patience Level', emotion: 'Emotion Control', knowledge: 'Market Knowledge' }[q.cat]}</div>
          <p style="font-size:1.25rem;font-weight:700;line-height:1.5;margin-bottom:0">${q.q}</p>
        </div>
        <!-- Options -->
        <div style="display:flex;flex-direction:column;gap:1rem">
          <button onclick="answerDNA('A')" class="btn" style="padding:1.2rem 1.5rem;background:var(--glass);border:1px solid var(--border);border-radius:14px;font-size:1rem;text-align:left;color:var(--text);cursor:pointer;transition:all .2s;line-height:1.4" onmouseover="this.style.borderColor='var(--rose)';this.style.background='var(--rose-dim)'" onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--glass)')">
            <strong style="color:var(--rose)">A</strong>&nbsp; ${q.a}
          </button>
          <button onclick="answerDNA('B')" class="btn" style="padding:1.2rem 1.5rem;background:var(--glass);border:1px solid var(--border);border-radius:14px;font-size:1rem;text-align:left;color:var(--text);cursor:pointer;transition:all .2s;line-height:1.4" onmouseover="this.style.borderColor='var(--lavender)';this.style.background='var(--lavender-dim)'" onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--glass)'">
            <strong style="color:var(--lavender)">B</strong>&nbsp; ${q.b}
          </button>
        </div>
        ${DNA_STATE.current > 0 ? `<button onclick="goBackDNA()" style="margin-top:1rem;background:none;border:none;color:var(--text3);cursor:pointer;font-size:.85rem">← Back</button>` : ''}
      </div>
    </div>`;
}

function answerDNA(choice) {
  const q = DNA_QUESTIONS[DNA_STATE.current];
  // Remove previous answer for this question if going back
  DNA_STATE.answers = DNA_STATE.answers.filter(a => a.id !== q.id);
  DNA_STATE.answers.push({ id: q.id, answer: choice, cat: q.cat });
  DNA_STATE.current++;
  if (DNA_STATE.current >= DNA_QUESTIONS.length) revealDNA();
  else renderDNAQuestion();
}

function goBackDNA() {
  if (DNA_STATE.current > 0) { DNA_STATE.current--; renderDNAQuestion(); }
}

function scoreDNA() {
  const cats = { risk: [], patience: [], emotion: [], knowledge: [] };
  // high-score option for each question
  const highB = [1, 2, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // question IDs where B = high score
  const highA = [6]; // question ID where A = high score

  DNA_STATE.answers.forEach(a => {
    const isHigh = (highA.includes(a.id) && a.answer === 'A') || (highB.includes(a.id) && a.answer === 'B');
    cats[a.cat].push(isHigh ? 1 : 0);
  });

  const score = cat => cats[cat].length ? Math.round((cats[cat].reduce((s, v) => s + v, 0) / cats[cat].length) * 100) : 50;
  return { risk: score('risk'), patience: score('patience'), emotion: score('emotion'), knowledge: score('knowledge') };
}

function classifyDNA(s) {
  if (s.risk >= 65 && s.patience >= 65) return 'steady_elephant';
  if (s.risk >= 65 && s.patience < 50) return 'bold_lion';
  if (s.risk < 40 && s.patience >= 55) return 'cautious_owl';
  if (s.risk < 40 && s.patience < 45) return 'quick_rabbit';
  return 'balanced_eagle';
}

function revealDNA() {
  const root = document.getElementById('dna-root');
  const scores = scoreDNA();
  const dnaKey = classifyDNA(scores);
  const dna = DNA_TYPES[dnaKey];
  DNA_STATE.profile = { key: dnaKey, scores, dna };

  // Loading screen → then reveal
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;text-align:center">
      <div style="font-size:4rem;animation:pulse 1s infinite">🧬</div>
      <p style="margin-top:1rem;color:var(--lavender-lt);font-weight:700">Analysing your Algo DNA...</p>
    </div>`;

  setTimeout(() => {
    // Confetti burst
    launchConfetti();

    // Matched strategies
    const MATCHED = {
      cautious_owl: [{ n: 'Blue Chip Rebound', e: '🏛️', c: 96, r: 'LOW', h: 'Swing' }, { n: 'Balanced Eagle Fund', e: '🦅', c: 88, r: 'LOW', h: 'Positional' }, { n: 'Nifty Momentum Pro', e: '⚡', c: 72, r: 'MEDIUM', h: 'Positional' }],
      bold_lion: [{ n: 'Nifty Momentum Pro', e: '⚡', c: 97, r: 'MEDIUM', h: 'Intraday' }, { n: 'Options Wheel', e: '🎡', c: 83, r: 'HIGH', h: 'Positional' }, { n: 'Blue Chip Rebound', e: '🏛️', c: 65, r: 'LOW', h: 'Swing' }],
      steady_elephant: [{ n: 'Options Wheel', e: '🎡', c: 95, r: 'HIGH', h: 'Positional' }, { n: 'Nifty Momentum Pro', e: '⚡', c: 89, r: 'MEDIUM', h: 'Positional' }, { n: 'Blue Chip Rebound', e: '🏛️', c: 78, r: 'LOW', h: 'Swing' }],
      quick_rabbit: [{ n: 'Nifty Momentum Pro', e: '⚡', c: 93, r: 'MEDIUM', h: 'Intraday' }, { n: 'Blue Chip Rebound', e: '🏛️', c: 84, r: 'LOW', h: 'Swing' }, { n: 'Options Wheel', e: '🎡', c: 60, r: 'HIGH', h: 'Positional' }],
      balanced_eagle: [{ n: 'Blue Chip Rebound', e: '🏛️', c: 91, r: 'LOW', h: 'Swing' }, { n: 'Nifty Momentum Pro', e: '⚡', c: 87, r: 'MEDIUM', h: 'Positional' }, { n: 'Options Wheel', e: '🎡', c: 73, r: 'HIGH', h: 'Positional' }],
    };
    const matched = MATCHED[dnaKey] || MATCHED.balanced_eagle;

    root.innerHTML = `
      <div style="max-width:720px;margin:0 auto;padding:2rem 1.5rem">
        <!-- DNA Reveal -->
        <div class="card animate-fade-in" style="text-align:center;padding:3rem 2rem;margin-bottom:2rem;border-color:${dna.color}44;background:${dna.color}0A">
          <div style="font-size:6rem;line-height:1;margin-bottom:1rem;animation:drift 3s ease-in-out infinite alternate">${dna.emoji}</div>
          <h1 style="font-size:2.2rem;font-weight:900;margin-bottom:.5rem">You are a</h1>
          <h2 style="font-size:2.5rem;font-weight:900;color:${dna.color};margin-bottom:.75rem">${dna.name}</h2>
          <p style="color:var(--text2);font-size:1.1rem;margin-bottom:1.5rem;font-style:italic">"${dna.tagline}"</p>
          <p style="color:var(--text2);font-size:.95rem;max-width:440px;margin:0 auto 1.5rem">${dna.desc}</p>
          <!-- Score Radar (Canvas) -->
          <canvas id="dnaRadar" width="260" height="260" style="margin:0 auto;display:block"></canvas>
          <!-- Score Bars -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-top:1.5rem;text-align:left">
            ${[['Risk Appetite', scores.risk, 'var(--rose)'], ['Patience Level', scores.patience, 'var(--lavender)'], ['Emotion Control', scores.emotion, 'var(--sky)'], ['Market Knowledge', scores.knowledge, 'var(--peach)']].map(([l, v, c]) => `
              <div>
                <div style="font-size:.78rem;color:var(--text3);margin-bottom:.25rem">${l}</div>
                <div style="height:8px;background:rgba(255,255,255,0.07);border-radius:4px;overflow:hidden">
                  <div style="height:100%;width:${v}%;background:${c};border-radius:4px;transition:width 1s ease"></div>
                </div>
                <div style="font-size:.78rem;font-weight:700;margin-top:.2rem;color:${c}">${v}/100</div>
              </div>`).join('')}
          </div>
          <button onclick="showToast('📱 Share feature coming soon!','info')" class="btn btn-outline" style="margin-top:1.5rem">🔗 Share My Algo DNA</button>
        </div>
        <!-- Matched Strategies -->
        <h2 style="font-size:1.5rem;font-weight:900;margin-bottom:.25rem">Your Perfect Strategies</h2>
        <p style="color:var(--text2);margin-bottom:1.5rem">Based on your DNA profile — sorted by compatibility</p>
        ${matched.map(m => `
          <div class="strategy-instance-card" style="margin-bottom:.75rem;flex-wrap:wrap;gap:.75rem;border-color:rgba(167,139,250,0.2)">
            <div style="font-size:2rem">${m.e}</div>
            <div style="flex:1">
              <div style="font-weight:800">${m.n}</div>
              <div style="font-size:.78rem;color:var(--text3)">${m.r} Risk · ${m.h}</div>
            </div>
            <div style="display:flex;align-items:center;gap:.75rem">
              <div style="text-align:center">
                <div style="font-size:1.4rem;font-weight:900;color:var(--sky)">${m.c}%</div>
                <div style="font-size:.7rem;color:var(--text3)">DNA Match</div>
              </div>
              <button onclick="showPage('marketplace');showToast('Opening marketplace...','info')" class="btn btn-primary btn-sm">Activate →</button>
            </div>
          </div>`).join('')}
        <div class="sebi-inline" style="margin-top:1.5rem">⚖️ DNA matching is based on psychology only, not financial advice. SEBI Disclaimer: Past performance is not indicative of future results.</div>
        <button onclick="renderDNA()" class="btn btn-ghost" style="margin-top:1rem;width:100%">🔄 Retake Quiz</button>
      </div>`;

    setTimeout(() => drawDNARadar(scores), 100);
  }, 2200);
}

function drawDNARadar(scores) {
  const canvas = document.getElementById('dnaRadar');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = 130, cy = 130, r = 100;
  const labels = ['Risk', 'Patience', 'Emotion', 'Knowledge'];
  const vals = [scores.risk, scores.patience, scores.emotion, scores.knowledge].map(v => v / 100);
  const colors = ['#F472B6', '#A78BFA', '#67E8F9', '#FDBA74'];
  const angles = labels.map((_, i) => (i * Math.PI * 2 / 4) - Math.PI / 2);

  ctx.clearRect(0, 0, 260, 260);

  // Grid circles
  [0.25, 0.5, 0.75, 1].forEach(scale => {
    ctx.beginPath();
    angles.forEach((a, i) => { const x = cx + Math.cos(a) * r * scale; const y = cy + Math.sin(a) * r * scale; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.closePath(); ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.stroke();
  });

  // Axes
  angles.forEach(a => {
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.stroke();
  });

  // Data polygon
  ctx.beginPath();
  angles.forEach((a, i) => { const x = cx + Math.cos(a) * r * vals[i]; const y = cy + Math.sin(a) * r * vals[i]; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.closePath();
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(167,139,250,0.4)'); grad.addColorStop(1, 'rgba(244,114,182,0.15)');
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = '#A78BFA'; ctx.lineWidth = 2; ctx.stroke();

  // Labels
  angles.forEach((a, i) => {
    const lx = cx + Math.cos(a) * (r + 18); const ly = cy + Math.sin(a) * (r + 18);
    ctx.fillStyle = colors[i]; ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${labels[i]} ${Math.round(vals[i] * 100)}`, lx, ly);
  });
}

function launchConfetti() {
  const colors = ['#F472B6', '#A78BFA', '#67E8F9', '#FDBA74', '#86EFAC'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;z-index:9999;width:8px;height:8px;border-radius:2px;background:${colors[i % 5]};top:-10px;left:${Math.random() * 100}vw;animation:confettiFall ${1.5 + Math.random() * 1.5}s linear ${Math.random() * 0.5}s forwards;pointer-events:none;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
  if (!document.getElementById('confettiStyle')) {
    const s = document.createElement('style');
    s.id = 'confettiStyle';
    s.innerHTML = `@keyframes confettiFall{to{transform:translateY(110vh) rotate(${360 + Math.random() * 360}deg);opacity:0}}`;
    document.head.appendChild(s);
  }
}


/* ==========================================================
   🎯 FEATURE 2 — LIFE EVENT MODE
   ========================================================== */

const EVENTS = [
  { type: 'wedding', emoji: '💍', label: 'Getting Married', color: '#F472B6' },
  { type: 'house', emoji: '🏠', label: 'Buying a House', color: '#67E8F9' },
  { type: 'education', emoji: '🎓', label: 'Child\'s Education', color: '#A78BFA' },
  { type: 'vacation', emoji: '✈️', label: 'Dream Vacation', color: '#86EFAC' },
  { type: 'emergency_fund', emoji: '🏥', label: 'Emergency Fund', color: '#FDBA74' },
  { type: 'retirement', emoji: '🌅', label: 'Retirement', color: '#FDA4AF' },
];

const DEMO_GOALS = [
  {
    id: 'g1', type: 'wedding', emoji: '💍', name: "Priya's Wedding", deadline: '2026-10-15', target: 500000, current: 335000, sip: 8200, strategy: 'balanced_growth', stratLabel: '⚖️ Balanced Mode', pct: 67, shifts: [
      { date: 'Aug 2025', from: 'Growth Mode 🚀', to: 'Balanced Mode ⚖️', reason: '12 months away' },
      { date: 'Feb 2026', from: 'Balanced Mode ⚖️', to: 'Protection Mode 🛡️', reason: '8 months away' },
    ]
  },
  { id: 'g2', type: 'house', emoji: '🏠', name: 'First Home Purchase', deadline: '2027-06-01', target: 2500000, current: 750000, sip: 45000, strategy: 'aggressive_growth', stratLabel: '🚀 Growth Mode', pct: 30, shifts: [] },
];

const GOAL_FORM = { step: 1, type: null, name: '', target: '', deadline: '', starting: '' };

function renderGoals() {
  const root = document.getElementById('goals-root');
  root.innerHTML = `
    <div class="page-header"><div class="container"><h1>🎯 Life Event Goals</h1><p>Invest with purpose — AlgoStreet auto-adjusts strategy as your deadline approaches.</p></div></div>
    <div class="container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
        <h2 style="font-size:1.3rem;font-weight:800">Your Goals</h2>
        <button class="btn btn-primary" onclick="showPage('new-goal')">+ New Goal</button>
      </div>
      ${DEMO_GOALS.map(renderGoalCard).join('')}
      <div class="sebi-inline">⚖️ Projected returns are based on historical strategy performance. Past performance does not guarantee future results. SEBI compliant.</div>
    </div>`;
}

function renderGoalCard(g) {
  const now = new Date();
  const dl = new Date(g.deadline);
  const monthsL = Math.max(0, Math.round((dl - now) / (1000 * 60 * 60 * 24 * 30.5)));
  const svgRing = progressRingSVG(g.pct, '#A78BFA', monthsL <= 6 ? '#F472B6' : '#67E8F9');
  return `
    <div class="card" style="margin-bottom:1.5rem">
      <div style="display:flex;align-items:flex-start;gap:1.5rem;flex-wrap:wrap">
        <!-- Ring -->
        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center">
          ${svgRing}
          <div style="font-size:.75rem;color:var(--text3);margin-top:.25rem">${g.pct}% done</div>
        </div>
        <!-- Info -->
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.4rem">
            <span style="font-size:1.6rem">${g.emoji}</span>
            <div>
              <div style="font-weight:800;font-size:1.1rem">${g.name}</div>
              <div style="font-size:.82rem;color:var(--text3)">${monthsL} months away · ${g.deadline}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:.75rem 0">
            <div class="card" style="padding:.75rem"><div style="font-size:.75rem;color:var(--text3)">Current / Target</div><div style="font-weight:800;font-size:1rem">₹${fmt(g.current)} / ₹${fmt(g.target)}</div></div>
            <div class="card" style="padding:.75rem"><div style="font-size:.75rem;color:var(--text3)">Monthly SIP</div><div style="font-weight:800;font-size:1rem">₹${fmt(g.sip)}/mo</div></div>
          </div>
          <div style="margin-bottom:.75rem">
            <span style="background:rgba(103,232,249,0.1);border:1px solid rgba(103,232,249,0.25);color:var(--sky);padding:.3rem .85rem;border-radius:20px;font-size:.78rem;font-weight:700">${g.stratLabel}</span>
          </div>
          <!-- Strategy Timeline -->
          ${g.shifts.length ? `<div style="font-size:.8rem;color:var(--text3);margin-bottom:.4rem;font-weight:700">Strategy Shifts:</div>` : ''}
          ${g.shifts.map(s => `<div style="font-size:.78rem;color:var(--text3);padding:.3rem 0;border-bottom:1px solid rgba(167,139,250,0.08)">
            📅 ${s.date}: ${s.from} → ${s.to} <em>(${s.reason})</em>
          </div>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:.75rem;margin-top:1.25rem;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="addFunds('${g.id}')">+ Add Funds</button>
        <button class="btn btn-ghost btn-sm" onclick="showToast('🔔 Notifications active for this goal','info')">🔔 Alerts</button>
        <button class="btn btn-outline btn-sm" style="color:var(--red);border-color:var(--red)" onclick="showToast('⏸ Goal paused','info')">⏸ Pause</button>
      </div>
    </div>`;
}

function progressRingSVG(pct, trackColor, fillColor) {
  const r = 45, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return `<svg width="110" height="110" viewBox="0 0 110 110">
    <circle cx="55" cy="55" r="${r}" fill="none" stroke="rgba(167,139,250,0.1)" stroke-width="10"/>
    <circle cx="55" cy="55" r="${r}" fill="none" stroke="${fillColor}" stroke-width="10"
      stroke-dasharray="${dash} ${circ}" stroke-linecap="round"
      transform="rotate(-90 55 55)" style="transition:stroke-dasharray 1s ease"/>
    <text x="55" y="59" text-anchor="middle" fill="white" font-size="14" font-weight="800" font-family="Inter">${pct}%</text>
  </svg>`;
}

function addFunds(goalId) {
  const amt = prompt('Add funds (₹):');
  if (amt && !isNaN(amt) && +amt > 0) {
    const g = DEMO_GOALS.find(x => x.id === goalId);
    if (g) {
      g.current += +amt;
      g.pct = Math.round(Math.min(100, (g.current / g.target) * 100));
      renderGoals();
      showToast(`✅ ₹${fmt(+amt)} added to "${g.name}"!`, 'success');
    }
  }
}

function renderNewGoal() {
  const root = document.getElementById('new-goal-root');
  GOAL_FORM.step = 1; GOAL_FORM.type = null;
  root.innerHTML = `
    <div style="max-width:600px;margin:0 auto;padding:2rem 1.5rem">
      <button class="btn btn-ghost btn-sm" onclick="showPage('goals')" style="margin-bottom:1.5rem">← Back to Goals</button>
      <h1 style="font-size:1.75rem;font-weight:900;margin-bottom:.4rem">Create a New Goal</h1>
      <p style="color:var(--text2);margin-bottom:2rem">What are you saving for?</p>
      <div id="goal-form-body">${renderGoalStep1()}</div>
    </div>`;
}

function renderGoalStep1() {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem">
    ${EVENTS.map(e => `
      <div onclick="selectGoalType('${e.type}')" style="background:${e.color}0A;border:2px solid ${e.color}22;border-radius:16px;padding:1.5rem 1rem;text-align:center;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor='${e.color}';this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='${e.color}22';this.style.transform=''">
        <div style="font-size:2.5rem">${e.emoji}</div>
        <div style="font-weight:700;margin-top:.5rem;font-size:.9rem">${e.label}</div>
      </div>`).join('')}
  </div>`;
}

function selectGoalType(type) {
  GOAL_FORM.type = type;
  const meta = EVENTS.find(e => e.type === type);
  document.getElementById('goal-form-body').innerHTML = `
    <div class="card animate-fade-in" style="border-color:${meta.color}44">
      <div style="text-align:center;margin-bottom:1.5rem">
        <span style="font-size:3rem">${meta.emoji}</span>
        <h3 style="font-weight:800;margin-top:.5rem">${meta.label}</h3>
      </div>
      <div class="form-field"><label class="form-label">Goal Name</label>
        <input class="select-field" id="gname" placeholder='E.g. "Priya\'s Wedding"' /></div>
      <div class="form-field"><label class="form-label">Target Amount (₹)</label>
        <input class="select-field" id="gtarget" type="number" min="1000" placeholder="500000" /></div>
      <div class="form-field"><label class="form-label">Deadline</label>
        <input class="select-field" id="gdeadline" type="date" min="${new Date().toISOString().split('T')[0]}" /></div>
      <div class="form-field"><label class="form-label">Starting Amount (₹) — optional</label>
        <input class="select-field" id="gstart" type="number" min="0" placeholder="0" /></div>
      <button class="btn btn-primary" style="width:100%;margin-top:.5rem" onclick="calcGoal()">Calculate My SIP →</button>
    </div>`;
}

function calcGoal() {
  const name = document.getElementById('gname')?.value || 'My Goal';
  const target = +document.getElementById('gtarget')?.value || 500000;
  const dl = document.getElementById('gdeadline')?.value;
  const starting = +document.getElementById('gstart')?.value || 0;
  if (!dl) { showToast('Please set a deadline date.', 'error'); return; }
  const months = Math.max(1, Math.round((new Date(dl) - new Date()) / (1000 * 60 * 60 * 24 * 30.5)));
  const monthly_rate = (months > 12 ? 0.175 : months > 6 ? 0.115 : 0.07) / 12;
  const remaining = Math.max(0, target - starting);
  let sip = 0;
  if (monthly_rate > 0 && months > 0) {
    sip = Math.round(remaining * monthly_rate / (Math.pow(1 + monthly_rate, months) - 1));
  } else { sip = Math.round(remaining / months); }
  const strategyLabel = months > 12 ? '🚀 Growth Mode' : months > 6 ? '⚖️ Balanced Mode' : '🛡️ Protection Mode';

  document.getElementById('goal-form-body').innerHTML = `
    <div class="card animate-fade-in" style="text-align:center;padding:2.5rem">
      <div style="font-size:3rem;margin-bottom:1rem">🎯</div>
      <h2 style="font-size:1.5rem;font-weight:900;margin-bottom:.25rem">${name}</h2>
      <p style="color:var(--text2);margin-bottom:1.5rem">Target ₹${fmt(target)} by ${dl}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">
        <div class="stat-box"><div class="stat-box-val" style="color:var(--sky)">₹${fmt(sip)}</div><div class="stat-box-lbl">Recommended SIP/Month</div></div>
        <div class="stat-box"><div class="stat-box-val">${months}mo</div><div class="stat-box-lbl">Months to Deadline</div></div>
        <div class="stat-box" style="grid-column:1/-1"><div class="stat-box-val" style="color:var(--lavender-lt)">${strategyLabel}</div><div class="stat-box-lbl">Starting Strategy (auto-shifts as deadline nears)</div></div>
      </div>
      <div class="sebi-inline">⚖️ Projected SIP uses historical strategy returns. Past performance does not guarantee future results.</div>
      <div style="display:flex;gap:1rem;justify-content:center;margin-top:1.5rem">
        <button class="btn btn-primary btn-lg" onclick="createGoal('${name}',${target},'${dl}',${starting},${sip})">✅ Create Goal</button>
        <button class="btn btn-ghost btn-lg" onclick="renderNewGoal()">← Edit</button>
      </div>
    </div>`;
}

function createGoal(name, target, deadline, starting, sip) {
  DEMO_GOALS.push({
    id: 'g' + Date.now(), type: GOAL_FORM.type || 'wedding', emoji: EVENTS.find(e => e.type === GOAL_FORM.type)?.emoji || '🎯',
    name, deadline, target, current: starting, sip, strategy: 'aggressive_growth', stratLabel: '🚀 Growth Mode', pct: Math.round((starting / target) * 100) || 0, shifts: []
  });
  showToast(`🎯 Goal "${name}" created! SIP of ₹${fmt(sip)}/month recommended.`, 'success');
  showPage('goals');
}


/* ==========================================================
   ☀️ FEATURE 3 — MARKET WEATHER
   ========================================================== */

const MOCK_WEATHER = {
  CLEAR: { emoji: '☀️', label: 'Clear Skies', color: '#86EFAC', desc: 'All signals positive — full speed ahead', multiplier: 1.00 },
  CLOUDY: { emoji: '⛅', label: 'Cloudy Conditions', color: '#FDBA74', desc: 'Mixed signals — trading at 80% position size', multiplier: 0.80 },
  RAINY: { emoji: '🌧️', label: 'Rainy Markets', color: '#67E8F9', desc: 'Caution — trading at 60% position size', multiplier: 0.60 },
  STORM: { emoji: '⛈️', label: 'Market Storm', color: '#FDA4AF', desc: 'Defensive mode — trading at 40% position size', multiplier: 0.40 },
  FOGGY: { emoji: '🌫️', label: 'Foggy Visibility', color: '#C4B5FD', desc: 'High uncertainty — waiting for clarity', multiplier: 0.60 },
};

const MOCK_SIGNALS = { vix: 15.2, vixMood: 'NEUTRAL 😊', fii: -840, fiiSignal: 'FII selling ↓', sentiment: '4 positive / 6 negative', niftyChg: '-0.3%' };
const MOCK_NEWS = [
  { t: 'RBI holds repo rate — markets react with mild optimism', s: 'positive', sev: 5 },
  { t: 'FIIs sold ₹840 Cr in equities on global risk-off mood', s: 'negative', sev: 6 },
  { t: 'Q3 results: Reliance beats estimates, TCS in-line', s: 'positive', sev: 4 },
  { t: 'SEBI tightens F&O margin rules effective next month', s: 'neutral', sev: 3 },
  { t: 'China slowdown weighs on IT sector outlook', s: 'negative', sev: 5 },
  { t: 'Nifty 50 P/E at 22x — slightly above historical mean', s: 'neutral', sev: 3 },
  { t: 'India VIX spikes to 16 amid global uncertainty', s: 'negative', sev: 7 },
  { t: 'Domestic MF inflows hit record ₹18,000 Cr in January', s: 'positive', sev: 6 },
];

const WEATHER_HISTORY = [
  { day: 'Mon', w: 'CLEAR', vix: 12.1, nifty: '+0.8%' },
  { day: 'Tue', w: 'CLOUDY', vix: 14.5, nifty: '+0.2%' },
  { day: 'Wed', w: 'RAINY', vix: 16.8, nifty: '-0.6%' },
  { day: 'Thu', w: 'CLOUDY', vix: 15.2, nifty: '-0.3%' },
  { day: 'Fri', w: 'STORM', vix: 21.4, nifty: '-1.8%' },
  { day: 'Mon', w: 'CLOUDY', vix: 18.0, nifty: '-0.4%' },
  { day: 'Tue', w: 'CLEAR', vix: 13.2, nifty: '+1.1%' },
];

let currentWeatherType = 'CLOUDY'; // live-sim state

function renderWeather() {
  const root = document.getElementById('weather-root');
  const w = MOCK_WEATHER[currentWeatherType];
  const sig = MOCK_SIGNALS;
  const sentColors = { positive: 'var(--sky)', negative: 'var(--red)', neutral: 'var(--text3)' };
  const sentEmojis = { positive: '🟢', negative: '🔴', neutral: '⚪' };

  root.innerHTML = `
    <div class="page-header"><div class="container"><h1>☀️ Market Weather</h1><p>Real-time market intelligence — your algo adjusts position sizes automatically.</p></div></div>
    <div class="container">

      <!-- Weather Widget -->
      <div class="card animate-fade-in" style="margin-bottom:1.5rem;border-color:${w.color}44;background:${w.color}08;padding:2rem">
        <div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap">
          <div style="font-size:5rem;line-height:1;animation:drift 4s ease-in-out infinite alternate">${w.emoji}</div>
          <div style="flex:1">
            <h2 style="font-size:1.7rem;font-weight:900;color:${w.color};margin-bottom:.3rem">${w.label}</h2>
            <p style="color:var(--text2);margin-bottom:1rem">${w.desc}</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.75rem">
              <div class="stat-box" style="text-align:left">
                <div style="font-size:.72rem;color:var(--text3)">India VIX</div>
                <div style="font-weight:800">${sig.vix} <span style="font-size:.75rem;color:var(--text2)">${sig.vixMood}</span></div>
              </div>
              <div class="stat-box" style="text-align:left">
                <div style="font-size:.72rem;color:var(--text3)">FII Flow Today</div>
                <div style="font-weight:800;color:var(--red)">₹${Math.abs(sig.fii)} Cr ${sig.fiiSignal}</div>
              </div>
              <div class="stat-box" style="text-align:left">
                <div style="font-size:.72rem;color:var(--text3)">Nifty Change</div>
                <div style="font-weight:800;color:${sig.niftyChg.startsWith('+') ? 'var(--sky)' : 'var(--red)'}">${sig.niftyChg}</div>
              </div>
              <div class="stat-box" style="text-align:left">
                <div style="font-size:.72rem;color:var(--text3)">News Sentiment</div>
                <div style="font-weight:800;font-size:.85rem">${sig.sentiment}</div>
              </div>
            </div>
          </div>
        </div>
        <div style="margin-top:1.5rem;padding:1rem;background:rgba(167,139,250,0.06);border-radius:10px;border:1px solid rgba(167,139,250,0.12);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem">
          <div>
            <span style="font-size:.8rem;color:var(--text3)">Your Algo Position Size</span>
            <div style="font-weight:800;font-size:1.3rem;margin-top:.2rem">${Math.round(w.multiplier * 100)}% of normal size ✅</div>
          </div>
          <div style="display:flex;gap:.75rem">
            ${Object.entries(MOCK_WEATHER).map(([k, v]) => `<span onclick="switchWeather('${k}')" title="Simulate ${v.label}" style="font-size:1.5rem;cursor:pointer;opacity:${k === currentWeatherType ? '1' : '0.4'};transition:opacity .2s" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${k === currentWeatherType ? "1" : "0.4"}'">  ${v.emoji}</span>`).join('')}
          </div>
        </div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:.75rem">🕐 Updated ${new Date().toLocaleTimeString('en-IN')} · Data from NSE India · <em>Weather signals are informational, not investment advice.</em></div>
      </div>

      <!-- Weather History Chart -->
      <div class="card" style="margin-bottom:1.5rem">
        <div class="section-title">📅 7-Day Weather History</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:.5rem;text-align:center;margin-top:.5rem">
          ${WEATHER_HISTORY.map(h => {
    const wm = MOCK_WEATHER[h.w]; return `
            <div style="padding:.75rem .25rem;background:${wm.color}0F;border:1px solid ${wm.color}22;border-radius:10px">
              <div style="font-size:1.5rem">${wm.emoji}</div>
              <div style="font-size:.7rem;color:var(--text3);margin:.2rem 0">${h.day}</div>
              <div style="font-size:.72rem;font-weight:700;color:${h.nifty.startsWith('+') ? 'var(--sky)' : 'var(--red)'}">${h.nifty}</div>
              <div style="font-size:.65rem;color:var(--text3)">VIX ${h.vix}</div>
            </div>`;
  }).join('')}
        </div>
      </div>

      <!-- News Feed -->
      <div class="card" style="margin-bottom:1.5rem">
        <div class="section-title">📰 Market News Feed <span style="font-size:.75rem;color:var(--text3);font-weight:400">— AI sentiment tagged</span></div>
        ${MOCK_NEWS.map(n => `
          <div style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 0;border-bottom:1px solid rgba(167,139,250,0.06)">
            <span style="font-size:1rem;flex-shrink:0">${sentEmojis[n.s]}</span>
            <div style="flex:1">
              <div style="font-size:.875rem;color:var(--text)">${n.t}</div>
              <div style="font-size:.72rem;margin-top:.2rem;color:${sentColors[n.s]};font-weight:700">${n.s.charAt(0).toUpperCase() + n.s.slice(1)} · Severity ${n.sev}/10</div>
            </div>
          </div>`).join('')}
      </div>

      <div class="sebi-inline">⚖️ Market Weather is informational only. AlgoStreet does not provide investment advice. Weather-triggered position adjustments are risk management aids, not trading recommendations.</div>
    </div>`;
}

function switchWeather(type) {
  currentWeatherType = type;
  const w = MOCK_WEATHER[type];
  showToast(`${w.emoji} Simulating: ${w.label} — ${w.desc}`, 'info');
  renderWeather();
}

// ─── App Init ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Start real market data load
  DataService.loadAll();

  // Refresh market data every 60 seconds
  setInterval(() => DataService.loadAll(), 60000);

  // Navbar scroll shadow
  window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 10);
  });

  // Draw hero chart
  setTimeout(() => {
    const c = document.getElementById('heroChart');
    if (c) drawSparkline(c, genEquityCurve(30, 100000, 0.001), true);
  }, 100);
});

function toggleMobileMenu() {
  document.getElementById('navLinks')?.classList.toggle('open');
}

// ─── BROKER INTEGRATIONS ─────────────────────
const BROKERS = [
  {
    id: 'zerodha',
    name: 'Zerodha Kite',
    desc: 'India\'s largest stockbroker. Real-time data, F&O, and equity.',
    logo: '🟠',
    api: 'Kite Connect API',
    plan: '₹2,000/month for API access',
    features: ['Real-time quotes', 'Order placement', 'Historical data', 'GTT orders'],
    docs: 'https://kite.trade/docs',
    authUrl: 'https://kite.zerodha.com/connect/login',
    status: 'connect',
  },
  {
    id: 'angelone',
    name: 'Angel One',
    desc: 'Full-service broker with free SmartAPI access for algo trading.',
    logo: '🔵',
    api: 'SmartAPI',
    plan: 'Free for Angel One customers',
    features: ['Live market data', 'Order management', 'WebSocket feed', 'Portfolio access'],
    docs: 'https://smartapi.angelbroking.com',
    authUrl: 'https://smartapi.angelbroking.com/login',
    status: 'connect',
  },
  {
    id: 'upstox',
    name: 'Upstox',
    desc: 'Modern broker with low brokerage and a clean API.',
    logo: '🟣',
    api: 'Upstox API v2',
    plan: 'Free for Upstox customers',
    features: ['Market quotes', 'Order APIs', 'Historical OHLC', 'Webhook notifications'],
    docs: 'https://upstox.com/developer/api-documentation',
    authUrl: 'https://api.upstox.com/v2/login/authorization/dialog',
    status: 'connect',
  },
  {
    id: 'fyers',
    name: 'Fyers',
    desc: 'Tech-first broker built for algo traders. Excellent API performance.',
    logo: '🟢',
    api: 'Fyers API v3',
    plan: '₹500/month for API + data feeds',
    features: ['WebSocket market feed', 'Order/trade APIs', 'Basket orders', 'Strategy alerts'],
    docs: 'https://myapi.fyers.in',
    authUrl: 'https://api.fyers.in/api/v2/generate-authcode',
    status: 'connect',
  },
  {
    id: 'fivepaisa',
    name: '5paisa',
    desc: 'Discount broker with flat brokerage and open API platform.',
    logo: '🟡',
    api: '5paisa API',
    plan: 'Free for 5paisa account holders',
    features: ['Market data', 'Order placement', 'Portfolio tracking', 'Margin info'],
    docs: 'https://www.5paisa.com/developer-api',
    authUrl: 'https://dev-openapi.5paisa.com/WebPages/Auth',
    status: 'connect',
  },
];

const brokerState = {}; // { zerodha: 'connected' | 'connecting' | 'connect' }

function renderBrokers() {
  const root = document.getElementById('brokers-root');
  root.innerHTML = `
    <div class="page-header">
      <div class="container">
        <div class="back-btn" onclick="showPage('home')">← Back</div>
        <h1>Broker Integrations</h1>
        <p>Connect your trading account via OAuth — your API credentials are stored only on your device, never on our servers.</p>
      </div>
    </div>
    <div class="container">

      <!-- Security notice -->
      <div style="background:var(--green-dim);border:1px solid rgba(0,208,156,.2);border-radius:var(--radius);padding:1rem 1.25rem;margin-bottom:2rem;display:flex;align-items:flex-start;gap:.75rem">
        <span style="font-size:1.2rem">🔒</span>
        <div>
          <div style="font-weight:700;font-size:13px;margin-bottom:.2rem">Your keys never leave your device</div>
          <div style="font-size:12px;color:var(--text2)">AlgoStreet uses OAuth 2.0. We receive a temporary session token only — never your login password or permanent API key. You can revoke access anytime from your broker's app.</div>
        </div>
      </div>

      <!-- Connected count -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
        <span class="section-title">Available Brokers</span>
        <span id="connectedCount" style="font-size:12px;color:var(--text2)">0 of 5 connected</span>
      </div>

      <!-- Broker cards -->
      <div style="display:flex;flex-direction:column;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden" id="brokerList">
        ${BROKERS.map(b => renderBrokerRow(b)).join('')}
      </div>

      <!-- How it works -->
      <div class="card" style="margin-top:2rem">
        <div class="section-title" style="margin-bottom:1rem">How OAuth connection works</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem">
          ${[
      ['1', 'Click Connect', 'You\'re redirected to your broker\'s official login page \u2014 not AlgoStreet.'],
      ['2', 'Authorize', 'You log in and approve which permissions AlgoStreet can use.'],
      ['3', 'Token returned', 'Broker sends a secure access token back. Never your password.'],
      ['4', 'Trade securely', 'AlgoStreet uses the token to place orders and read prices on your behalf.'],
    ].map(([n, t, d]) => `
            <div style="display:flex;gap:.75rem">
              <div style="width:24px;height:24px;border-radius:50%;background:var(--green-dim);border:1px solid rgba(0,208,156,.25);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--green);flex-shrink:0">${n}</div>
              <div><div style="font-size:13px;font-weight:700;margin-bottom:.2rem">${t}</div><div style="font-size:12px;color:var(--text2)">${d}</div></div>
            </div>`).join('')}
        </div>
      </div>

      <div class="sebi-inline" style="margin-top:1.5rem">AlgoStreet is not affiliated with or endorsed by any of the above brokers. API availability and pricing subject to change by respective brokers.</div>
    </div>`;
}

function renderBrokerRow(b) {
  const st = brokerState[b.id] || b.status;
  const isConnected = st === 'connected';
  const isConnecting = st === 'connecting';
  return `
  <div style="background:var(--bg2);padding:1.25rem 1.5rem;display:flex;align-items:center;gap:1.25rem" id="broker-row-${b.id}">
    <div style="font-size:2rem;width:48px;text-align:center">${b.logo}</div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.2rem">
        <span style="font-weight:700;font-size:14px">${b.name}</span>
        ${isConnected ? '<span style="background:var(--green-dim);color:var(--green);border:1px solid rgba(0,208,156,.2);padding:.1rem .55rem;border-radius:20px;font-size:10px;font-weight:700">● CONNECTED</span>' : ''}
      </div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:.5rem">${b.desc}</div>
      <div style="display:flex;flex-wrap:wrap;gap:.35rem">
        ${b.features.map(f => `<span style="font-size:11px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:.1rem .5rem;color:var(--text3)">${f}</span>`).join('')}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.5rem;flex-shrink:0">
      <div style="font-size:11px;color:var(--text3);text-align:right">${b.api}<br>${b.plan}</div>
      ${isConnected
      ? `<button class="btn btn-outline btn-sm" style="color:var(--red);border-color:var(--red)" onclick="disconnectBroker('${b.id}')">Disconnect</button>`
      : `<button class="btn btn-primary btn-sm" onclick="connectBroker('${b.id}')" id="btn-${b.id}">${isConnecting ? 'Connecting…' : 'Connect'}</button>`
    }
    </div>
  </div>`;
}

function connectBroker(id) {
  const broker = BROKERS.find(b => b.id === id);
  if (!broker) return;
  brokerState[id] = 'connecting';
  const btn = document.getElementById(`btn-${id}`);
  if (btn) { btn.textContent = 'Opening…'; btn.disabled = true; }
  showToast(`🔐 Opening ${broker.name} login page…`, 'info');
  // In production: window.open(broker.authUrl + '?api_key=YOUR_KEY&redirect_uri=...', '_blank')
  // Simulating OAuth callback after 2 seconds
  setTimeout(() => {
    brokerState[id] = 'connected';
    renderBrokers();
    updateConnectedCount();
    showToast(`✅ ${broker.name} connected successfully!`, 'success');
  }, 2000);
}

function disconnectBroker(id) {
  const broker = BROKERS.find(b => b.id === id);
  if (!broker || !confirm(`Disconnect ${broker.name}? Running strategies will be paused.`)) return;
  delete brokerState[id];
  renderBrokers();
  updateConnectedCount();
  showToast(`${broker.name} disconnected.`, 'info');
}

function updateConnectedCount() {
  const el = document.getElementById('connectedCount');
  if (!el) return;
  const n = Object.values(brokerState).filter(s => s === 'connected').length;
  el.textContent = `${n} of 5 connected`;
  el.style.color = n > 0 ? 'var(--green)' : 'var(--text2)';
}

// ─── SAFETY NET ───────────────────────────
const safetyState = {
  killSwitch: { enabled: true, threshold: 2.0 },
  circuitBreaker: { enabled: true, max: 3 },
  capitalLock: { enabled: true, reserve: 15 },
  positionLimit: { enabled: true, maxStocks: 5, maxPerStock: 20 },
  timeGuard: { enabled: false, cutoff: '14:45' },
  newsGuard: { enabled: false },
};

function renderSafetyNet() {
  const root = document.getElementById('safety-net-root');
  const s = safetyState;
  const allActive = [s.killSwitch.enabled, s.circuitBreaker.enabled, s.capitalLock.enabled, s.positionLimit.enabled].every(Boolean);

  root.innerHTML = `
    <div class="page-header">
      <div class="container">
        <div class="back-btn" onclick="showPage('home')">← Back</div>
        <h1>Safety Net</h1>
        <p>Multi-layer risk controls that protect your capital automatically — even if you're away from the screen.</p>
      </div>
    </div>
    <div class="container">

      <!-- Master status -->
      <div style="background:${allActive ? 'var(--green-dim)' : 'var(--red-dim)'};border:1px solid ${allActive ? 'rgba(0,208,156,.25)' : 'rgba(232,84,84,.25)'};border-radius:var(--radius);padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem">
        <div style="display:flex;align-items:center;gap:.75rem">
          <span style="font-size:1.5rem">${allActive ? '🛡' : '⚠️'}</span>
          <div>
            <div style="font-weight:700;font-size:14px">${allActive ? 'All safety systems active' : 'Some safety systems disabled'}</div>
            <div style="font-size:12px;color:var(--text2);margin-top:.1rem">${allActive ? 'Your capital is fully protected' : 'Recommended: enable all protection layers'}</div>
          </div>
        </div>
        <button class="btn btn-${allActive ? 'outline' : 'primary'} btn-sm" onclick="toggleAllSafety(${!allActive})">${allActive ? 'Disable All' : 'Enable All'}</button>
      </div>

      <!-- Controls grid -->
      <div style="display:flex;flex-direction:column;gap:1rem">

        <!-- Kill Switch -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
            <div style="display:flex;align-items:center;gap:.75rem">
              <span style="font-size:1.5rem">🔴</span>
              <div>
                <div style="font-weight:700;font-size:14px">Kill Switch</div>
                <div style="font-size:12px;color:var(--text2)">Stops ALL strategies and squares off open positions if daily loss exceeds the limit</div>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" ${s.killSwitch.enabled ? 'checked' : ''} onchange="toggleSafety('killSwitch',this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div style="display:flex;align-items:center;gap:1rem">
            <span style="font-size:12px;color:var(--text2);white-space:nowrap">Trigger at daily loss of</span>
            <input type="range" class="risk-slider" min="0.5" max="5" step="0.5" value="${s.killSwitch.threshold}"
              oninput="updateSafety('killSwitch','threshold',+this.value); document.getElementById('ks-val').textContent=this.value+'%'" ${!s.killSwitch.enabled ? 'disabled' : ''}>
            <span id="ks-val" style="font-size:14px;font-weight:800;min-width:36px">${s.killSwitch.threshold}%</span>
          </div>
          <div class="sebi-inline" style="margin-top:.75rem">When triggered: all orders cancelled, open positions squared off at market price immediately.</div>
        </div>

        <!-- Circuit Breaker -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
            <div style="display:flex;align-items:center;gap:.75rem">
              <span style="font-size:1.5rem">⚡</span>
              <div>
                <div style="font-weight:700;font-size:14px">Circuit Breaker</div>
                <div style="font-size:12px;color:var(--text2)">Pauses trading after N consecutive losing trades to prevent loss spirals</div>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" ${s.circuitBreaker.enabled ? 'checked' : ''} onchange="toggleSafety('circuitBreaker',this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div style="display:flex;align-items:center;gap:1rem">
            <span style="font-size:12px;color:var(--text2);white-space:nowrap">Pause after</span>
            <input type="range" class="risk-slider" min="2" max="10" step="1" value="${s.circuitBreaker.max}"
              oninput="updateSafety('circuitBreaker','max',+this.value); document.getElementById('cb-val').textContent=this.value+' losses'" ${!s.circuitBreaker.enabled ? 'disabled' : ''}>
            <span id="cb-val" style="font-size:14px;font-weight:800;min-width:60px">${s.circuitBreaker.max} losses</span>
          </div>
          <div style="margin-top:.75rem;display:flex;align-items:center;gap:.75rem">
            <div style="font-size:12px;padding:.5rem 1rem;background:var(--green-dim);border:1px solid rgba(0,208,156,.2);border-radius:var(--radius-sm);color:var(--green);font-weight:700">Today: 0 / ${s.circuitBreaker.max} consecutive</div>
            <div style="font-size:12px;color:var(--text2)">Reset: midnight IST automatically</div>
          </div>
        </div>

        <!-- Capital Lock -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
            <div style="display:flex;align-items:center;gap:.75rem">
              <span style="font-size:1.5rem">🔒</span>
              <div>
                <div style="font-weight:700;font-size:14px">Capital Lock</div>
                <div style="font-size:12px;color:var(--text2)">Reserves a percentage of capital that strategies can never touch — your emergency buffer</div>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" ${s.capitalLock.enabled ? 'checked' : ''} onchange="toggleSafety('capitalLock',this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div style="display:flex;align-items:center;gap:1rem">
            <span style="font-size:12px;color:var(--text2);white-space:nowrap">Reserve</span>
            <input type="range" class="risk-slider" min="5" max="50" step="5" value="${s.capitalLock.reserve}"
              oninput="updateSafety('capitalLock','reserve',+this.value); document.getElementById('cl-val').textContent=this.value+'%'" ${!s.capitalLock.enabled ? 'disabled' : ''}>
            <span id="cl-val" style="font-size:14px;font-weight:800;min-width:40px">${s.capitalLock.reserve}%</span>
          </div>
          <div style="font-size:12px;color:var(--text2);margin-top:.75rem">On ₹1,50,000 deployed → <strong style="color:var(--green)">₹${(150000 * s.capitalLock.reserve / 100).toLocaleString('en-IN')} locked</strong>, ₹${(150000 * (100 - s.capitalLock.reserve) / 100).toLocaleString('en-IN')} tradeable</div>
        </div>

        <!-- Position Limits -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
            <div style="display:flex;align-items:center;gap:.75rem">
              <span style="font-size:1.5rem">📊</span>
              <div>
                <div style="font-weight:700;font-size:14px">Position Limits</div>
                <div style="font-size:12px;color:var(--text2)">Caps how many stocks you can hold and max exposure per stock</div>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" ${s.positionLimit.enabled ? 'checked' : ''} onchange="toggleSafety('positionLimit',this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
            <div>
              <div style="font-size:12px;color:var(--text2);margin-bottom:.5rem">Max stocks at once</div>
              <div style="display:flex;align-items:center;gap:.75rem">
                <input type="range" class="risk-slider" min="1" max="20" step="1" value="${s.positionLimit.maxStocks}"
                  oninput="updateSafety('positionLimit','maxStocks',+this.value); document.getElementById('pl-stocks').textContent=this.value" ${!s.positionLimit.enabled ? 'disabled' : ''}>
                <span id="pl-stocks" style="font-weight:800;font-size:14px;min-width:20px">${s.positionLimit.maxStocks}</span>
              </div>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text2);margin-bottom:.5rem">Max % per stock</div>
              <div style="display:flex;align-items:center;gap:.75rem">
                <input type="range" class="risk-slider" min="5" max="50" step="5" value="${s.positionLimit.maxPerStock}"
                  oninput="updateSafety('positionLimit','maxPerStock',+this.value); document.getElementById('pl-pct').textContent=this.value+'%'" ${!s.positionLimit.enabled ? 'disabled' : ''}>
                <span id="pl-pct" style="font-weight:800;font-size:14px;min-width:36px">${s.positionLimit.maxPerStock}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Time Guard -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:.75rem">
              <span style="font-size:1.5rem">⏰</span>
              <div>
                <div style="font-weight:700;font-size:14px">Time Guard <span style="font-size:10px;color:var(--text3);font-weight:400">Optional</span></div>
                <div style="font-size:12px;color:var(--text2)">Automatically square off all intraday positions before market close (e.g. 2:45 PM)</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:.75rem">
              <input type="time" value="${s.timeGuard.cutoff}" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:.3rem .6rem;border-radius:var(--radius-sm);font-size:13px;font-family:var(--font)" onchange="updateSafety('timeGuard','cutoff',this.value)" ${!s.timeGuard.enabled ? 'disabled' : ''}>
              <label class="toggle-switch">
                <input type="checkbox" ${s.timeGuard.enabled ? 'checked' : ''} onchange="toggleSafety('timeGuard',this.checked)">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- News Guard -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:.75rem">
              <span style="font-size:1.5rem">📰</span>
              <div>
                <div style="font-weight:700;font-size:14px">News Guard <span style="font-size:10px;color:var(--text3);font-weight:400">Optional · Beta</span></div>
                <div style="font-size:12px;color:var(--text2)">Pause trading automatically when very negative news is detected (linked to Market Weather)</div>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" ${s.newsGuard.enabled ? 'checked' : ''} onchange="toggleSafety('newsGuard',this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

      </div>

      <!-- Emergency Kill All -->
      <div style="margin-top:2rem;padding:1.5rem;background:var(--red-dim);border:1px solid rgba(232,84,84,.25);border-radius:var(--radius);text-align:center">
        <div style="font-weight:700;font-size:14px;margin-bottom:.35rem">Emergency Stop</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:1rem">Immediately halt ALL running strategies and square off all open positions. Use in emergencies only.</div>
        <button class="btn btn-red" onclick="emergencyStop()">🔴 Trigger Emergency Stop</button>
      </div>

      <div class="sebi-inline" style="margin-top:1.5rem">AlgoStreet's safety controls are a best-effort layer. They cannot guarantee against slippage, execution failures, or broker outages. Always monitor your own capital.</div>
    </div>`;
}

function toggleSafety(key, val) {
  safetyState[key].enabled = val;
  renderSafetyNet();
  showToast(val ? `✅ ${key} enabled` : `⚠️ ${key} disabled`, val ? 'success' : 'info');
}

function updateSafety(key, field, val) {
  safetyState[key][field] = val;
}

function toggleAllSafety(enable) {
  Object.keys(safetyState).forEach(k => safetyState[k].enabled = enable);
  renderSafetyNet();
  showToast(enable ? '✅ All safety systems enabled' : '⚠️ All safety systems disabled', enable ? 'success' : 'info');
}

function emergencyStop() {
  if (confirm('⚠️ EMERGENCY STOP: This will immediately cancel all orders and square off all positions. Are you sure?')) {
    showToast('🔴 Emergency stop triggered! All positions being squared off…', 'error');
    setTimeout(() => showToast('✅ All positions closed. Strategies paused.', 'success'), 2500);
  }
}

