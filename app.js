/**
 * @fileoverview Puzzle Game — генератор и сборка пазлов из загруженных изображений
 * @author Senior Frontend Developer
 */

/* ==========================================================================
   Configuration
   ========================================================================== */

const CONFIG = {
  STORAGE_KEY: 'puzzle-history',
  MAX_HISTORY: 5,
  HISTORY_IMAGE_MAX_SIZE: 600,
  PIECE_GRID_OPTIONS: [
    { rows: 2, cols: 3 },
    { rows: 3, cols: 3 },
    { rows: 4, cols: 3 },
    { rows: 4, cols: 4 },
    { rows: 5, cols: 4 },
    { rows: 5, cols: 5 },
  ],
  SNAP_THRESHOLD: 20,
  VICTORY_DURATION_MS: 3000,
  CONFETTI_COUNT: 100,
  CONFETTI_DURATION_MS: 5000,
  ACCEPTED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/jpg'],
};

/* ==========================================================================
   DOM Selectors
   ========================================================================== */

const SELECTORS = {
  stepSetup: '#stepSetup',
  stepGame: '#stepGame',
  uploadZone: '#uploadZone',
  fileInput: '#fileInput',
  previewImage: '#previewImage',
  previewContainer: '#previewContainer',
  piecesCount: '#piecesCount',
  generateBtn: '#generateBtn',
  gameArea: '#gameArea',
  previewThumb: '#previewThumb',
  progressText: '#progressText',
  resetBtn: '#resetBtn',
  confettiContainer: '#confettiContainer',
  historyBlock: '#historyBlock',
  historyList: '#historyList',
  langSelect: '#langSelect',
  langFlag: '#langFlag',
};

/* ==========================================================================
   PuzzleGame
   ========================================================================== */

class PuzzleGame {
  constructor() {
    this.image = null;
    this.gridRows = 2;
    this.gridCols = 3;
    this.pieces = [];
    this.correctPositions = [];
    this.pieceDimensions = { widths: [], heights: [] };
    this.puzzleDimensions = { width: 0, height: 0 };
    this.dragState = {
      piece: null,
      offset: { x: 0, y: 0 },
    };
    this.victoryShown = false;
    this.elements = {};

    this.init();
  }

  init() {
    this.cacheElements();
    this.renderLangSelect();
    this.renderPiecesSelect();
    this.renderImageHistory();
    this.applyTranslations();
    this.bindEvents();
  }

  cacheElements() {
    this.elements = {
      stepSetup: document.querySelector(SELECTORS.stepSetup),
      stepGame: document.querySelector(SELECTORS.stepGame),
      uploadZone: document.querySelector(SELECTORS.uploadZone),
      fileInput: document.querySelector(SELECTORS.fileInput),
      previewImage: document.querySelector(SELECTORS.previewImage),
      previewContainer: document.querySelector(SELECTORS.previewContainer),
      piecesCount: document.querySelector(SELECTORS.piecesCount),
      generateBtn: document.querySelector(SELECTORS.generateBtn),
      gameArea: document.querySelector(SELECTORS.gameArea),
      previewThumb: document.getElementById('previewThumb'),
      progressText: document.querySelector(SELECTORS.progressText),
      resetBtn: document.querySelector(SELECTORS.resetBtn),
      confettiContainer: document.querySelector(SELECTORS.confettiContainer),
      historyBlock: document.querySelector(SELECTORS.historyBlock),
      historyList: document.querySelector(SELECTORS.historyList),
      langSelect: document.querySelector(SELECTORS.langSelect),
      langFlag: document.getElementById('langFlag'),
    };
  }

  renderLangSelect() {
    const select = this.elements.langSelect;
    const flagEl = this.elements.langFlag;
    if (!select) return;

    select.innerHTML = Object.entries(LOCALES)
      .map(([code, loc]) => `<option value="${code}">${loc.langName}</option>`)
      .join('');
    select.value = getLang();
    this.updateLangFlag();
  }

  updateLangFlag() {
    const flagEl = this.elements.langFlag;
    if (!flagEl) return;
    const code = getLang();
    const flagCode = LOCALES[code]?.flagCode || code;
    flagEl.className = `lang-selector__flag fi fi-${flagCode}`;
  }

