/**
 * Numeracy Lab — Slide Presenter（自適應版）
 * 翻頁：←/→、空白、PageUp/Down、Home/End、點畫面左1/3 或右2/3、觸控左右滑。
 * 規劃模式（按 P）：投影片維持 16:9 置頂，規劃面板「往下展開」接在下方，往下捲才看完。
 *   面板內＝該頁對應的完整逐字原文（也就是上台念的稿）＋小設計條。
 *   原文存在每頁的 <aside class="plan-note">（永遠隱藏），由本檔複製進 #plan-panel。
 *   列印（出 PDF）時規劃層自動隱藏（見 base.css @media print）。
 * 總覽模式（按 O）：全部頁面縮圖格狀排列，點哪頁跳哪頁；Esc 或再按 O 關閉。
 * 安全線（按 g）：切換 .slide-frame 安全框紅虛線（驗收內容有無爆框）。
 * 動態開關（按 M）：一鍵關掉／打開所有進場動畫（在 <html> 加 .no-motion）。
 *   設定記在 localStorage，同一台電腦下次開任何一份簡報都沿用。
 *   若系統開了「減少動態效果」，預設就是關閉。
 */
(function () {
  const slides = Array.from(document.querySelectorAll('.slide'));
  if (!slides.length) return;
  const deck = document.querySelector('.deck');

  let current = 0;

  // Progress indicator
  const progress = document.createElement('div');
  progress.className = 'progress';
  document.body.appendChild(progress);

  // Mode hint（右上角小藥丸）
  const hint = document.createElement('div');
  hint.className = 'mode-hint';
  document.body.appendChild(hint);

  // 規劃面板（接在 .deck 之後，往下展開）
  const planPanel = document.createElement('div');
  planPanel.id = 'plan-panel';
  document.body.appendChild(planPanel);

  // 總覽層（按 O）
  const overview = document.createElement('div');
  overview.id = 'overview';
  overview.style.cssText = 'position:fixed;inset:0;background:rgba(0,75,36,.97);z-index:800;display:none;overflow-y:auto;padding:2vw;box-sizing:border-box;';
  document.body.appendChild(overview);

  function planOn() { return document.body.classList.contains('mode-plan'); }
  function overviewOn() { return overview.style.display !== 'none'; }

  // 動態開關（按 M）
  const MOTION_KEY = 'nl-deck-motion';
  function motionOff() { return document.documentElement.classList.contains('no-motion'); }
  function applyMotion(off) {
    document.documentElement.classList.toggle('no-motion', off);
    try { localStorage.setItem(MOTION_KEY, off ? 'off' : 'on'); } catch (e) {}
    updateHint();
  }
  function toggleMotion() { applyMotion(!motionOff()); }

  function updateHint() {
    hint.textContent = planOn()
      ? '規劃模式 · 按 P 收起'
      : '簡報模式 · P 規劃 · O 總覽 · g 安全線 · M 動態：' + (motionOff() ? '關' : '開') + ' · E 編輯';
  }

  function updatePlan() {
    const note = slides[current].querySelector('.plan-note');
    planPanel.innerHTML = note
      ? note.innerHTML
      : '<div class="plan-note__source"><b>對應原文</b>（此頁無規劃資料）</div>';
  }

  function show(index) {
    if (index < 0 || index >= slides.length) return;
    slides[current].classList.remove('active');
    current = index;
    slides[current].classList.add('active');
    syncLetterbox(slides[current]);
    progress.textContent = `${current + 1} / ${slides.length}`;
    window.location.hash = current + 1;
    updatePlan();
    if (planOn()) window.scrollTo(0, 0);   // 換頁時回到投影片頂端
  }

  // 全螢幕時 16:9 以外的上下（或左右）留白：跟著這一頁的底色（section 的 inline background），全幅／米白／深綠頁才不會露出白邊
  function syncLetterbox(slide) {
    if (slide && slide.classList.contains('probe-chapter')) { document.body.style.background = ''; document.documentElement.style.background = ''; return; }   // 章節頁：base.css 有左綠右米白的漸層規則
    var bleed = slide && slide.querySelector('img[data-bleed]');
    if (bleed) { applyBleed(slide, bleed); return; }
    var bg = (slide && slide.style && slide.style.background) || '';
    if (!bg) { try { bg = getComputedStyle(slide).backgroundColor; } catch (e) { bg = ''; } }
    if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') bg = '#FFFFFF';
    document.body.style.background = bg;
    document.documentElement.style.background = bg;
  }
  // 全幅圖（img[data-bleed]）：把同一張圖用同樣的縮放與位置鋪在 body 上，16:9 以外的上下留白就會是圖的延伸而不是一條色帶
  function applyBleed(slide, img) {
    var bg = (slide.style && slide.style.background) || '#FFFFFF';
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih) { document.body.style.background = bg; document.documentElement.style.background = bg; img.addEventListener('load', function () { if (slide.classList.contains('active')) applyBleed(slide, img); }, { once: true }); return; }
    var r = slide.getBoundingClientRect();
    var pos = (img.getAttribute('data-bleed') || '50 50').split(/[\s,]+/); var cx = parseFloat(pos[0]) / 100, cy = parseFloat(pos[1] || pos[0]) / 100;
    var s = Math.max(r.width / iw, r.height / ih), w = iw * s, h = ih * s;
    var ox = r.left + (r.width - w) * cx, oy = r.top + (r.height - h) * cy;
    var src = img.getAttribute('src');
    document.body.style.background = bg + ' url("' + src + '") no-repeat ' + ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px / ' + w.toFixed(1) + 'px ' + h.toFixed(1) + 'px';
    document.documentElement.style.background = bg;
  }
  window.addEventListener('resize', function () { var a = document.querySelector('.deck > .slide.active'); if (a) syncLetterbox(a); });
  function next() { show(current + 1); }
  function prev() { show(current - 1); }

  function togglePlan() {
    const on = !planOn();
    document.body.classList.toggle('mode-plan', on);
    document.documentElement.classList.toggle('mode-plan', on);
    updateHint();
    window.scrollTo(0, 0);
  }

  // --- 總覽：每次開啟時 clone 所有 slide 成縮圖（靜態快照），點擊跳頁 ---
  // 自適應版要點：.slide 用 container-query 單位（cqw），縮圖必須先把 clone 放進一個
  // 「100vw 寬、16:9」的 stage（讓 1cqw 重新等於 1vw，比例與真實舞台一致），再用
  // transform:scale() 把整個 stage 縮到 cell 大小。clone 不加 .active（避免觸發
  // body:has() 底色延伸 / 影響真實頁），改用 inline opacity:1 顯示。
  const OV_COLS = 4;
  const STAGE_W = 100;                       // vw：縮圖內部參考舞台寬（= 16:9 螢幕的舞台寬）
  function buildOverview() {
    overview.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${OV_COLS},1fr);gap:1.2vw;`;
    slides.forEach((s, i) => {
      const cellW = 100 / OV_COLS - 1.5;     // vw
      const cellH = cellW * 9 / 16;
      const factor = cellW / STAGE_W;
      const cell = document.createElement('div');
      cell.style.cssText = `position:relative;width:${cellW}vw;height:${cellH}vw;overflow:hidden;border-radius:.4vw;cursor:pointer;outline:${i === current ? '.25vw solid #E8FF3A' : '1px solid rgba(255,255,255,.25)'};background:#fff;`;
      const stage = document.createElement('div');
      stage.style.cssText = `position:absolute;top:0;left:0;width:${STAGE_W}vw;aspect-ratio:16/9;background:#fff;overflow:hidden;container-type:inline-size;transform:scale(${factor});transform-origin:top left;`;
      const clone = s.cloneNode(true);
      clone.classList.remove('active');   // 縮圖不可帶 active，否則觸發 body:has() 底色延伸、卡住整頁底色
      clone.style.cssText += ';opacity:1;pointer-events:none;transition:none;';
      stage.appendChild(clone);
      const tag = document.createElement('div');
      tag.textContent = i + 1;
      tag.style.cssText = 'position:absolute;right:.4vw;bottom:.3vw;z-index:5;font:700 .9vw "Noto Sans TC",sans-serif;color:#fff;background:rgba(0,75,36,.85);border-radius:.3vw;padding:.05vw .45vw;';
      cell.appendChild(stage);
      cell.appendChild(tag);
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleOverview(false);
        show(i);
      });
      grid.appendChild(cell);
    });
    overview.appendChild(grid);
  }
  function toggleOverview(force) {
    const on = force !== undefined ? force : !overviewOn();
    if (on) buildOverview();
    overview.style.display = on ? 'block' : 'none';
  }

  // Keyboard
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overviewOn()) { e.preventDefault(); toggleOverview(false); return; }
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prev();
    } else if (e.key === 'Home') {
      e.preventDefault();
      show(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      show(slides.length - 1);
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      togglePlan();
    } else if (e.key === 'o' || e.key === 'O') {
      e.preventDefault();
      toggleOverview();
    } else if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      if (deck) deck.classList.toggle('safe-guides');   // 切換內容安全區輔助線
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleMotion();                                   // 切換進場動畫
    }
  });

  // Click 翻頁（左 1/3 上一頁、右 2/3 下一頁）。規劃/總覽模式停用點擊翻頁。
  document.addEventListener('click', function (e) {
    if (planOn() || overviewOn()) return;
    if (e.target.closest('a, button, input, textarea, #plan-panel, .plan-note')) return;
    if (e.clientX < window.innerWidth / 3) { prev(); } else { next(); }
  });

  // Touch swipe（規劃/總覽模式停用，讓使用者正常上下捲）
  let touchStartX = 0;
  document.addEventListener('touchstart', function (e) {
    touchStartX = e.changedTouches[0].clientX;
  });
  document.addEventListener('touchend', function (e) {
    if (planOn() || overviewOn()) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
  });

  // Init: 動態開關（記住的設定 > 系統「減少動態效果」偏好）
  let motionStored = null;
  try { motionStored = localStorage.getItem(MOTION_KEY); } catch (e) {}
  const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.toggle('no-motion', motionStored ? motionStored === 'off' : !!prefersReduce);

  // Init: check hash or start at slide 1
  const hash = parseInt(window.location.hash.slice(1), 10);
  show(hash > 0 && hash <= slides.length ? hash - 1 : 0);
  updatePlan();
  updateHint();
})();

