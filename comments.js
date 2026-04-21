// === Gather Website — Comment System ===
// Screen-aware: pins worden alleen getoond op de pagina waar ze geplaatst zijn.
// Opslag: localStorage (geen server nodig).

(function() {
  const STORAGE_KEY = 'gather_comments_v1';
  let comments = [];
  let commentMode = false;
  let nextId = 1;
  let pinsVisible = true;
  let panelFilter = 'all';
  let panelPriorityFilter = 'all';
  let panelSearch = '';
  let panelSelectMode = false;
  let panelSelected = new Set();

  const CATEGORIES = {
    ux:       { label: 'UX',            color: '#1A6DFF' },
    copy:     { label: 'Tekst/Copy',    color: '#8B5CF6' },
    content:  { label: 'Inhoud',        color: '#B65638' },
    tech:     { label: 'Technisch',     color: '#14B8A6' }
  };

  const PRIORITIES = {
    must:   { label: 'Must',  color: '#DC2626' },
    should: { label: 'Should', color: '#1A6DFF' },
    nice:   { label: 'Nice',   color: '#10B981' }
  };

  const SCREEN_NAMES = {
    home:     'Work (home)',
    approach: 'Approach',
    studio:   'About',
    insights: 'Insights',
    contact:  'Contact',
    opvang:   'Case: Opvang.Vlaanderen',
    toekan:   'Case: Toekan',
    kempen:   'Case: Non-take up Kempen'
  };

  const ICONS = {
    plus: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    eye: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/></svg>',
    eyeOff: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 14L14 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    list: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M4 8l4 4 4-4M2 13h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevronLeft: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevronRight: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M9.5 9.5L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    close: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  };

  // Actieve pagina (React SPA — opgeslagen in localStorage)
  function getCurrentPage() {
    return localStorage.getItem('gt-page-v3') || 'home';
  }

  function load() {
    comments = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    comments.forEach(c => { if (!c.category) c.category = 'ux'; });
    nextId = comments.length ? Math.max(...comments.map(c => c.id)) + 1 : 1;
    renderPins();
    updateBadge();
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
    renderPins();
    updateBadge();
  }

  // === CSS ===
  const style = document.createElement('style');
  style.textContent = `
    .cm-toolbar {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      display: flex; gap: 4px; align-items: center;
      background: #fff; border: 1px solid #E5E7EB;
      border-radius: 999px; padding: 6px 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      transition: transform 0.25s ease, border-color 0.2s ease;
    }
    .cm-toolbar.cm-mode-active { border-color: #1A6DFF; box-shadow: 0 2px 12px rgba(0,0,0,0.08), 0 0 0 2px rgba(26,109,255,0.15); }
    .cm-toolbar.collapsed { transform: translateX(calc(100% - 40px)); }
    .cm-toolbar.collapsed > *:not(.cm-btn-collapse) { opacity: 0; pointer-events: none; }
    .cm-tbtn {
      display: flex; align-items: center; justify-content: center;
      border: none; border-radius: 50%; width: 34px; height: 34px;
      cursor: pointer; background: transparent; color: #6B7280;
      transition: background 0.15s, color 0.15s; position: relative; padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .cm-tbtn:hover { background: #F9FAFB; color: #1A1A1A; }
    .cm-tbtn-comment { background: #1A6DFF; color: white; width: 32px; height: 32px; }
    .cm-tbtn-comment:hover { background: #155bd4; }
    .cm-tbtn-comment.active { background: #DC2626; }
    .cm-tbtn-comment.active:hover { background: #b91c1c; }
    .cm-tbtn .cm-tbtn-badge {
      position: absolute; top: -2px; right: -4px;
      background: #1A6DFF; color: white; border-radius: 99px;
      font-size: 10px; font-weight: 700; padding: 1px 5px; line-height: 1.3;
      min-width: 14px; text-align: center; pointer-events: none;
    }
    .cm-btn-collapse {
      display: flex; align-items: center; justify-content: center;
      border: none; background: transparent; color: #6B7280;
      cursor: pointer; padding: 0; width: 28px; height: 28px; border-radius: 50%;
    }
    .cm-btn-collapse:hover { background: #F9FAFB; color: #1A1A1A; }
    .cm-toolbar-divider { width: 1px; height: 20px; background: #E5E7EB; margin: 0 2px; }
    body.cm-active { cursor: crosshair !important; }
    body.cm-active * { cursor: crosshair !important; }
    .cm-pin {
      position: absolute; z-index: 99990; width: 24px; height: 24px;
      border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; color: white; border: 2px solid white;
      transition: transform 0.2s ease; animation: cm-pin-in 0.25s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    @keyframes cm-pin-in { 0% { transform: scale(0); } 80% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .cm-pin:hover { transform: scale(1.2); }
    .cm-pin.cm-pin-must { background: #DC2626; }
    .cm-pin.cm-pin-should { background: #1A6DFF; }
    .cm-pin.cm-pin-nice { background: #10B981; }
    .cm-pin-tooltip {
      position: absolute; left: 50%; bottom: calc(100% + 6px);
      transform: translateX(-50%); white-space: nowrap;
      background: #1A1A1A; color: white; font-size: 11px;
      padding: 4px 8px; border-radius: 6px; pointer-events: none;
      opacity: 0; transition: opacity 0.15s; max-width: 200px;
      overflow: hidden; text-overflow: ellipsis; z-index: 99991;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .cm-pin:hover .cm-pin-tooltip { opacity: 1; }
    .cm-popup {
      position: absolute; z-index: 99995; background: #fff;
      border-radius: 12px; padding: 16px; width: 320px;
      border: 1px solid #E5E7EB;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .cm-popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .cm-popup-title { font-size: 14px; font-weight: 600; color: #1A1A1A; }
    .cm-popup-close { display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: #6B7280; width: 28px; height: 28px; border-radius: 50%; padding: 0; }
    .cm-popup-close:hover { background: #F9FAFB; color: #1A1A1A; }
    .cm-chip-group { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .cm-chip-label { font-size: 11px; font-weight: 500; color: #6B7280; margin-bottom: 4px; display: block; }
    .cm-chip {
      border: 1px solid #E5E7EB; background: #fff;
      border-radius: 99px; padding: 4px 12px; font-size: 12px;
      cursor: pointer; color: #6B7280; transition: all 0.15s; font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .cm-popup textarea {
      width: 100%; border: 1px solid #E5E7EB; border-radius: 8px;
      padding: 10px 12px; font-size: 13px; resize: vertical; min-height: 70px;
      color: #1A1A1A; box-sizing: border-box; outline: none; line-height: 1.5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .cm-popup textarea:focus { border-color: #1A6DFF; }
    .cm-popup-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; align-items: center; }
    .cm-popup-actions button {
      border: none; border-radius: 8px; padding: 7px 16px;
      font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .cm-popup .cm-save { background: #1A6DFF; color: white; }
    .cm-popup .cm-delete { background: transparent; color: #DC2626; padding: 7px 8px; }
    .cm-popup .cm-delete:hover { background: #FEF2F2; }
    .cm-popup .cm-resolve { background: transparent; color: #059669; padding: 7px 8px; }
    .cm-popup .cm-resolve:hover { background: #ECFDF5; }
    .cm-existing-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .cm-tag-pill { display: inline-flex; align-items: center; font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 99px; line-height: 1.5; }
    .cm-existing-text { font-size: 13px; color: #1A1A1A; line-height: 1.6; margin-bottom: 8px; white-space: pre-wrap; }
    .cm-existing-meta { font-size: 11px; color: #6B7280; margin-bottom: 12px; }
    .cm-panel {
      position: fixed; top: 0; right: -440px; width: 420px; height: 100vh;
      background: #fff; z-index: 99998; border-left: 1px solid #E5E7EB;
      transition: right 0.25s ease; overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; flex-direction: column;
    }
    .cm-panel.open { right: 0; }
    .cm-panel-header { padding: 20px 20px 0; display: flex; justify-content: space-between; align-items: center; }
    .cm-panel-title { font-size: 16px; font-weight: 700; color: #1A1A1A; }
    .cm-panel-close { display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: #6B7280; width: 32px; height: 32px; border-radius: 50%; padding: 0; }
    .cm-panel-close:hover { background: #F9FAFB; color: #1A1A1A; }
    .cm-panel-search { padding: 12px 20px 0; }
    .cm-panel-search-wrap { position: relative; }
    .cm-panel-search-wrap svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #6B7280; pointer-events: none; }
    .cm-panel-search input { width: 100%; border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px 12px 8px 32px; font-size: 13px; color: #1A1A1A; box-sizing: border-box; outline: none; background: #F9FAFB; font-family: inherit; }
    .cm-panel-search input:focus { border-color: #1A6DFF; background: #fff; }
    .cm-panel-filters { padding: 12px 20px 0; }
    .cm-panel-filter-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .cm-filter-chip { border: 1px solid #E5E7EB; background: #fff; border-radius: 99px; padding: 4px 12px; font-size: 12px; cursor: pointer; color: #6B7280; transition: all 0.15s; font-weight: 500; font-family: inherit; white-space: nowrap; }
    .cm-filter-chip.active { background: #1A1A1A; color: white; border-color: #1A1A1A; }
    .cm-filter-chip .cm-filter-count { font-size: 10px; margin-left: 3px; opacity: 0.7; }
    .cm-panel-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
    .cm-panel-page-group { margin-bottom: 20px; }
    .cm-panel-page-header { font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #E5E7EB; }
    .cm-panel-item { padding: 12px; border: 1px solid #E5E7EB; border-radius: 10px; margin-bottom: 8px; cursor: pointer; transition: border-color 0.15s; position: relative; }
    .cm-panel-item:hover { border-color: #1A6DFF; }
    .cm-panel-item.resolved { opacity: 0.45; }
    .cm-panel-item-header { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
    .cm-panel-item-id { font-size: 12px; font-weight: 700; color: #1A6DFF; }
    .cm-panel-item-text { font-size: 13px; color: #1A1A1A; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .cm-panel-item-meta { font-size: 11px; color: #6B7280; margin-top: 6px; }
    .cm-panel-empty { text-align: center; padding: 40px 20px; color: #6B7280; font-size: 13px; }
    .cm-panel-footer { padding: 12px 20px; border-top: 1px solid #E5E7EB; background: #fff; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
    .cm-panel-footer button { width: 100%; background: #1A1A1A; color: white; border: none; border-radius: 8px; padding: 10px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .cm-panel-footer button:hover { opacity: 0.9; }
    .cm-panel-footer .cm-btn-secondary { background: transparent; color: #1A1A1A; border: 1px solid #E5E7EB; }
    .cm-panel-footer .cm-btn-danger { background: #DC2626; }
    .cm-panel-footer .cm-footer-row { display: flex; gap: 6px; }
    .cm-panel-footer .cm-footer-row button { flex: 1; padding: 9px 6px; font-size: 12px; }
    .cm-page-badge {
      display: inline-block; padding: 2px 8px; border-radius: 99px;
      font-size: 10px; font-weight: 600; background: #F3F4F6; color: #6B7280;
      margin-left: 6px; vertical-align: middle;
    }
  `;
  document.head.appendChild(style);

  // === Toolbar ===
  const toolbar = document.createElement('div');
  toolbar.className = 'cm-toolbar';
  toolbar.innerHTML = `
    <button class="cm-btn-collapse" title="Verberg toolbar">${ICONS.chevronRight}</button>
    <button class="cm-tbtn cm-tbtn-comment" title="Comment plaatsen (C)">${ICONS.plus}</button>
    <div class="cm-toolbar-divider"></div>
    <button class="cm-tbtn cm-tbtn-eye" title="Pins tonen/verbergen (H)">${ICONS.eye}</button>
    <button class="cm-tbtn cm-tbtn-panel" title="Overzicht">
      ${ICONS.list}
      <span class="cm-tbtn-badge" style="display:none">0</span>
    </button>
    <button class="cm-tbtn cm-tbtn-export" title="Exporteer Markdown">${ICONS.download}</button>
  `;
  document.body.appendChild(toolbar);

  toolbar.querySelector('.cm-btn-collapse').onclick = collapseToolbar;
  toolbar.querySelector('.cm-tbtn-comment').onclick = toggle;
  toolbar.querySelector('.cm-tbtn-eye').onclick = togglePins;
  toolbar.querySelector('.cm-tbtn-panel').onclick = togglePanel;
  toolbar.querySelector('.cm-tbtn-export').onclick = exportMD;

  // === Panel ===
  const panel = document.createElement('div');
  panel.className = 'cm-panel';
  document.body.appendChild(panel);

  function updateBadge() {
    const badge = toolbar.querySelector('.cm-tbtn-badge');
    const open = comments.filter(c => !c.resolved).length;
    badge.textContent = open;
    badge.style.display = open > 0 ? '' : 'none';
  }

  function renderPins() {
    document.querySelectorAll('.cm-pin').forEach(p => p.remove());
    if (!pinsVisible) return;
    const currentPage = getCurrentPage();
    comments.forEach(c => {
      if (c.resolved) return;
      if (c.page && c.page !== currentPage) return;
      const pin = document.createElement('div');
      const pClass = c.priority === 'must' ? 'cm-pin-must' : c.priority === 'nice' ? 'cm-pin-nice' : 'cm-pin-should';
      pin.className = 'cm-pin ' + pClass;
      pin.style.left = (c.x - 12) + 'px';
      pin.style.top = (c.y - 12) + 'px';
      const preview = (c.text || '').substring(0, 40) + ((c.text || '').length > 40 ? '...' : '');
      pin.innerHTML = `<span>${c.id}</span><div class="cm-pin-tooltip">${escapeHtml(preview)}</div>`;
      pin.onclick = (e) => { e.stopPropagation(); showExistingPopup(c); };
      document.body.appendChild(pin);
    });
    updateBadge();
  }

  // Observe React page changes via MutationObserver on #root
  let lastPage = getCurrentPage();
  const rootEl = document.getElementById('root');
  if (rootEl) {
    new MutationObserver(() => {
      const p = getCurrentPage();
      if (p !== lastPage) {
        lastPage = p;
        closeAllPopups();
        renderPins();
      }
    }).observe(rootEl, { childList: true, subtree: false });
  }

  function toggle() {
    commentMode = !commentMode;
    document.body.classList.toggle('cm-active', commentMode);
    const btn = toolbar.querySelector('.cm-tbtn-comment');
    btn.classList.toggle('active', commentMode);
    btn.innerHTML = commentMode ? ICONS.close : ICONS.plus;
    toolbar.classList.toggle('cm-mode-active', commentMode);
  }

  document.addEventListener('click', (e) => {
    if (!commentMode) return;
    if (e.target.closest('.cm-toolbar, .cm-popup, .cm-panel, .cm-pin')) return;
    e.preventDefault(); e.stopPropagation();
    showNewPopup(e.pageX, e.pageY);
    toggle();
  }, true);

  function buildChips(items, selectedKey, groupName) {
    return Object.entries(items).map(([key, def]) => {
      const sel = key === selectedKey;
      return `<button class="cm-chip${sel ? ' selected' : ''}" data-group="${groupName}" data-val="${key}"
        style="${sel ? `border-color:${def.color};color:${def.color};background:${def.color}15` : ''}">${def.label}</button>`;
    }).join('');
  }

  function handleChipClick(e) {
    const chip = e.target.closest('.cm-chip');
    if (!chip) return;
    const group = chip.dataset.group;
    const popup = chip.closest('.cm-popup');
    if (!popup) return;
    popup.querySelectorAll(`.cm-chip[data-group="${group}"]`).forEach(c => {
      c.classList.remove('selected');
      const def = (group === 'category' ? CATEGORIES : PRIORITIES)[c.dataset.val];
      if (def) { c.style.borderColor = ''; c.style.color = ''; c.style.background = ''; }
    });
    chip.classList.add('selected');
    const def = (group === 'category' ? CATEGORIES : PRIORITIES)[chip.dataset.val];
    if (def) { chip.style.borderColor = def.color; chip.style.color = def.color; chip.style.background = def.color + '15'; }
  }

  function showNewPopup(x, y) {
    closeAllPopups();
    const popup = document.createElement('div');
    popup.className = 'cm-popup';
    popup.style.left = (x + 16) + 'px';
    popup.style.top = (y - 16) + 'px';
    const currentPage = getCurrentPage();
    const pageName = SCREEN_NAMES[currentPage] || currentPage;
    popup.innerHTML = `
      <div class="cm-popup-header">
        <span class="cm-popup-title">Opmerking #${nextId} <span class="cm-page-badge">${escapeHtml(pageName)}</span></span>
        <button class="cm-popup-close">${ICONS.close}</button>
      </div>
      <span class="cm-chip-label">Categorie</span>
      <div class="cm-chip-group">${buildChips(CATEGORIES, 'ux', 'category')}</div>
      <span class="cm-chip-label">Prioriteit</span>
      <div class="cm-chip-group">${buildChips(PRIORITIES, 'should', 'priority')}</div>
      <textarea placeholder="Wat moet hier anders?"></textarea>
      <div class="cm-popup-actions"><button class="cm-save">Opslaan</button></div>
    `;
    setTimeout(() => {
      const rect = popup.getBoundingClientRect();
      if (rect.right > window.innerWidth - 20) popup.style.left = (x - 336) + 'px';
      if (rect.bottom > window.innerHeight - 20) popup.style.top = (y - rect.height) + 'px';
    }, 0);
    popup.addEventListener('click', handleChipClick);
    popup.querySelector('.cm-popup-close').onclick = () => popup.remove();
    popup.querySelector('.cm-save').onclick = () => saveNew(popup, x, y);
    document.body.appendChild(popup);
    popup.querySelector('textarea').focus();
  }

  function showExistingPopup(c) {
    closeAllPopups();
    const popup = document.createElement('div');
    popup.className = 'cm-popup';
    popup.style.left = (c.x + 16) + 'px';
    popup.style.top = (c.y - 16) + 'px';
    const cat = CATEGORIES[c.category] || CATEGORIES.ux;
    const pri = PRIORITIES[c.priority] || PRIORITIES.should;
    const pageName = SCREEN_NAMES[c.page] || c.page || '';
    popup.innerHTML = `
      <div class="cm-popup-header">
        <span class="cm-popup-title">#${c.id} <span class="cm-page-badge">${escapeHtml(pageName)}</span></span>
        <button class="cm-popup-close">${ICONS.close}</button>
      </div>
      <div class="cm-existing-tags">
        <span class="cm-tag-pill" style="background:${cat.color}15;color:${cat.color}">${cat.label}</span>
        <span class="cm-tag-pill" style="background:${pri.color}15;color:${pri.color}">${pri.label}</span>
      </div>
      <div class="cm-existing-text">${escapeHtml(c.text)}</div>
      <div class="cm-existing-meta">${c.date}</div>
      <div class="cm-popup-actions">
        <button class="cm-delete">Verwijder</button>
        <button class="cm-resolve">${c.resolved ? 'Heropen' : 'Opgelost'}</button>
      </div>
    `;
    setTimeout(() => {
      const rect = popup.getBoundingClientRect();
      if (rect.right > window.innerWidth - 20) popup.style.left = (c.x - 336) + 'px';
      if (rect.bottom > window.innerHeight - 20) popup.style.top = (c.y - rect.height) + 'px';
    }, 0);
    popup.querySelector('.cm-popup-close').onclick = () => popup.remove();
    popup.querySelector('.cm-delete').onclick = () => { deleteComment(c.id); popup.remove(); };
    popup.querySelector('.cm-resolve').onclick = () => { resolveComment(c.id); popup.remove(); };
    document.body.appendChild(popup);
  }

  function closeAllPopups() { document.querySelectorAll('.cm-popup').forEach(p => p.remove()); }

  function saveNew(popup, x, y) {
    const text = popup.querySelector('textarea').value.trim();
    if (!text) return;
    const priority = popup.querySelector('.cm-chip[data-group="priority"].selected')?.dataset.val || 'should';
    const category = popup.querySelector('.cm-chip[data-group="category"].selected')?.dataset.val || 'ux';
    comments.push({ id: nextId++, text, priority, category, x, y, page: getCurrentPage(), date: new Date().toLocaleDateString('nl-BE'), resolved: false });
    save();
    popup.remove();
  }

  function deleteComment(id) {
    comments = comments.filter(c => c.id !== id);
    save();
    if (panel.classList.contains('open')) renderPanel();
  }

  function resolveComment(id) {
    const c = comments.find(c => c.id === id);
    if (c) c.resolved = !c.resolved;
    save();
    if (panel.classList.contains('open')) renderPanel();
  }

  function togglePanel() {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) renderPanel();
  }

  function renderPanel() {
    const allOpen = comments.filter(c => !c.resolved).length;
    const catCounts = {};
    Object.keys(CATEGORIES).forEach(k => { catCounts[k] = comments.filter(c => c.category === k && !c.resolved).length; });

    let filtered = comments;
    if (panelFilter !== 'all') filtered = filtered.filter(c => c.category === panelFilter);
    if (panelPriorityFilter === 'open') filtered = filtered.filter(c => !c.resolved);
    else if (panelPriorityFilter !== 'all') filtered = filtered.filter(c => c.priority === panelPriorityFilter && !c.resolved);
    if (panelSearch) { const q = panelSearch.toLowerCase(); filtered = filtered.filter(c => (c.text || '').toLowerCase().includes(q)); }

    // Group by page
    const groups = {};
    filtered.forEach(c => {
      const pg = c.page || 'home';
      if (!groups[pg]) groups[pg] = [];
      groups[pg].push(c);
    });

    const pageOrder = ['home', 'approach', 'studio', 'insights', 'contact', 'opvang', 'toekan', 'kempen'];
    const allPages = [...new Set([...pageOrder, ...Object.keys(groups)])];

    let itemsHtml = '';
    allPages.forEach(pg => {
      const pgComments = groups[pg];
      if (!pgComments || !pgComments.length) return;
      const pageName = SCREEN_NAMES[pg] || pg;
      itemsHtml += `<div class="cm-panel-page-group"><div class="cm-panel-page-header">${escapeHtml(pageName)}</div>`;
      pgComments.forEach(c => {
        const cat = CATEGORIES[c.category] || CATEGORIES.ux;
        const pri = PRIORITIES[c.priority] || PRIORITIES.should;
        itemsHtml += `
          <div class="cm-panel-item ${c.resolved ? 'resolved' : ''}" data-comment-id="${c.id}">
            <div class="cm-panel-item-header">
              <span class="cm-panel-item-id">#${c.id}</span>
              <span class="cm-tag-pill" style="background:${cat.color}15;color:${cat.color};font-size:10px;padding:1px 8px">${cat.label}</span>
              <span class="cm-tag-pill" style="background:${pri.color}15;color:${pri.color};font-size:10px;padding:1px 8px">${pri.label}</span>
            </div>
            <div class="cm-panel-item-text">${escapeHtml(c.text)}</div>
            <div class="cm-panel-item-meta">${c.date}${c.resolved ? ' · opgelost' : ''}</div>
          </div>`;
      });
      itemsHtml += '</div>';
    });
    if (!itemsHtml) itemsHtml = '<div class="cm-panel-empty">Geen opmerkingen gevonden.</div>';

    panel.innerHTML = `
      <div class="cm-panel-header">
        <span class="cm-panel-title">Opmerkingen</span>
        <button class="cm-panel-close">${ICONS.close}</button>
      </div>
      <div class="cm-panel-search">
        <div class="cm-panel-search-wrap">
          ${ICONS.search}
          <input type="text" placeholder="Zoeken..." value="${escapeHtml(panelSearch)}" />
        </div>
      </div>
      <div class="cm-panel-filters">
        <div class="cm-panel-filter-row">
          <button class="cm-filter-chip ${panelFilter === 'all' ? 'active' : ''}" data-filter="all">Alle <span class="cm-filter-count">${allOpen}</span></button>
          ${Object.entries(CATEGORIES).map(([k, v]) =>
            `<button class="cm-filter-chip ${panelFilter === k ? 'active' : ''}" data-filter="${k}">${v.label} <span class="cm-filter-count">${catCounts[k]}</span></button>`
          ).join('')}
        </div>
        <div class="cm-panel-filter-row">
          ${['all','open','must','should','nice'].map(p =>
            `<button class="cm-filter-chip ${panelPriorityFilter === p ? 'active' : ''}" data-pfilter="${p}">${p === 'all' ? 'Alle prioriteiten' : p === 'open' ? 'Open' : PRIORITIES[p]?.label || p}</button>`
          ).join('')}
        </div>
      </div>
      <div class="cm-panel-body">${itemsHtml}</div>
      <div class="cm-panel-footer">
        <button class="cm-export-btn">${ICONS.download} Exporteer als Markdown</button>
        <div class="cm-footer-row">
          <button class="cm-btn-secondary cm-clear-resolved-btn">Verwijder opgeloste</button>
        </div>
      </div>
    `;

    panel.querySelector('.cm-panel-close').onclick = togglePanel;
    panel.querySelector('.cm-panel-search input').oninput = (e) => {
      panelSearch = e.target.value;
      renderPanel();
      const inp = panel.querySelector('.cm-panel-search input');
      if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
    };
    panel.querySelectorAll('.cm-filter-chip[data-filter]').forEach(b => b.onclick = () => { panelFilter = b.dataset.filter; renderPanel(); });
    panel.querySelectorAll('.cm-filter-chip[data-pfilter]').forEach(b => b.onclick = () => { panelPriorityFilter = b.dataset.pfilter; renderPanel(); });
    panel.querySelectorAll('.cm-panel-item').forEach(item => {
      item.onclick = () => {
        const id = parseInt(item.dataset.commentId);
        const c = comments.find(c => c.id === id);
        if (!c) return;
        // Navigate to correct page first
        const currentPage = getCurrentPage();
        if (c.page && c.page !== currentPage) {
          localStorage.setItem('gt-page-v3', c.page);
          window.location.reload();
          return;
        }
        window.scrollTo({ top: c.y - 200, behavior: 'smooth' });
        showExistingPopup(c);
      };
    });
    panel.querySelector('.cm-export-btn').onclick = exportMD;
    panel.querySelector('.cm-clear-resolved-btn').onclick = () => {
      if (!confirm('Verwijder alle opgeloste opmerkingen?')) return;
      comments = comments.filter(c => !c.resolved);
      save();
      renderPanel();
    };
  }

  function togglePins() {
    pinsVisible = !pinsVisible;
    toolbar.querySelector('.cm-tbtn-eye').innerHTML = pinsVisible ? ICONS.eye : ICONS.eyeOff;
    renderPins();
    closeAllPopups();
  }

  function collapseToolbar() {
    toolbar.classList.toggle('collapsed');
    toolbar.querySelector('.cm-btn-collapse').innerHTML = toolbar.classList.contains('collapsed') ? ICONS.chevronLeft : ICONS.chevronRight;
  }

  function exportMD() {
    if (comments.length === 0) { alert('Geen opmerkingen om te exporteren.'); return; }
    const pageOrder = ['home', 'approach', 'studio', 'insights', 'contact', 'opvang', 'toekan', 'kempen'];
    const groups = {};
    comments.forEach(c => {
      const pg = c.page || 'home';
      if (!groups[pg]) groups[pg] = [];
      groups[pg].push(c);
    });

    let md = `# Gather Website — Feedback\nGegenereerd op ${new Date().toLocaleDateString('nl-BE')}\n\n`;
    [...new Set([...pageOrder, ...Object.keys(groups)])].forEach(pg => {
      const pcs = (groups[pg] || []).filter(c => !c.resolved);
      if (!pcs.length) return;
      md += `## ${SCREEN_NAMES[pg] || pg}\n\n`;
      Object.entries(CATEGORIES).forEach(([catKey, catDef]) => {
        const cc = pcs.filter(c => (c.category || 'ux') === catKey);
        if (!cc.length) return;
        md += `### ${catDef.label}\n\n`;
        cc.sort((a, b) => ['must','should','nice'].indexOf(a.priority) - ['must','should','nice'].indexOf(b.priority));
        cc.forEach(c => { md += `- [ ] **#${c.id}** [${(PRIORITIES[c.priority] || PRIORITIES.should).label}] ${c.text}\n`; });
        md += '\n';
      });
    });

    const resolved = comments.filter(c => c.resolved);
    if (resolved.length) {
      md += `## Opgelost (${resolved.length})\n\n`;
      resolved.forEach(c => { md += `- [x] **#${c.id}** [${SCREEN_NAMES[c.page] || c.page}] ${c.text}\n`; });
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = 'gather-feedback.md';
    a.click();
  }

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggle(); }
    if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); togglePins(); }
    if (e.key === 'Escape') {
      if (commentMode) toggle();
      else if (document.querySelector('.cm-popup')) closeAllPopups();
      else if (panel.classList.contains('open')) togglePanel();
    }
  });

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  load();
})();
