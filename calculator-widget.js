/**
 * calculator-widget.js
 * 德州撲克勝率計算器 Web Component
 * 實作 UI 渲染、多語系、主題切換與 Web Worker 通訊
 */

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      --bg-color: #0f1115;
      --surface-color: #1a1d24;
      --surface-hover: #232730;
      --border-color: #2a2f3a;
      --text-main: #f8fafc;
      --text-sub: #9ca3af;
      --accent: #3b82f6;
      --win-color: #10b981;
      --tie-color: #f59e0b;
      --card-bg: #ffffff;
      --card-text: #000000;
      --card-red: #ef4444;
      --card-empty: #2a2f3a;
      
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    :host([theme="light"]) {
      --bg-color: #f1f5f9;
      --surface-color: #ffffff;
      --surface-hover: #f8fafc;
      --border-color: #e2e8f0;
      --text-main: #0f172a;
      --text-sub: #64748b;
      --card-empty: #e2e8f0;
    }

    .container {
      background: var(--bg-color);
      color: var(--text-main);
      border-radius: 12px;
      border: 1px solid var(--border-color);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.3);
      max-width: 900px;
      margin: 0 auto;
    }

    /* Header */
    .header {
      background: var(--surface-color);
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
    }
    .controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    select, button {
      background: var(--bg-color);
      color: var(--text-main);
      border: 1px solid var(--border-color);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
      cursor: pointer;
      outline: none;
    }
    select:hover, button:hover {
      border-color: var(--text-sub);
    }
    .btn-reset {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.2);
    }
    .btn-reset:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    /* Layout */
    .main-content {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 1px;
      background: var(--border-color);
    }
    @media (max-width: 768px) {
      .main-content { grid-template-columns: 1fr; }
    }
    
    .table-area, .picker-area {
      background: var(--bg-color);
      padding: 20px;
    }

    /* Board & Players */
    .section-title {
      font-size: 0.85rem;
      text-transform: uppercase;
      color: var(--text-sub);
      margin-bottom: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .board-container {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      background: var(--surface-color);
      padding: 16px;
      border-radius: 8px;
      justify-content: center;
    }
    .players-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .player-row {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: border-color 0.2s;
    }
    .player-row.active {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }
    .player-info {
      width: 80px;
      flex-shrink: 0;
    }
    .player-name {
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .player-cards {
      display: flex;
      gap: 6px;
    }

    /* Stats */
    .stats-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .stats-text {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .val-win { color: var(--win-color); }
    .val-tie { color: var(--tie-color); }
    .progress-bar {
      height: 6px;
      background: var(--card-empty);
      border-radius: 3px;
      display: flex;
      overflow: hidden;
    }
    .progress-win { background: var(--win-color); width: 0%; transition: width 0.3s ease; }
    .progress-tie { background: var(--tie-color); width: 0%; transition: width 0.3s ease; }

    /* Cards */
    .card-slot {
      width: 42px;
      height: 60px;
      background: var(--card-empty);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-weight: 700;
      font-size: 1.1rem;
      border: 2px solid transparent;
      user-select: none;
      transition: all 0.15s;
    }
    .card-slot:hover { border-color: var(--text-sub); }
    .card-slot.active-slot {
      border-color: var(--accent);
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
      100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
    }
    .card-filled {
      background: var(--card-bg);
      border-color: var(--border-color);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .card-filled.red { color: var(--card-red); }
    .card-filled.black { color: var(--card-text); }
    .card-suit { font-size: 1.2rem; line-height: 1; }
    .card-rank { line-height: 1; margin-top: 2px; }

    /* Picker Area */
    .picker-area {
      background: var(--surface-color);
      border-left: 1px solid var(--border-color);
    }
    .picker-status {
      font-size: 0.85rem;
      color: var(--accent);
      margin-bottom: 16px;
      font-weight: 500;
      min-height: 20px;
    }
    .picker-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
    @media (max-width: 768px) {
      .picker-grid { grid-template-columns: repeat(7, 1fr); }
    }
    .picker-btn {
      background: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 10px 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
      user-select: none;
    }
    .picker-btn:hover:not(.disabled) {
      background: var(--surface-hover);
      border-color: var(--text-sub);
    }
    .picker-btn.red { color: var(--card-red); }
    .picker-btn.disabled {
      opacity: 0.2;
      cursor: not-allowed;
      background: transparent;
    }
  </style>

  <div class="container">
    <div class="header">
      <div class="title" data-i18n="title">Texas Hold'em Calculator</div>
      <div class="controls">
        <select id="lang-select">
          <option value="en">English</option>
          <option value="zh-TW">繁體中文</option>
          <option value="ja">日本語</option>
          <option value="ko">한국어</option>
        </select>
        <button id="theme-btn">🌙</button>
        <button id="reset-btn" class="btn-reset" data-i18n="reset">Reset</button>
      </div>
    </div>

    <div class="main-content">
      <div class="table-area">
        <div class="section-title" data-i18n="board">Community Cards</div>
        <div class="board-container" id="board-container"></div>
        <div class="section-title" data-i18n="players">Players</div>
        <div class="players-container" id="players-container"></div>
      </div>

      <div class="picker-area">
        <div class="section-title" data-i18n="selectCard">Select Card</div>
        <div class="picker-status" id="picker-status">Please select a slot</div>
        <div class="picker-grid" id="picker-grid"></div>
      </div>
    </div>
  </div>
`;

// 多語系字典
const I18N = {
  'en': {
    title: "Texas Hold'em Calculator", board: "Community Cards", players: "Players",
    selectCard: "Select Card", reset: "Reset", win: "Win", tie: "Tie",
    statusSelect: "Pick a card for ", pName: "Player"
  },
  'zh-TW': {
    title: "德州撲克勝率計算器", board: "公牌區 (Board)", players: "玩家 (Players)",
    selectCard: "選擇撲克牌", reset: "重置牌局", win: "勝率", tie: "平手",
    statusSelect: "請選擇卡牌給 ", pName: "玩家"
  },
  'ja': {
    title: "テキサスホールデム計算機", board: "コミュニティカード", players: "プレイヤー",
    selectCard: "カードを選択", reset: "リセット", win: "勝率", tie: "チョップ",
    statusSelect: "カードを選択: ", pName: "プレイヤー"
  },
  'ko': {
    title: "텍사스 홀덤 계산기", board: "커뮤니티 카드", players: "플레이어",
    selectCard: "카드 선택", reset: "초기화", win: "승률", tie: "무승부",
    statusSelect: "카드 선택: ", pName: "플레이어"
  }
};

const SUITS = [
  { s: 's', icon: '♠', color: 'black' },
  { s: 'h', icon: '♥', color: 'red' },
  { s: 'd', icon: '♦', color: 'red' },
  { s: 'c', icon: '♣', color: 'black' }
];
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

class PokerOddsCalculator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    // 元件狀態
    this.lang = 'en';
    this.players = [[null, null], [null, null]];
    this.board = [null, null, null, null, null];
    this.activeSlot = { type: 'player', pIdx: 0, cIdx: 0 };
    this.worker = null;
    this.calculationId = 0;

    // DOM 綁定
    this.boardContainer = this.shadowRoot.getElementById('board-container');
    this.playersContainer = this.shadowRoot.getElementById('players-container');
    this.pickerGrid = this.shadowRoot.getElementById('picker-grid');
    this.pickerStatus = this.shadowRoot.getElementById('picker-status');
    this.langSelect = this.shadowRoot.getElementById('lang-select');
    this.themeBtn = this.shadowRoot.getElementById('theme-btn');
    this.resetBtn = this.shadowRoot.getElementById('reset-btn');
  }

  connectedCallback() {
    this.initLanguage();
    this.initTheme();
    this.initNames();
    this.initWorker();
    
    this.renderBoard();
    this.renderPlayers();
    this.renderPicker();
    this.updateActiveSlotUI();

    this.langSelect.addEventListener('change', (e) => this.setLanguage(e.target.value));
    this.themeBtn.addEventListener('click', () => this.toggleTheme());
    this.resetBtn.addEventListener('click', () => this.resetGame());
  }

  disconnectedCallback() {
    if (this.worker) this.worker.terminate();
  }

  initNames() {
    this.playerNames = [
      this.getAttribute('player1') || `${I18N[this.lang].pName} 1`,
      this.getAttribute('player2') || `${I18N[this.lang].pName} 2`
    ];
  }

  initLanguage() {
    const navLang = navigator.language;
    let defaultLang = 'en';
    if (navLang.includes('zh')) defaultLang = 'zh-TW';
    else if (navLang.includes('ja')) defaultLang = 'ja';
    else if (navLang.includes('ko')) defaultLang = 'ko';

    this.lang = localStorage.getItem('poker-lang') || defaultLang;
    this.langSelect.value = this.lang;
    this.updateI18n();
  }

  setLanguage(lang) {
    this.lang = lang;
    localStorage.setItem('poker-lang', lang);
    this.initNames();
    this.updateI18n();
    this.renderPlayers();
  }

  updateI18n() {
    const t = I18N[this.lang];
    this.shadowRoot.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) el.textContent = t[key];
    });
    this.updatePickerStatus();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('poker-theme') || this.getAttribute('theme') || 'dark';
    this.setTheme(savedTheme);
  }

  toggleTheme() {
    const isDark = this.getAttribute('theme') !== 'light';
    this.setTheme(isDark ? 'light' : 'dark');
  }

  setTheme(theme) {
    this.setAttribute('theme', theme);
    localStorage.setItem('poker-theme', theme);
    this.themeBtn.textContent = theme === 'light' ? '🌙' : '☀️';
  }

  initWorker() {
    try {
      this.worker = new Worker('./poker-engine.js');
      this.worker.addEventListener('message', (e) => {
        const { id, status, results } = e.data;
        if (status === 'success' && id === this.calculationId) {
          this.updateStatsUI(results);
        }
      });
    } catch (err) {
      console.warn('Worker instantiation failed:', err);
    }
  }

  // === UI 渲染 ===
  renderBoard() {
    this.boardContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const slot = this.createCardSlot(this.board[i], () => this.setActiveSlot('board', 0, i));
      slot.id = `board-slot-${i}`;
      this.boardContainer.appendChild(slot);
    }
  }

  renderPlayers() {
    const t = I18N[this.lang];
    this.playersContainer.innerHTML = '';
    
    this.players.forEach((playerHole, pIdx) => {
      const row = document.createElement('div');
      row.className = 'player-row';
      row.id = `player-row-${pIdx}`;

      const infoDiv = document.createElement('div');
      infoDiv.className = 'player-info';
      infoDiv.innerHTML = `<div class="player-name">${this.playerNames[pIdx]}</div>`;
      
      const cardsDiv = document.createElement('div');
      cardsDiv.className = 'player-cards';
      cardsDiv.appendChild(this.createCardSlot(playerHole[0], () => this.setActiveSlot('player', pIdx, 0), `p${pIdx}-c0`));
      cardsDiv.appendChild(this.createCardSlot(playerHole[1], () => this.setActiveSlot('player', pIdx, 1), `p${pIdx}-c1`));

      const statsDiv = document.createElement('div');
      statsDiv.className = 'stats-container';
      statsDiv.innerHTML = `
        <div class="stats-text">
          <span class="val-win" id="p${pIdx}-win">${t.win}: --%</span>
          <span class="val-tie" id="p${pIdx}-tie">${t.tie}: --%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-win" id="p${pIdx}-bar-win"></div>
          <div class="progress-tie" id="p${pIdx}-bar-tie"></div>
        </div>
      `;

      row.appendChild(infoDiv);
      row.appendChild(cardsDiv);
      row.appendChild(statsDiv);
      this.playersContainer.appendChild(row);
    });
  }

  createCardSlot(cardData, onClick, id = '') {
    const div = document.createElement('div');
    div.className = 'card-slot';
    if (id) div.id = id;
    
    if (cardData) {
      const suitObj = SUITS.find(s => s.s === cardData[1]);
      div.classList.add('card-filled', suitObj.color);
      div.innerHTML = `<span class="card-rank">${cardData[0]}</span><span class="card-suit">${suitObj.icon}</span>`;
      div.onclick = () => this.clearCard(onClick);
    } else {
      div.onclick = onClick;
    }
    return div;
  }

  renderPicker() {
    this.pickerGrid.innerHTML = '';
    const usedCards = new Set([...this.players.flat(), ...this.board].filter(Boolean));

    RANKS.forEach(rank => {
      SUITS.forEach(suit => {
        const cardStr = rank + suit.s;
        const btn = document.createElement('div');
        btn.className = `picker-btn ${suit.color}`;
        btn.innerHTML = `<span>${rank}</span><span>${suit.icon}</span>`;
        
        if (usedCards.has(cardStr)) {
          btn.classList.add('disabled');
        } else {
          btn.onclick = () => this.pickCard(cardStr);
        }
        this.pickerGrid.appendChild(btn);
      });
    });
  }

  // === 互動邏輯 ===
  setActiveSlot(type, pIdx, cIdx) {
    this.activeSlot = { type, pIdx, cIdx };
    this.updateActiveSlotUI();
  }

  clearCard(reActivateFunc) {
    if (this.activeSlot.type === 'player') {
      this.players[this.activeSlot.pIdx][this.activeSlot.cIdx] = null;
    } else {
      this.board[this.activeSlot.cIdx] = null;
    }
    this.triggerUpdate();
    reActivateFunc();
  }

  pickCard(cardStr) {
    if (!this.activeSlot) return;

    if (this.activeSlot.type === 'player') {
      this.players[this.activeSlot.pIdx][this.activeSlot.cIdx] = cardStr;
    } else {
      this.board[this.activeSlot.cIdx] = cardStr;
    }

    this.advanceSlot();
    this.triggerUpdate();
  }

  advanceSlot() {
    for (let p = 0; p < this.players.length; p++) {
      for (let c = 0; c < 2; c++) {
        if (!this.players[p][c]) {
          this.setActiveSlot('player', p, c);
          return;
        }
      }
    }
    for (let b = 0; b < 5; b++) {
      if (!this.board[b]) {
        this.setActiveSlot('board', 0, b);
        return;
      }
    }
    this.setActiveSlot(null, 0, 0);
  }

  updateActiveSlotUI() {
    this.shadowRoot.querySelectorAll('.card-slot').forEach(el => el.classList.remove('active-slot'));
    this.shadowRoot.querySelectorAll('.player-row').forEach(el => el.classList.remove('active'));

    if (!this.activeSlot || !this.activeSlot.type) {
      this.pickerStatus.textContent = '';
      return;
    }

    const { type, pIdx, cIdx } = this.activeSlot;
    let targetEl = null;

    if (type === 'player') {
      targetEl = this.shadowRoot.getElementById(`p${pIdx}-c${cIdx}`);
      this.shadowRoot.getElementById(`player-row-${pIdx}`).classList.add('active');
      this.pickerStatus.textContent = `${I18N[this.lang].statusSelect} ${this.playerNames[pIdx]}`;
    } else {
      targetEl = this.shadowRoot.getElementById(`board-slot-${cIdx}`);
      this.pickerStatus.textContent = `${I18N[this.lang].statusSelect} ${I18N[this.lang].board}`;
    }

    if (targetEl) targetEl.classList.add('active-slot');
  }

  updatePickerStatus() {
    if (!this.activeSlot || !this.activeSlot.type) {
      this.pickerStatus.textContent = '';
      return;
    }
    const { type, pIdx } = this.activeSlot;
    if (type === 'player') {
      this.pickerStatus.textContent = `${I18N[this.lang].statusSelect} ${this.playerNames[pIdx]}`;
    } else {
      this.pickerStatus.textContent = `${I18N[this.lang].statusSelect} ${I18N[this.lang].board}`;
    }
  }

  resetGame() {
    this.players = [[null, null], [null, null]];
    this.board = [null, null, null, null, null];
    this.setActiveSlot('player', 0, 0);
    this.resetStatsUI();
    this.triggerUpdate();
  }

  triggerUpdate() {
    this.renderBoard();
    this.renderPlayers();
    this.renderPicker();
    this.updateActiveSlotUI();

    const validPlayers = this.players.filter(h => h[0] !== null && h[1] !== null);
    if (validPlayers.length >= 2) {
      this.requestCalculation(validPlayers);
    } else {
      this.resetStatsUI();
    }
  }

  requestCalculation(validPlayers) {
    if (!this.worker) return;
    this.calculationId++;
    const validBoard = this.board.filter(Boolean);
    
    this.worker.postMessage({
      id: this.calculationId,
      players: validPlayers,
      board: validBoard
    });
  }

  // === 資料綁定 ===
  updateStatsUI(results) {
    const t = I18N[this.lang];
    let resIndex = 0;
    this.players.forEach((hole, pIdx) => {
      const winEl = this.shadowRoot.getElementById(`p${pIdx}-win`);
      const tieEl = this.shadowRoot.getElementById(`p${pIdx}-tie`);
      const barWin = this.shadowRoot.getElementById(`p${pIdx}-bar-win`);
      const barTie = this.shadowRoot.getElementById(`p${pIdx}-bar-tie`);

      if (hole[0] && hole[1] && results[resIndex]) {
        const r = results[resIndex];
        winEl.textContent = `${t.win}: ${r.win.toFixed(1)}%`;
        tieEl.textContent = `${t.tie}: ${r.tie.toFixed(1)}%`;
        barWin.style.width = `${r.win}%`;
        barTie.style.width = `${r.tie}%`;
        resIndex++;
      } else {
        winEl.textContent = `${t.win}: --%`;
        tieEl.textContent = `${t.tie}: --%`;
        barWin.style.width = `0%`;
        barTie.style.width = `0%`;
      }
    });
  }

  resetStatsUI() {
    const t = I18N[this.lang];
    this.players.forEach((_, pIdx) => {
      const winEl = this.shadowRoot.getElementById(`p${pIdx}-win`);
      const tieEl = this.shadowRoot.getElementById(`p${pIdx}-tie`);
      if (winEl) winEl.textContent = `${t.win}: --%`;
      if (tieEl) tieEl.textContent = `${t.tie}: --%`;
      const barWin = this.shadowRoot.getElementById(`p${pIdx}-bar-win`);
      const barTie = this.shadowRoot.getElementById(`p${pIdx}-bar-tie`);
      if (barWin) barWin.style.width = '0%';
      if (barTie) barTie.style.width = '0%';
    });
  }
}

customElements.define('poker-odds-calculator', PokerOddsCalculator);