/* ── 2026-09-13 升級（本 deck 專用）───────────────────────────────────────
 * 1. 右上角模式藥丸：開場 10 秒後自動淡出；按任何鍵會再顯示 3 秒；按鍵功能不受影響。
 * 2. 編輯模式（按 E）：頁面上所有文字點一下就能改；SVG 圖裡的字點一下會跳出小輸入框（Enter 確定）。
 *    改完自動重排：整塊文字刪掉 → 那個方塊收起來、色塊跟著縮、卡片列重新分配寬度，空出來的位置給圖／圖表（flex:1）；
 *    並標記「剩多少」：data-grow 元素依字數標 data-tier=s/m/l，卡片列標可見張數 data-n，版型 CSS 據此放大字級與內距（補回）。
 * 3. 自動進場動態（依功能）：骨架不動（標題、軸線、標籤、有框方塊、頁尾一開始就在），只動承載論點的東西——長條長出、折線畫出、圓點彈出、數字跑上去、卡片依序浮上、表格逐列、帶子最後淡上。
 *    任何元素可寫 data-anim="up|fade|pop|drop|slam|left|right|stamp|bar|bar-v|draw|draw-rev|in-y|count|rows|none" 指定；data-seq="1,2,3" 定順序；section data-anim="none" 整頁關；按 M 全域關。
 *    按一下揭曉：標了 data-reveal 的元素進頁時藏著，按 →（或點右邊）一次演出來，再按才翻頁；右下角頁碼旁的小點＝這頁還有一段。
 *    - 自動存在這台電腦的瀏覽器（localStorage），翻頁、重開都在。
 *    - 「儲存」＝下載 edits.json，放進 html/ 之後，build.py 重建時會嵌進簡報，換電腦也在。
 *    - 「下載整份 HTML」＝把目前畫面（含修改）另存成一份獨立檔。
 */