  applyTranslations() {
    document.documentElement.lang = getLang();
    document.title = t('pageTitle');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t('pageDescription');

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.dataset.i18nAria;
      if (key) el.setAttribute('aria-label', t(key));
    });

    const fileInput = this.elements.fileInput;
    if (fileInput) fileInput.setAttribute('aria-label', t('selectImage'));

    const gameArea = this.elements.gameArea;
    if (gameArea) gameArea.setAttribute('aria-label', t('gameAreaLabel'));

    this.updateProgress();
  }

  renderPiecesSelect() {
    const select = this.elements.piecesCount;
    if (!select) return;

    select.innerHTML = CONFIG.PIECE_GRID_OPTIONS.map(
      (opt) => `<option value="${opt.rows},${opt.cols}">${opt.rows}×${opt.cols}</option>`
    ).join('');
  }

  bindEvents() {
    this.elements.uploadZone?.addEventListener('click', (e) => {
      if (e.target === this.elements.fileInput) return;
      e.preventDefault();
      this.elements.fileInput?.click();
    });
    this.elements.uploadZone?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.elements.fileInput?.click();
      }
    });
    this.elements.uploadZone?.addEventListener('dragover', this.handleDragOver.bind(this));
    this.elements.uploadZone?.addEventListener('drop', this.handleDrop.bind(this));
    this.elements.fileInput?.addEventListener('change', this.handleFileSelect.bind(this));
    this.elements.piecesCount?.addEventListener('change', this.handlePiecesCountChange.bind(this));
    this.elements.generateBtn?.addEventListener('click', () => this.startGame());
    this.elements.resetBtn?.addEventListener('click', () => this.reset());
    this.elements.langSelect?.addEventListener('change', (e) => {
      if (setLang(e.target.value)) {
        this.updateLangFlag();
        this.applyTranslations();
        this.renderImageHistory();
      }
    });

    document.addEventListener('mousemove', this.handleDrag.bind(this));
    document.addEventListener('mouseup', this.handleDragEnd.bind(this));
    document.addEventListener('touchmove', this.handleDrag.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleDragEnd.bind(this));
  }

  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file && this.isValidImageFile(file)) {
      this.loadImage(file);
    }
  }

  handleFileSelect(e) {
    const file = e.target?.files?.[0];
    if (file && this.isValidImageFile(file)) {
      this.loadImage(file);
    }
  }

  handlePiecesCountChange(e) {
    const [rows, cols] = (e.target.value || '3,3').split(',').map(Number);
    this.gridRows = rows;
    this.gridCols = cols;
  }

  isValidImageFile(file) {
    return CONFIG.ACCEPTED_IMAGE_TYPES.includes(file.type);
  }

  loadImage(file) {
    const reader = new FileReader();

    reader.onload = (event) => {
      this.loadImageFromDataUrl(event.target.result, file?.name);
    };

    reader.onerror = () => console.error('Failed to read file');
    reader.readAsDataURL(file);
  }

  loadImageFromDataUrl(dataUrl, altText = '') {
    const img = new Image();

    img.onload = () => {
      this.image = img;
      this.elements.previewImage.src = dataUrl;
      this.elements.previewImage.alt = altText;
      this.elements.previewContainer.hidden = false;
      this.elements.generateBtn.disabled = false;
      this.elements.generateBtn.focus();
    };

    img.onerror = () => {
      console.error('Failed to load image');
      this.elements.generateBtn.disabled = true;
    };

    img.src = dataUrl;
  }

  getImageHistory() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveImageToHistory(dataUrl) {
    try {
      let history = this.getImageHistory();
      history = history.filter((item) => item !== dataUrl);
      history.unshift(dataUrl);
      history = history.slice(0, CONFIG.MAX_HISTORY);
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save to history:', e);
    }
  }

  getResizedDataUrl(dataUrl, maxSize = CONFIG.HISTORY_IMAGE_MAX_SIZE) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        if (w <= maxSize && h <= maxSize) {
          resolve(dataUrl);
          return;
        }
        const scale = maxSize / Math.max(w, h);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  renderImageHistory() {
    const block = this.elements.historyBlock;
    const list = this.elements.historyList;
    if (!block || !list) return;

    const history = this.getImageHistory();
    if (history.length === 0) {
      block.hidden = true;
      return;
    }

    block.hidden = false;
    list.innerHTML = history
      .map(
        (dataUrl, i) =>
          `<button type="button" class="history-item" data-index="${i}" aria-label="${t('selectImageN', { n: i + 1 })}">
            <img src="${dataUrl}" alt="" class="history-item__img">
          </button>`
      )
      .join('');

    list.querySelectorAll('.history-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        const dataUrl = history[idx];
        if (dataUrl) this.loadImageFromDataUrl(dataUrl, t('savedN', { n: idx + 1 }));
      });
    });
  }

  async startGame() {
    if (!this.image) return;

    try {
      const dataUrl = this.image.src;
      if (dataUrl && dataUrl.startsWith('data:')) {
        const resized = await this.getResizedDataUrl(dataUrl);
        this.saveImageToHistory(resized);
      }
    } catch (e) {
      console.warn('History save failed:', e);
    }

    const [rows, cols] = (this.elements.piecesCount.value || '3,3').split(',').map(Number);
    this.gridRows = rows || 3;
    this.gridCols = cols || 3;
    this.victoryShown = false;

    this.showStep('game');
    this.calculatePuzzleDimensions();
    this.calculatePieceDimensions();
    this.createGameBoard();
    this.createPieces();
    this.updateProgress();
  }

  calculatePuzzleDimensions() {
    const { offsetWidth: w, offsetHeight: h } = this.elements.gameArea;
    const ratio = 0.5;
    const availableW = w * ratio;
    const availableH = h * ratio;
    const aspect = this.image.width / this.image.height;

    if (availableW / aspect <= availableH) {
      this.puzzleDimensions = { width: availableW, height: availableW / aspect };
    } else {
      this.puzzleDimensions = { width: availableH * aspect, height: availableH };
    }

    this.puzzleDimensions.width = Math.round(this.puzzleDimensions.width);
    this.puzzleDimensions.height = Math.round(this.puzzleDimensions.height);
  }

  calculatePieceDimensions() {
    const { width: pw, height: ph } = this.puzzleDimensions;
    const baseW = Math.floor(pw / this.gridCols);
    const baseH = Math.floor(ph / this.gridRows);

    this.pieceDimensions.widths = Array.from(
      { length: this.gridCols },
      (_, i) => (i === this.gridCols - 1 ? pw - baseW * (this.gridCols - 1) : baseW)
    );
    this.pieceDimensions.heights = Array.from(
      { length: this.gridRows },
      (_, i) => (i === this.gridRows - 1 ? ph - baseH * (this.gridRows - 1) : baseH)
    );
  }

  showStep(step) {
    this.elements.stepSetup.hidden = step !== 'setup';
    this.elements.stepGame.hidden = step !== 'game';
  }

  createGameBoard() {
    this.elements.gameArea.innerHTML = '';

    const frame = document.createElement('div');
    frame.className = 'game__assembly-frame';
    frame.setAttribute('aria-hidden', 'true');

    const { offsetWidth: gameW, offsetHeight: gameH } = this.elements.gameArea;
    const { width: pw, height: ph } = this.puzzleDimensions;
    const left = (gameW - pw) / 2;
    const top = (gameH - ph) / 2;

    Object.assign(frame.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${pw}px`,
      height: `${ph}px`,
    });

    this.elements.gameArea.appendChild(frame);

    const preview = this.elements.previewThumb;
    if (preview) {
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = this.image.src;
      img.alt = '';
      preview.appendChild(img);
    }
  }

  createPieces() {
    this.pieces = [];
    this.correctPositions = [];

    const { offsetWidth: gameW, offsetHeight: gameH } = this.elements.gameArea;
    const { width: pw, height: ph } = this.puzzleDimensions;
    const frameLeft = (gameW - pw) / 2;
    const frameTop = (gameH - ph) / 2;

    const srcCellW = this.image.width / this.gridCols;
    const srcCellH = this.image.height / this.gridRows;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.image.width;
    tempCanvas.height = this.image.height;
    tempCanvas.getContext('2d').drawImage(this.image, 0, 0);

    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const pieceW = this.pieceDimensions.widths[col];
        const pieceH = this.pieceDimensions.heights[row];
        const placementZones = this.getPlacementZones(
          frameLeft, frameTop, pw, ph, gameW, gameH, pieceW, pieceH
        );

        const srcX = Math.round(col * srcCellW);
        const srcY = Math.round(row * srcCellH);
        const srcW = col === this.gridCols - 1
          ? this.image.width - srcX
          : Math.round((col + 1) * srcCellW) - srcX;
        const srcH = row === this.gridRows - 1
          ? this.image.height - srcY
          : Math.round((row + 1) * srcCellH) - srcY;

        const pieceCanvas = this.createPieceCanvas(tempCanvas, srcX, srcY, Math.max(1, srcW), Math.max(1, srcH));
        const correctX = frameLeft + this.pieceDimensions.widths
          .slice(0, col)
          .reduce((a, b) => a + b, 0);
        const correctY = frameTop + this.pieceDimensions.heights
          .slice(0, row)
          .reduce((a, b) => a + b, 0);

        this.correctPositions.push({ x: Math.round(correctX), y: Math.round(correctY) });

        const { x: posX, y: posY } = this.getRandomPosition(
          placementZones, pieceW, pieceH, gameW, gameH, frameLeft, frameTop, pw, ph
        );

        const piece = this.createPieceElement(
          pieceCanvas,
          pieceW,
          pieceH,
          posX,
          posY,
          row,
          col
        );

        this.elements.gameArea.appendChild(piece);
        this.pieces.push(piece);
      }
    }
  }

  createPieceCanvas(sourceCanvas, srcX, srcY, srcW, srcH) {
    const canvas = document.createElement('canvas');
    canvas.width = srcW;
    canvas.height = srcH;
    canvas.getContext('2d').drawImage(sourceCanvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
    return canvas;
  }

  createPieceElement(canvas, width, height, x, y, row, col) {
    const piece = document.createElement('div');
    piece.className = 'puzzle-piece';
    piece.setAttribute('role', 'button');
    piece.setAttribute('tabindex', '0');
    piece.setAttribute('aria-label', t('pieceLabel', { n: row * this.gridCols + col + 1 }));

    Object.assign(piece.style, {
      width: `${width}px`,
      height: `${height}px`,
      left: `${x}px`,
      top: `${y}px`,
      backgroundImage: `url(${canvas.toDataURL()})`,
      backgroundSize: '100% 100%',
      backgroundPosition: '0 0',
    });

    piece.dataset.index = String(row * this.gridCols + col);

    piece.addEventListener('mousedown', (e) => this.handlePieceDragStart(e, piece));
    piece.addEventListener('touchstart', (e) => this.handlePieceDragStart(e, piece), { passive: false });
    piece.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handlePieceDragStart(e, piece);
      }
    });

    return piece;
  }

  getPlacementZones(frameLeft, frameTop, frameW, frameH, gameW, gameH, pieceW, pieceH) {
    const margin = 5;
    const zones = [];

    if (frameLeft >= pieceW + margin) {
      zones.push({ xMin: 0, xMax: frameLeft - pieceW - margin, yMin: 0, yMax: gameH - pieceH });
    }
    if (gameW - frameLeft - frameW >= pieceW + margin) {
      zones.push({
        xMin: frameLeft + frameW + margin,
        xMax: gameW - pieceW,
        yMin: 0,
        yMax: gameH - pieceH,
      });
    }
    if (frameTop >= pieceH + margin && frameW >= pieceW) {
      zones.push({
        xMin: frameLeft,
        xMax: frameLeft + frameW - pieceW,
        yMin: 0,
        yMax: frameTop - pieceH - margin,
      });
    }
    if (gameH - frameTop - frameH >= pieceH + margin && frameW >= pieceW) {
      zones.push({
        xMin: frameLeft,
        xMax: frameLeft + frameW - pieceW,
        yMin: frameTop + frameH + margin,
        yMax: gameH - pieceH,
      });
    }

    return zones;
  }

  getRandomPosition(zones, pieceW, pieceH, gameW, gameH, frameLeft, frameTop, frameW, frameH) {
    const margin = 5;
    const allZones = zones.length > 0 ? zones : [];

    if (allZones.length === 0) {
      if (frameLeft >= pieceW + margin) {
        allZones.push({ xMin: 0, xMax: frameLeft - pieceW - margin, yMin: 0, yMax: gameH - pieceH });
      }
      if (gameW - frameLeft - frameW >= pieceW + margin) {
        allZones.push({ xMin: frameLeft + frameW + margin, xMax: gameW - pieceW, yMin: 0, yMax: gameH - pieceH });
      }
      if (frameTop >= pieceH + margin) {
        allZones.push({ xMin: 0, xMax: gameW - pieceW, yMin: 0, yMax: frameTop - pieceH - margin });
      }
      if (gameH - frameTop - frameH >= pieceH + margin) {
        allZones.push({ xMin: 0, xMax: gameW - pieceW, yMin: frameTop + frameH + margin, yMax: gameH - pieceH });
      }
    }

    if (allZones.length === 0) {
      return { x: 0, y: 0 };
    }

    const zone = allZones[Math.floor(Math.random() * allZones.length)];
    const xRange = Math.max(0, zone.xMax - zone.xMin);
    const yRange = Math.max(0, zone.yMax - zone.yMin);

    return {
      x: zone.xMin + (xRange > 0 ? Math.random() * xRange : 0),
      y: zone.yMin + (yRange > 0 ? Math.random() * yRange : 0),
    };
  }

  handlePieceDragStart(e, piece) {
    if (piece.dataset.correct === 'true') return;
    e.preventDefault();

    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    const rect = piece.getBoundingClientRect();

    this.dragState = {
      piece,
      offset: { x: clientX - rect.left, y: clientY - rect.top },
    };

    piece.classList.add('is-dragging');
  }

  handleDrag(e) {
    if (!this.dragState.piece) return;

    e.preventDefault?.();

    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    const gameRect = this.elements.gameArea.getBoundingClientRect();
    const { piece, offset } = this.dragState;

    let x = clientX - gameRect.left - offset.x;
    let y = clientY - gameRect.top - offset.y;

    x = Math.max(0, Math.min(x, gameRect.width - piece.offsetWidth));
    y = Math.max(0, Math.min(y, gameRect.height - piece.offsetHeight));

    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
  }

  handleDragEnd() {
    const { piece } = this.dragState;
    if (!piece) return;

    piece.classList.remove('is-dragging');

    const index = parseInt(piece.dataset.index, 10);
    const { x: cx, y: cy } = this.correctPositions[index];
    const px = parseFloat(piece.style.left) || 0;
    const py = parseFloat(piece.style.top) || 0;
    const distance = Math.hypot(px - cx, py - cy);

    if (distance < CONFIG.SNAP_THRESHOLD) {
      piece.style.left = `${cx}px`;
      piece.style.top = `${cy}px`;
      piece.dataset.correct = 'true';
    }

    this.dragState.piece = null;
    this.updateProgress();
    this.checkVictory();
  }

  updateProgress() {
    const count = this.pieces.filter((p) => p.dataset.correct === 'true').length;
    const total = this.pieces.length;
    const el = this.elements.progressText;

    if (el) {
      el.textContent = t('progress', { count, total });
      el.setAttribute('aria-live', 'polite');
    }
  }

  checkVictory() {
    const allCorrect = this.pieces.every((p) => p.dataset.correct === 'true');
    if (allCorrect && !this.victoryShown) {
      this.victoryShown = true;
      this.showVictory();
    }
  }

  showVictory() {
    const overlay = document.createElement('div');
    overlay.className = 'victory';
    overlay.setAttribute('role', 'alert');
    overlay.textContent = t('victory');
    document.body.appendChild(overlay);

    this.startConfetti();

    setTimeout(() => overlay.remove(), CONFIG.VICTORY_DURATION_MS);
  }

  startConfetti() {
    const container = this.elements.confettiContainer;
    if (!container) return;

    for (let i = 0; i < CONFIG.CONFETTI_COUNT; i++) {
      const el = document.createElement('div');
      el.className = 'confetti__item';
      el.style.cssText = `
        left: ${Math.random() * 100}%;
        top: -10px;
        background: hsl(${Math.random() * 360}, 100%, 50%);
        transform: rotate(${Math.random() * 360}deg);
        animation: confetti-fall ${Math.random() * 3 + 2}s linear forwards;
      `;
      container.appendChild(el);
      setTimeout(() => el.remove(), CONFIG.CONFETTI_DURATION_MS);
    }

    if (!document.getElementById('confetti-styles')) {
      const style = document.createElement('style');
      style.id = 'confetti-styles';
      style.textContent = `
        @keyframes confetti-fall {
          to { transform: translateY(100vh) rotate(720deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  reset() {
    this.showStep('setup');
    this.victoryShown = false;
    this.elements.fileInput.value = '';
    this.elements.previewContainer.hidden = true;
    this.elements.generateBtn.disabled = true;
    this.renderImageHistory();
    this.applyTranslations();
  }
}

/* ==========================================================================
   Bootstrap
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  new PuzzleGame();
});