(function () {
  var hint = document.querySelector('.mode-hint');
  var hideTimer = null;
  function showHint(ms) {
    if (!hint) return;
    hint.classList.remove('mode-hint--hide');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { hint.classList.add('mode-hint--hide'); }, ms);
  }
  showHint(5000);
  document.addEventListener('keydown', function () { showHint(3000); });

  // ── 編輯模式 ──
  var STORE = 'deck-edits:' + location.pathname;
  var edits = {};
  var embRev = 0, embExtra = {};
  try { var emb = document.getElementById('deck-edits'); if (emb) { var ej = JSON.parse(emb.textContent || '{}'); edits = ej.edits || {}; embRev = parseInt(ej.rev, 10) || 0; Object.keys(ej).forEach(function (k) { if (['deck', 'saved', 'rev', 'edits'].indexOf(k) < 0) embExtra[k] = ej[k]; }); } } catch (e) {}   // 其他欄位（build 寫的鏡射清單等）存檔時原樣保留
  try { var loc = JSON.parse(localStorage.getItem(STORE) || '{}'); if ((parseInt(loc.__rev, 10) || 0) === embRev) Object.keys(loc).forEach(function (k) { if (k !== '__rev') edits[k] = loc[k]; }); else localStorage.removeItem(STORE); } catch (e) {}   // 檔案的 rev 變了＝頁面結構重做過，本機舊快取作廢

  function cleanHTML(s) {
    return String(s).replace(/\s+(?:data-eid|contenteditable|spellcheck)="[^"]*"/g, '')
      .replace(/\sclass="([^"]*)"/g, function (m, c) { var v = c.split(/\s+/).filter(function (x) { return x && ['is-editable','is-editable-svg','is-cleared','is-pending'].indexOf(x) < 0 && x.indexOf('anim-') !== 0; }).join(' '); return v ? ' class="' + v + '"' : ''; });
  }
  Object.keys(edits).forEach(function (k) { if (typeof edits[k] === 'string') edits[k] = cleanHTML(edits[k]); });
  function isBlank(s) { return /^(?:\s|<br\s*\/?>|&nbsp;)*$/i.test(String(s)); }
  var slides = Array.from(document.querySelectorAll('.deck > .slide'));
  var targets = [];
  setTimeout(function () { var a0 = document.querySelector('.deck > .slide.active'); if (a0 && typeof syncLetterbox === 'function') syncLetterbox(a0); }, 0);
  var svgTargets = [];
  var pristine = {};   // eid → build 出來的原始內容；儲存時寫回原始 DOM，修改只留在 deck-edits，重開時 eid 才不會位移
  slides.forEach(function (slide, si) {
    var k = 0;
    slide.querySelectorAll('*').forEach(function (el) {
      if (el.closest('svg') || el.closest('.plan-note') || el.hasAttribute('data-key')) return;
      if (el.classList.contains('page-label__num')) return;
      var hasText = Array.from(el.childNodes).some(function (n) { return n.nodeType === 3 && n.textContent.trim(); });
      if (!hasText) return;
      var id = (si + 1) + ':' + (k++);
      el.setAttribute('data-eid', id);
      targets.push(el);
      pristine[id] = el.innerHTML;
      if (edits[id] !== undefined) { el.innerHTML = edits[id]; el.classList.toggle('is-cleared', isBlank(edits[id])); }
    });
    // SVG 圖裡的字：<text>（沒有 tspan 的）與每個 <tspan> 各自一個目標，編號 "頁:sN"
    var j = 0;
    slide.querySelectorAll('svg text, svg tspan').forEach(function (el) {
      if (el.closest('.plan-note') || el.closest('symbol') || el.closest('defs')) return;
      if (el.tagName.toLowerCase() === 'text' && el.querySelector('tspan')) return;
      if (!el.textContent.trim()) return;
      var sid = (si + 1) + ':s' + (j++);
      el.setAttribute('data-eid', sid);
      svgTargets.push(el);
      pristine[sid] = el.textContent;
      if (edits[sid] !== undefined) { el.textContent = edits[sid]; el.classList.toggle('is-cleared', isBlank(edits[sid])); }
    });
  });


  // ── 自動重排（老師 2026-09-13 的規則）：文字方塊被整個刪掉 → 方塊拿掉、色塊縮小、剩下的空間給圖／圖表 ──
  function visibleText(el) {
    var s = '';
    Array.from(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) s += n.textContent;
      else if (n.nodeType === 1 && !n.classList.contains('is-cleared')) s += visibleText(n);
    });
    return s;
  }
  function specifiedCols(el) {
    // 從樣式表找出這個網格「寫的」欄寬（例如 "1fr auto 1fr"、"repeat(3,1fr)"），展開成 token；第一次算完記在 data-cols-orig
    if (el.hasAttribute('data-cols-orig')) { try { return JSON.parse(el.getAttribute('data-cols-orig')); } catch (e) {} }
    var val = el.hasAttribute('data-cols-auto') ? '' : (el.style.gridTemplateColumns || '');
    if (!val) {
      try {
        Array.from(document.styleSheets).forEach(function (ss) {
          var rules; try { rules = ss.cssRules; } catch (e) { return; }
          Array.from(rules || []).forEach(function (r) {
            if (r.style && r.style.gridTemplateColumns && r.selectorText && el.matches(r.selectorText)) val = r.style.gridTemplateColumns;
          });
        });
      } catch (e) {}
    }
    if (!val) return null;
    val = val.replace(/repeat\((\d+)\s*,\s*([^)]+)\)/g, function (m, n, x) { return Array(parseInt(n, 10) + 1).join(x.trim() + ' '); });
    var toks = val.trim().split(/\s+/).filter(Boolean);
    if (toks.length) el.setAttribute('data-cols-orig', JSON.stringify(toks));
    return toks.length ? toks : null;
  }
  function reflow(slide) {
    var frame = slide.querySelector('.slide-frame') || slide;
    // (a) 由下往上：所有字都被清掉、又沒有圖的容器，一起收起來（只處理因為清字才變空的）
    Array.from(frame.querySelectorAll('*')).reverse().forEach(function (el) {
      if (el.closest('svg') || el.closest('.plan-note') || el.matches('.slide-frame,.page-label,.brand-footer')) return;
      if (el.classList.contains('is-cleared') && !el.hasAttribute('data-auto-cleared')) return;
      var hasCleared = !!el.querySelector('.is-cleared');
      var hasMedia = !!el.querySelector('img,svg,video,canvas');
      var empty = hasCleared && !hasMedia && !visibleText(el).trim();
      if (empty) { el.classList.add('is-cleared'); el.setAttribute('data-auto-cleared', '1'); }
      else if (el.hasAttribute('data-auto-cleared')) { el.classList.remove('is-cleared'); el.removeAttribute('data-auto-cleared'); }
    });
    // (c) 補回：字刪少了、卡片變少了，版型要能把剩下的放大——這裡只「量」，放大的樣式由版型 CSS 針對 data-tier／data-n 定義
    //     data-grow 的元素：依可見文字字數標 data-tier="s|m|l"（≤30／≤90／更多）
    frame.querySelectorAll('[data-grow]').forEach(function (el) {
      var n = visibleText(el).replace(/\s+/g, '').length;
      el.setAttribute('data-tier', n <= 45 ? 's' : (n <= 100 ? 'm' : 'l'));
    });
    //     卡片列（grid／flex 的容器，原本 ≥2 個子項）：標可見子項數 data-n
    Array.from(frame.querySelectorAll('*')).forEach(function (g) {
      if (g.closest('svg')) return;
      var d = getComputedStyle(g).display; if (d !== 'grid' && d !== 'flex') return;
      var kids = Array.from(g.children); if (kids.length < 2) return;
      var vis = kids.filter(function (k) { return !k.classList.contains('is-cleared'); }).length;
      g.setAttribute('data-n', vis);
    });
    // (b) 網格（卡片排成一列）：有卡片收起來時，把它的欄位拿掉，剩下的卡片分掉寬度
    Array.from(frame.querySelectorAll('*')).forEach(function (g) {
      if (g.closest('svg') || getComputedStyle(g).display !== 'grid') return;
      var kids = Array.from(g.children); if (kids.length < 2) return;
      var toks = specifiedCols(g); if (!toks || toks.length !== kids.length) return;
      var keep = toks.filter(function (tk, i) { return !kids[i].classList.contains('is-cleared'); });
      if (keep.length === kids.length) { if (g.hasAttribute('data-cols-auto')) { g.style.gridTemplateColumns = ''; g.removeAttribute('data-cols-auto'); } }
      else { g.style.gridTemplateColumns = keep.join(' '); g.setAttribute('data-cols-auto', '1'); }
    });
  }
  var reflowTimers = new Map();   // 每頁各自 debounce，連續改不同頁不會漏掉
  function scheduleReflow(slide) { if (!slide) return; clearTimeout(reflowTimers.get(slide)); reflowTimers.set(slide, setTimeout(function () { reflow(slide); }, 120)); }

  // ── 自動進場動態 v2（依功能給動畫）──────────────────────────────────────
  //  作者可在任何元素寫 data-anim="up|fade|pop|drop|slam|left|right|stamp|bar|bar-v|draw|count|rows|stagger|none"，
  //  沒寫的由結構判斷：標題浮上 → 圖表（長條長出來、折線畫出來、圓點彈出、數字跑上去）→ 卡片依序浮上 → 帶子最後進來。
  //  <section data-anim="none"> 整頁關；按 M 全域關。
  var ANIM_CLASSES = ['anim-up','anim-fade','anim-pop','anim-drop','anim-slam','anim-left','anim-right','anim-stamp','anim-bar','anim-bar-v','anim-draw','anim-draw-rev','anim-in-y','anim-stagger','anim-rows','anim-count'];
  var SEQ_GAP = 0.38;   // data-seq 每一步相隔幾秒
  function tagged(el) { return el.hasAttribute('data-anim') || ANIM_CLASSES.some(function (c) { return el.classList.contains(c); }); }
  function setAnim(el, kind, delay, dur, force) {
    if (!kind || kind === 'none') return;
    if (!force && el.closest && el.closest('[data-reveal]')) {   // 按一下才揭曉：先記下計畫、藏起來
      el.setAttribute('data-anim-plan', kind + '|' + (delay == null ? 0 : delay) + '|' + (dur == null ? '' : dur));
      el.classList.add('is-pending');
      return;
    }
    if (kind === 'count') { el.classList.add('anim-count'); el.setAttribute('data-count', '1'); return; }
    if (kind === 'rows') { var tb = el.tagName === 'TABLE' ? (el.tBodies[0] || el) : el; tb.classList.add('anim-rows'); return; }
    if (kind === 'draw' || kind === 'draw-rev') {
      try { var len = el.getTotalLength ? el.getTotalLength() : 0; if (len) el.style.setProperty('--anim-draw-len', Math.ceil(len)); } catch (e) {}
    }
    el.classList.add('anim-' + kind);
    if (delay != null) el.style.setProperty('--anim-delay', Math.min(delay, 1.8).toFixed(2) + 's');   // 最晚 1.8 秒全部到齊
    if (dur != null) el.style.setProperty('--anim-dur', dur + 's');
  }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  // SVG 圖表：作者沒標的元素用形狀猜——長條／直條／折線／圓點／文字
  function svgRole(el) {
    // 只動「承載論點」的元素：長條、直條、折線／連線、圓點、填色形狀；骨架（底色大塊、有框方塊、軸線、文字）留在原位
    var tag = el.tagName.toLowerCase();
    var cs = getComputedStyle(el), fill = cs.fill, stroke = cs.stroke;
    var hasFill = fill && fill !== 'none' && fill !== 'rgba(0, 0, 0, 0)', hasStroke = stroke && stroke !== 'none' && stroke !== 'rgba(0, 0, 0, 0)';
    var dashed = el.hasAttribute('stroke-dasharray') || (cs.strokeDasharray && cs.strokeDasharray !== 'none');
    if (tag === 'rect') {
      var w = num(el.getAttribute('width')), h = num(el.getAttribute('height'));
      var boxed = (el.getAttribute('stroke') && el.getAttribute('stroke') !== 'none') || (el.hasAttribute('rx') && h > 28 && w > 140);
      if (boxed) return null;
      if (el.hasAttribute('rx') && num(el.getAttribute('rx')) >= h / 2 - 0.5) return null;   // 藥丸型標籤
      if (h > w && w <= 320) return 'bar-v';
      if (w > h * 1.5 && h <= 80) return 'bar';
      return null;
    }
    if (tag === 'circle' || tag === 'ellipse') {
      var r = num(el.getAttribute('r')) || Math.max(num(el.getAttribute('rx')), num(el.getAttribute('ry')));
      var vb = (el.ownerSVGElement && el.ownerSVGElement.viewBox && el.ownerSVGElement.viewBox.baseVal) || null;
      if (vb && vb.width && r * r * 3.14 > 0.2 * vb.width * vb.height) return null;   // 大底圓＝骨架
      return 'pop';
    }
    if (tag === 'polygon') return hasFill ? 'pop' : null;
    if (tag === 'polyline') return dashed ? null : 'draw';
    if (tag === 'line') return null;                      // 軸線、連接線＝骨架
    if (tag === 'path') {
      if (hasFill) return 'pop';                         // 填色形狀（圓餅塊）
      if (hasStroke) return dashed ? null : 'draw';      // 折線、連線
      return null;
    }
    return null;                                         // text／image／use：骨架
  }
  function markBarGroups(svg) {
    // 同一條基準線上、高度不同的幾根 rect ＝ 直條圖；同一左緣、寬度不同的 ＝ 橫條圖（比只看長寬比準）
    var rects = Array.from(svg.querySelectorAll('rect')).filter(function (r) { return !r.hasAttribute('data-anim') && !r.closest('defs,symbol,clipPath,mask'); });
    var byBottom = {}, byLeft = {};
    rects.forEach(function (r) {
      var x = num(r.getAttribute('x')), y = num(r.getAttribute('y')), w = num(r.getAttribute('width')), h = num(r.getAttribute('height'));
      if (!w || !h) return;
      var kb = Math.round((y + h) / 4), kl = Math.round(x / 4);
      (byBottom[kb] = byBottom[kb] || []).push([r, w, h]); (byLeft[kl] = byLeft[kl] || []).push([r, w, h]);
    });
    rects.forEach(function (a) { rects.forEach(function (b) { if (a === b) return;
      var ax = num(a.getAttribute('x')), aw = num(a.getAttribute('width')), ay = num(a.getAttribute('y')), ah = num(a.getAttribute('height'));
      var bx = num(b.getAttribute('x')), bw = num(b.getAttribute('width')), by = num(b.getAttribute('y')), bh = num(b.getAttribute('height'));
      if (Math.abs(ax - bx) < 1 && Math.abs(aw - bw) < 1 && Math.abs(ay + ah - by) < 2 && aw <= 320) { a.setAttribute('data-anim-auto', 'bar-v'); b.setAttribute('data-anim-auto', 'bar-v'); }
    }); });
    Object.keys(byBottom).forEach(function (k) { var g = byBottom[k]; if (g.length >= 2 && new Set(g.map(function (p) { return Math.round(p[2]); })).size >= 2 && g.every(function (p) { return p[1] <= 320; })) g.forEach(function (p) { p[0].setAttribute('data-anim-auto', 'bar-v'); }); });
    Object.keys(byLeft).forEach(function (k) { var g = byLeft[k]; if (g.length >= 2 && new Set(g.map(function (p) { return Math.round(p[1]); })).size >= 2 && g.every(function (p) { return p[2] <= 80 && !p[0].hasAttribute('data-anim-auto'); })) g.forEach(function (p) { p[0].setAttribute('data-anim-auto', 'bar'); }); });
  }
  function seqOf(el) {
    var s = el.closest('[data-seq]'); if (!s) return null;
    var v = parseFloat(s.getAttribute('data-seq')); return isNaN(v) ? null : v;
  }
  function kindOf(el) {
    if (el.hasAttribute('data-anim')) return el.getAttribute('data-anim');
    var g = el.closest('[data-anim]'); if (g && g !== el && g.tagName.toLowerCase() !== 'svg' && g.closest('svg')) return g.getAttribute('data-anim');
    var k = el.getAttribute('data-anim-auto') || svgRole(el);
    if (!k && (seqOf(el) != null || el.closest('[data-reveal]'))) k = 'fade';   // 在步驟群組／揭曉群組裡的骨架元素跟著群組一起出
    return k;
  }
  function bboxOf(el) { try { return el.getBBox(); } catch (e) { return null; } }
  function textAnchorPoint(el) {
    var x = num(el.getAttribute('x')), y = num(el.getAttribute('y'));
    var m = (el.getAttribute('transform') || '').match(/translate\(\s*([-\d.]+)[ ,]+([-\d.]+)/); if (m) { x += num(m[1]); y += num(m[2]); }
    var b = bboxOf(el); if (b) { y = b.y + b.height / 2; x = b.x + b.width / 2; }
    return [x, y];
  }
  function animSvg(svg, base) {
    // 順序：作者標的 data-seq（同一步一起出現）＞ 沒標的：形狀先、字跟著它所在的形狀
    markBarGroups(svg);
    var els = Array.from(svg.querySelectorAll('rect,circle,ellipse,line,polyline,polygon,path,text,image,use')).filter(function (el) {
      return !el.closest('defs,symbol,clipPath,mask') && !el.closest('[data-anim="none"]');
    });
    if (!els.length) return base;
    var hasSeq = !!svg.querySelector('[data-seq]');
    var items = els.map(function (el) { return { el: el, kind: kindOf(el), seq: seqOf(el), tag: el.tagName.toLowerCase() }; }).filter(function (it) { return it.kind && it.kind !== 'none'; });
    var shapes = items.filter(function (it) { return it.tag !== 'text'; }), texts = items.filter(function (it) { return it.tag === 'text'; });
    var end = base;
    if (hasSeq) {
      // 沒標的＝底圖（座標、軸線、底色），先出；標了的依步驟；同一步裡依 DOM 順序小小錯開
      var groups = {};
      items.forEach(function (it) { var k = it.seq == null ? 0 : it.seq; (groups[k] = groups[k] || []).push(it); });
      Object.keys(groups).map(Number).sort(function (a, b) { return a - b; }).forEach(function (k) {
        var g = groups[k], d0 = base + (k === 0 ? 0 : 0.15 + (k - 1) * SEQ_GAP), step = Math.min(0.1, 0.25 / g.length), d = d0;
        g.forEach(function (it) { setAnim(it.el, it.kind, d, it.kind.indexOf('draw') === 0 ? 0.8 : null); d += step; });
        end = Math.max(end, d + 0.3);
      });
      return end;
    }
    var d = base, step = Math.min(0.08, 1.1 / Math.max(1, shapes.length));   // 整張圖 1.1 秒內演完
    var placed = [];
    shapes.forEach(function (it) {
      setAnim(it.el, it.kind, d, it.kind.indexOf('draw') === 0 ? 0.9 : null);
      var b = (it.tag === 'rect' || it.tag === 'circle' || it.tag === 'ellipse' || it.tag === 'polygon') ? bboxOf(it.el) : null;
      if (b && b.width > 0 && b.height > 0) placed.push({ b: b, d: d, area: b.width * b.height });
      d += step;
    });
    var td = d + 0.12, tstep = Math.min(0.06, 0.6 / Math.max(1, texts.length));
    texts.forEach(function (it) {
      var p = textAnchorPoint(it.el), host = null;
      placed.forEach(function (s) { if (p[0] >= s.b.x && p[0] <= s.b.x + s.b.width && p[1] >= s.b.y && p[1] <= s.b.y + s.b.height && (!host || s.area < host.area)) host = s; });
      if (host) { setAnim(it.el, it.kind, host.d + 0.06); }        // 字跟著它所在的形狀
      else { setAnim(it.el, it.kind, td); td += tstep; }
    });
    return Math.max(td, d);
  }
  function animBlock(el, base) {
    // 回傳這個區塊「演完」大約在幾秒，讓下一個區塊接在後面
    var kind = el.getAttribute('data-anim');
    if (kind === 'none') return base;
    if (kind) { setAnim(el, kind, base); return base + 0.3; }
    if (tagged(el)) return base + 0.3;
    var tag = el.tagName.toLowerCase();
    if (tag === 'img' || tag === 'picture' || tag === 'video') { setAnim(el, 'fade', base); return base + 0.3; }
    if (tag === 'table') { setAnim(el, 'rows', base); return base + 0.12 * Math.min(12, el.rows.length); }
    if (tag === 'svg') return animSvg(el, base);
    var inner = el.querySelector('svg,table,img');
    if (inner && el.children.length === 1) { var ch = el.children[0]; if (ch.tagName.toLowerCase() === 'img') { setAnim(ch, 'fade', base); return base + 0.3; } if (ch.tagName.toLowerCase() === 'svg') return animSvg(ch, base); if (ch.tagName.toLowerCase() === 'table') { setAnim(ch, 'rows', base); return base + 0.12 * Math.min(12, ch.rows.length); } }
    var vis = Array.from(el.children).filter(function (c) { return !c.classList.contains('is-cleared') && c.tagName !== 'SCRIPT'; });
    var d = getComputedStyle(el).display;
    if (vis.length >= 2 && vis.length <= 10 && (d === 'grid' || d === 'flex')) {
      var dd = base, cstep = Math.min(0.11, 0.8 / vis.length);
      vis.forEach(function (c) {
        if (tagged(c)) { dd += cstep; return; }
        var only = c.children.length === 1 ? c.children[0] : null;
        var sv = only && only.tagName.toLowerCase() === 'svg' ? only : (c.tagName.toLowerCase() === 'svg' ? c : null);
        if (sv) { dd = animSvg(sv, dd); return; }            // 欄位裡只有一張圖表 → 圖表自己演
        setAnim(c, 'up', dd); dd += cstep;
      });
      return dd;
    }
    setAnim(el, 'up', base); return base + 0.25;
  }
  function autoAnim(slide) {
    if (slide.getAttribute('data-anim') === 'none') return;
    // 作者自己標的元素先套（任何層級）
    slide.querySelectorAll('[data-anim]').forEach(function (el) {
      if (el === slide || el.closest('svg') !== null && el.tagName.toLowerCase() !== 'svg') return;
      if (el.closest('.plan-note')) return;
      var k = el.getAttribute('data-anim'); if (k && k !== 'none' && k !== 'stagger') setAnim(el, k, null);
    });
    if (slide.classList.contains('probe-cover')) {
      var t0 = 0.1;
      slide.querySelectorAll(':scope > img').forEach(function (el) { if (!tagged(el)) setAnim(el, 'fade', 0.05, 0.9); });
      return;
    }
    if (slide.classList.contains('probe-chapter')) {
      var l = slide.querySelector('.probe-chapter__left'), r = slide.querySelector('.probe-chapter__right');
      if (l && !tagged(l)) { setAnim(l, 'left', 0); var badge = l.querySelector('.probe-chapter__num--stamp'); if (badge && !tagged(badge)) setAnim(badge, 'pop', 0.55); }
      if (r) { var sub = r.querySelector('.probe-chapter__sub'); if (sub && !tagged(sub)) setAnim(sub, 'up', 0.45); }
      return;
    }
    var frame = slide.querySelector('.slide-frame'); if (!frame) return;
    slide.querySelectorAll(':scope > img').forEach(function (el) { if (!tagged(el)) setAnim(el, 'fade', 0.05, 0.9); });
    var d = 0.05, bands = [];
    Array.from(frame.children).forEach(function (el) {
      if (el.classList.contains('is-cleared') || el.tagName === 'SCRIPT') return;
      if (el.classList.contains('hero') || el.matches('h1,h2') || el.classList.contains('foot') || el.classList.contains('cite') || el.classList.contains('srclink')) { d = Math.max(d, 0.15); return; }   // 標題與註解＝骨架，一開始就在
      if (el.classList.contains('msask')) { bands.push(el); return; }
      d = animBlock(el, d + 0.05);
    });
    Array.from(frame.querySelectorAll('[data-reveal]')).filter(function (el) { return !el.closest('svg'); }).forEach(function (el) {
      if (el.hasAttribute('data-anim-plan')) return;
      var inner = Array.from(el.querySelectorAll('[data-anim-plan]')), d0 = d + 0.05;
      inner.forEach(function (c) { var v = parseFloat((c.getAttribute('data-anim-plan') || '').split('|')[1]); if (!isNaN(v)) d0 = Math.min(d0, v); });
      setAnim(el, el.getAttribute('data-anim') || (inner.length ? 'fade' : 'up'), d0);   // 容器自己也藏著，揭曉時跟著淡入
    });
    var seqEls = Array.from(frame.querySelectorAll('[data-seq]')).filter(function (el) { return !el.closest('svg'); });
    if (seqEls.length) {
      var maxSeq = 0;
      seqEls.forEach(function (el) {
        var n = parseFloat(el.getAttribute('data-seq')) || 1, kind = el.getAttribute('data-anim') || 'up';
        ANIM_CLASSES.forEach(function (c) { el.classList.remove(c); });
        setAnim(el, kind, 0.2 + (n - 1) * SEQ_GAP); maxSeq = Math.max(maxSeq, n);
      });
      d = Math.max(d, 0.2 + maxSeq * SEQ_GAP);
    }
    bands.forEach(function (b) { if (!tagged(b)) setAnim(b, 'up', Math.min(d + 0.1, 2.2)); d += 0.12; });
    // KPI 數字跑上去：類名像 __n／__big／kpi 且內容是單一個數字的
    Array.from(frame.querySelectorAll('[class]')).filter(function (el) {
      return Array.from(el.classList).some(function (c) { return /__(n|num|big|val)(--[\w-]+)?$/.test(c) || /kpi__(n|v|num|val)$/.test(c); });
    }).forEach(function (el) {
      if (tagged(el) || el.closest('svg,table')) return;
      if (countable(el)) setAnim(el, 'count');
    });
  }
  // ── 數字跑上去（count-up）：元素文字是「前綴＋數字＋後綴」時，翻到那一頁從 0 跑到該數字 ──
  var NUM_RE = /^([^\d]*?)(\d[\d,]*(?:\.\d+)?)([^\d]*)$/;
  function countable(el) {
    var t = el.textContent.trim(); var m = NUM_RE.exec(t); if (!m) return false;
    if (num(m[2].replace(/,/g, '')) < 2) return false;
    return Array.from(el.children).every(function (c) { return c.tagName === 'SMALL' || c.tagName === 'SPAN' || c.tagName === 'B'; });
  }
  function firstNumNode(el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) { if (/\d/.test(n.textContent)) return n; }
    return null;
  }
  function runCount(el) {
    var node = firstNumNode(el); if (!node) return;
    var orig = node.__orig !== undefined ? node.__orig : (node.__orig = node.textContent);
    var m = /(\d[\d,]*(?:\.\d+)?)/.exec(orig); if (!m) return;
    var target = num(m[1].replace(/,/g, '')), commas = m[1].indexOf(',') >= 0, dec = (m[1].split('.')[1] || '').length;
    var dur = 900, wait = 0, a = el;
    while (a && a.nodeType === 1 && !a.classList.contains('slide')) { var dv = parseFloat(a.style.getPropertyValue('--anim-delay')); if (!isNaN(dv)) { wait = Math.max(wait, dv * 1000); } a = a.parentNode; }
    function fmt(v) { var s = v.toFixed(dec); if (commas) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return s; }
    if (document.documentElement.classList.contains('no-motion')) { node.textContent = orig; return; }
    node.textContent = orig.replace(m[1], fmt(0));
    var t0 = performance.now() + wait;
    function step(now) {
      if (now < t0) { requestAnimationFrame(step); return; }
      var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      node.textContent = orig.replace(m[1], fmt(target * e));
      if (k < 1) requestAnimationFrame(step); else node.textContent = orig;
    }
    requestAnimationFrame(step);
  }
  function finishCounts() { document.querySelectorAll('.anim-count').forEach(function (el) { var n = firstNumNode(el); if (n && n.__orig !== undefined) n.textContent = n.__orig; }); }
  var countObs = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      var s = m.target; if (!(s.classList && s.classList.contains('slide') && s.classList.contains('active'))) return;
      if (s.__countDone === s.className) return;
      setTimeout(function () { s.querySelectorAll('.anim-count').forEach(function (c) { if (!c.closest('.is-pending')) runCount(c); }); }, 250);
    });
  });
  document.querySelectorAll('.deck > .slide').forEach(function (s) { countObs.observe(s, { attributes: true, attributeFilter: ['class'] }); });
  setTimeout(function () { var a = document.querySelector('.deck > .slide.active'); if (a) a.querySelectorAll('.anim-count').forEach(function (c) { if (!c.closest('.is-pending')) runCount(c); }); }, 400);

  // 套完修改後：每頁重排＋自動動畫（要放在上面所有 var 定義之後）
  slides.forEach(function (slide) { reflow(slide); autoAnim(slide); });

  // ── 按一下揭曉（老師 2026-09-14）：有 data-reveal 的頁，進頁＝骨架＋現況；按 →（或點右邊）一次把論點演完；再按才翻頁 ──
  function pendingIn(slide) { return slide ? Array.from(slide.querySelectorAll('.is-pending')) : []; }
  function activeSlide() { return document.querySelector('.deck > .slide.active'); }
  function revealDot() {
    var pr = document.querySelector('.progress'); if (!pr) return;
    var s = activeSlide(), has = s && pendingIn(s).length > 0, dot = pr.querySelector('.reveal-dot');
    if (has && !dot) { dot = document.createElement('span'); dot.className = 'reveal-dot'; dot.title = '這頁還有一段：按 → 揭曉'; pr.appendChild(dot); }
    if (!has && dot) dot.remove();
  }
  function reveal(slide) {
    var els = pendingIn(slide); if (!els.length) return false;
    var plans = els.map(function (el) { var p = (el.getAttribute('data-anim-plan') || 'up|0|').split('|'); return { el: el, kind: p[0], delay: parseFloat(p[1]) || 0, dur: p[2] ? parseFloat(p[2]) : null }; });
    var d0 = Math.min.apply(null, plans.map(function (p) { return p.delay; }));
    // 帶子（小結／原則）排在最後：等這次揭曉的其他動畫都跑完再出來
    var DUR = { bar: 0.75, 'bar-v': 0.7, 'bar-w': 0.6, draw: 0.9, 'draw-rev': 0.9, up: 0.5, fade: 0.6, pop: 0.45, drop: 0.35, slam: 0.3, left: 0.5, right: 0.5, stamp: 0.45, 'in-y': 0.5, count: 0.9 };
    var isBand = function (el) { return el.classList && el.classList.contains('msask'); };
    var endOthers = 0;
    plans.forEach(function (p) { if (!isBand(p.el) && !(p.el.closest && p.el.closest('.msask'))) endOthers = Math.max(endOthers, p.delay - d0 + 0.05 + (p.dur || DUR[p.kind] || 0.5)); });
    plans.forEach(function (p) {
      var delay = p.delay - d0 + 0.05;
      if (isBand(p.el) || (p.el.closest && p.el.closest('.msask'))) delay = Math.max(delay, endOthers + 0.1);
      p.el.classList.remove('is-pending'); setAnim(p.el, p.kind, delay, p.dur, true);
    });
    plans.forEach(function (p) { if (p.kind === 'count') runCount(p.el); else if (p.el.querySelectorAll) p.el.querySelectorAll('.anim-count').forEach(function (c) { if (c.hasAttribute('data-anim-plan')) runCount(c); }); });
    setTimeout(revealDot, 0);
    return true;
  }
  function resetReveal(slide) {
    slide.querySelectorAll('[data-anim-plan]').forEach(function (el) {
      ANIM_CLASSES.forEach(function (c) { el.classList.remove(c); });
      ['--anim-delay', '--anim-dur', '--anim-draw-len'].forEach(function (v) { el.style.removeProperty(v); });
      el.classList.add('is-pending');
    });
  }
  function navBlocked() { return document.documentElement.classList.contains('plan-on') || document.body.classList.contains('overview-on') || document.querySelector('#overview.is-on, .overview.is-on, body.overview'); }
  document.addEventListener('keydown', function (e) {
    if (on) return;                                                   // 編輯模式不攔
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      var s = activeSlide(); if (s && pendingIn(s).length && reveal(s)) { e.preventDefault(); e.stopPropagation(); }
    }
  }, true);
  document.addEventListener('click', function (e) {
    if (on) return;
    if (e.target.closest('a, button, input, textarea, #plan-panel, .plan-note, #edit-bar, #overview')) return;
    if (e.clientX < window.innerWidth / 3) return;
    var s = activeSlide(); if (s && pendingIn(s).length && reveal(s)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  new MutationObserver(function (muts) {
    muts.forEach(function (m) { var s = m.target; if (!(s.classList && s.classList.contains('slide'))) return; if (!s.classList.contains('active')) setTimeout(function () { if (!s.classList.contains('active')) resetReveal(s); }, 450); });   // 等淡出（.4s）跑完再重設
    revealDot();
  }).observe(document.querySelector('.deck') || document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
  setTimeout(revealDot, 300);

  var on = false;
  var bar = document.createElement('div');
  bar.id = 'edit-bar';
  bar.innerHTML = '<span class="edit-bar__l">編輯模式</span><span class="edit-bar__t">點文字直接改（圖裡的字也可以）</span>' +
    '<button type="button" data-act="save">儲存</button>' +
    '<span class="edit-bar__s" id="edit-status"></span>' +
    '<button type="button" data-act="html">另存一份</button>' +
    '<button type="button" data-act="reset">清除本機修改</button>' +
    '<button type="button" data-act="close">關閉（E）</button>';
  document.body.appendChild(bar);
  ['keydown', 'keyup', 'keypress', 'click', 'mousedown'].forEach(function (t) { bar.addEventListener(t, function (ev) { ev.stopPropagation(); }); });

  function persist() { try { var o = {}; Object.keys(edits).forEach(function (k) { o[k] = edits[k]; }); o.__rev = embRev; localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} }
  function download(name, text, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function setEdit(state) {
    on = state;
    document.documentElement.classList.toggle('edit-on', on);
    targets.forEach(function (el) {
      if (on) { el.setAttribute('contenteditable', 'true'); el.setAttribute('spellcheck', 'false'); el.classList.add('is-editable'); }
      else { el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck'); el.classList.remove('is-editable'); }
    });
    svgTargets.forEach(function (el) { el.classList.toggle('is-editable-svg', on); });
    if (!on) closeSvgBox(false);
  }
  // ── SVG 圖裡的字：點一下跳出一個小輸入框，Enter 確定、Esc 取消、點別處也確定 ──
  var svgBox = null, svgBoxEl = null;
  function closeSvgBox(commit) {
    if (!svgBox) return;
    var box = svgBox, el = svgBoxEl; svgBox = null; svgBoxEl = null;
    if (commit && el) {
      var v = box.value;
      if (v !== el.textContent) { el.textContent = v; edits[el.getAttribute('data-eid')] = v; el.classList.toggle('is-cleared', isBlank(v)); persist(); scheduleReflow(el.closest('.slide')); }
    }
    box.remove();
  }
  function openSvgBox(el) {
    closeSvgBox(true);
    var r = el.getBoundingClientRect();
    var box = document.createElement('input');
    box.type = 'text'; box.id = 'svg-edit-box'; box.value = el.textContent; box.setAttribute('spellcheck', 'false');
    var fs = Math.max(12, Math.round(r.height * 0.78));
    box.style.cssText = 'position:fixed;z-index:950;left:' + Math.max(0, r.left - 6) + 'px;top:' + Math.max(0, r.top - 4) + 'px;' +
      'min-width:' + Math.max(120, r.width + 40) + 'px;height:' + (r.height + 8) + 'px;font-size:' + fs + 'px;';
    ['keydown', 'keyup', 'keypress', 'click', 'mousedown'].forEach(function (t) { box.addEventListener(t, function (ev) { ev.stopPropagation(); }); });
    box.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); closeSvgBox(true); }
      else if (ev.key === 'Escape') { ev.preventDefault(); closeSvgBox(false); }
    });
    box.addEventListener('blur', function () { setTimeout(function () { if (svgBox === box) closeSvgBox(true); }, 0); });
    document.body.appendChild(box); svgBox = box; svgBoxEl = el;
    box.focus(); box.select();
  }
  svgTargets.forEach(function (el) {
    el.addEventListener('mousedown', function (ev) { if (on) ev.stopPropagation(); });
    el.addEventListener('click', function (ev) { if (!on) return; ev.stopPropagation(); ev.preventDefault(); openSvgBox(el); });
  });
  targets.forEach(function (el) {
    ['keydown', 'keyup', 'keypress', 'click', 'mousedown'].forEach(function (t) {
      el.addEventListener(t, function (ev) { if (on) ev.stopPropagation(); });
    });
    el.addEventListener('input', function () { if (!on) return; var v = cleanHTML(el.innerHTML); edits[el.getAttribute('data-eid')] = v; el.classList.toggle('is-cleared', isBlank(v)); persist(); scheduleReflow(el.closest('.slide')); });
  });
  // ── 直接寫回這份檔案（Chrome File System Access API；第一次會跳一次檔案視窗選這份 html，之後不再問）──
  function serialize() {
    closeSvgBox(true); finishCounts();
    var wasOn = on; if (wasOn) setEdit(false);
    var root = document.documentElement.cloneNode(true);
    root.classList.remove('edit-on');
    var eb = root.querySelector('#edit-bar'); if (eb) eb.remove();
    var ov = root.querySelector('#overview'); if (ov) ov.remove();
    var pp = root.querySelector('#plan-panel'); if (pp) pp.remove();
    var pr = root.querySelector('.progress'); if (pr) pr.remove();
    var mh = root.querySelector('.mode-hint'); if (mh) mh.remove();
    root.querySelectorAll('[contenteditable="true"][data-eid]').forEach(function (el) { el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck'); });
    root.querySelectorAll('.is-editable').forEach(function (el) { el.classList.remove('is-editable'); if (!el.getAttribute('class')) el.removeAttribute('class'); });
    root.querySelectorAll('.is-editable-svg').forEach(function (el) { el.classList.remove('is-editable-svg'); if (!el.getAttribute('class')) el.removeAttribute('class'); });
    root.querySelectorAll('.is-cleared').forEach(function (el) { el.classList.remove('is-cleared'); if (!el.getAttribute('class')) el.removeAttribute('class'); });
    root.querySelectorAll('.is-pending,[data-anim-plan]').forEach(function (el) { el.classList.remove('is-pending'); el.removeAttribute('data-anim-plan'); if (!el.getAttribute('class')) el.removeAttribute('class'); });
    root.querySelectorAll('[data-auto-cleared]').forEach(function (el) { el.removeAttribute('data-auto-cleared'); });
    root.querySelectorAll('[data-cols-auto]').forEach(function (el) { el.style.gridTemplateColumns = ''; el.removeAttribute('data-cols-auto'); if (!el.getAttribute('style')) el.removeAttribute('style'); });
    root.querySelectorAll('[data-cols-orig]').forEach(function (el) { el.removeAttribute('data-cols-orig'); });
    root.querySelectorAll('[data-tier],[data-n]').forEach(function (el) { el.removeAttribute('data-tier'); el.removeAttribute('data-n'); });
    root.querySelectorAll(ANIM_CLASSES.map(function (c) { return '.' + c; }).join(',')).forEach(function (el) {
      if (el.hasAttribute('data-anim') && el.closest('svg') === null && false) return;
      ANIM_CLASSES.forEach(function (c) { el.classList.remove(c); }); el.removeAttribute('data-count'); el.removeAttribute('data-anim-auto');
      ['--anim-delay', '--anim-dur', '--anim-draw-len'].forEach(function (v) { el.style.removeProperty(v); });
      if (!el.getAttribute('class')) el.removeAttribute('class'); if (!el.getAttribute('style')) el.removeAttribute('style');
    });
    var sb = root.querySelector('#svg-edit-box'); if (sb) sb.remove();
    root.querySelectorAll('.slide.active').forEach(function (el) { el.classList.remove('active'); });
    // 存檔寫回原始內容（修改另存在 deck-edits），這樣重開時元素順序跟 build 一致、eid 不會位移
    Array.from(root.querySelectorAll('[data-eid]')).forEach(function (el) {
      var id = el.getAttribute('data-eid');
      if (pristine[id] !== undefined) { if (id.indexOf(':s') > 0) el.textContent = pristine[id]; else el.innerHTML = pristine[id]; }
    });
    root.querySelectorAll('[data-eid]').forEach(function (el) { el.removeAttribute('data-eid'); });
    var tag = root.querySelector('#deck-edits');
    if (!tag) { tag = document.createElement('script'); tag.id = 'deck-edits'; tag.type = 'application/json'; root.querySelector('body').appendChild(tag); }
    var payload = { deck: document.title, saved: new Date().toISOString(), rev: embRev, edits: edits };
    Object.keys(embExtra).forEach(function (k) { payload[k] = embExtra[k]; });
    tag.textContent = JSON.stringify(payload, null, 1).replace(/<\/script/g, '<\\/script');
    if (wasOn) setEdit(true);
    return '<!DOCTYPE html>\n' + root.outerHTML;
  }
  var status = bar.querySelector('#edit-status');
  function setStatus(t, bad) { if (status) { status.textContent = t; status.classList.toggle('is-bad', !!bad); } }
  var DB = 'deck-edit-fs', KEY = 'handle:' + location.pathname;
  function idb(mode, fn) {
    return new Promise(function (res, rej) {
      var q = indexedDB.open(DB, 1);
      q.onupgradeneeded = function () { q.result.createObjectStore('h'); };
      q.onerror = function () { rej(q.error); };
      q.onsuccess = function () {
        var tx = q.result.transaction('h', mode); var st = tx.objectStore('h'); var r = fn(st);
        tx.oncomplete = function () { res(r && r.result); }; tx.onerror = function () { rej(tx.error); };
      };
    });
  }
  var fileHandle = null;
  async function getHandle() {
    if (fileHandle) return fileHandle;
    try { fileHandle = await idb('readonly', function (st) { return st.get(KEY); }); } catch (e) {}
    if (fileHandle) {
      var perm = await fileHandle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') perm = await fileHandle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') return fileHandle;
      fileHandle = null;
    }
    var name = decodeURIComponent(location.pathname.split('/').pop() || 'deck.html');
    fileHandle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'HTML', accept: { 'text/html': ['.html'] } }] });
    try { await idb('readwrite', function (st) { return st.put(fileHandle, KEY); }); } catch (e) {}
    return fileHandle;
  }
  async function saveToFile() {
    var hm = function () {
      var t = new Date();
      return t.getHours() + ':' + String(t.getMinutes()).padStart(2, '0');
    };
    var fallback = function () {
      download((document.title || 'deck').replace(/[\\/:*?"<>|]/g, '_') + '_edited.html', serialize(), 'text/html;charset=utf-8');
    };

    // ── 走本機伺服器（用「開啟簡報.command」開的）：直接 POST 回去，零對話框 ──
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      var fname = decodeURIComponent((location.pathname.split('/').pop() || '')) || 'annual-meeting-2026.html';
      try {
        setStatus('儲存中…');
        // 先確認磁碟上的檔案跟這個分頁是同一次 build（AI 重建過就不能蓋回去）
        var myStamp = (document.querySelector('meta[name="deck-build"]') || {}).content || '';
        try {
          var bq = await fetch('/__build?file=' + encodeURIComponent(fname), { cache: 'no-store' });
          var bj = await bq.json();
          if (myStamp && bj && bj.build && bj.build !== myStamp) { setStatus('檔案已被重建，請重新整理後再儲存（你改的字會留在這台電腦）', true); return; }
        } catch (e0) {}
        var res = await fetch('/save?file=' + encodeURIComponent(fname), {
          method: 'POST',
          headers: { 'Content-Type': 'text/html;charset=utf-8' },
          body: serialize()
        });
        var data = null;
        try { data = await res.json(); } catch (e2) {}
        if (res.ok && data && data.ok) { setStatus('已儲存 ' + (data.saved || hm())); return; }
        if (res.status === 409 && data && data.stale) { setStatus(data.error, true); return; }   // 舊分頁：不蓋、不下載
        throw new Error((data && data.error) || ('HTTP ' + res.status));
      } catch (e) {
        setStatus('寫檔失敗，改用「另存一份」', true);
        fallback();
        return;
      }
    }

    // ── 直接用檔案開的（file:）：沿用 Chrome 的檔案存取流程，第一次要選檔 ──
    if (!window.showSaveFilePicker) {
      setStatus('這個瀏覽器不能直接寫檔，改用「另存一份」', true);
      fallback();
      return;
    }
    try {
      setStatus('儲存中…（用「開啟簡報.command」開，就不用選檔）');
      var h = await getHandle();
      var w = await h.createWritable();
      await w.write(serialize()); await w.close();
      setStatus('已儲存 ' + hm());
    } catch (e) {
      if (e && e.name === 'AbortError') { setStatus('已取消'); return; }
      setStatus('寫檔失敗，改用「另存一份」', true);
      fallback();
    }
  }
  var resetArmed = false;
  bar.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'close') setEdit(false);
    if (act === 'save') saveToFile();
    if (act === 'html') download((document.title || 'deck').replace(/[\\/:*?"<>|]/g, '_') + '_edited.html', serialize(), 'text/html;charset=utf-8');
    if (act === 'reset') {
      if (!resetArmed) { resetArmed = true; b.textContent = '再按一次確認清除'; setTimeout(function () { resetArmed = false; b.textContent = '清除本機修改'; }, 3000); return; }
      try { localStorage.removeItem(STORE); } catch (e) {}
      location.reload();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setEdit(!on); }
  });
})();
