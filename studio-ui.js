/* Presentation-only enhancements. Project state and engine stay in index.html. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  const focusButton = document.createElement('button');
  focusButton.id = 'btnCodeFocus';
  focusButton.className = 'btn mobile-focus';
  focusButton.type = 'button';
  document.querySelector('.code-toolbar').appendChild(focusButton);
  function setFocusMode(active) {
    document.body.classList.toggle('code-focus', active);
    focusButton.textContent = active ? 'Вернуть панели' : 'Только код';
    focusButton.setAttribute('aria-pressed', String(active));
    focusButton.setAttribute('aria-label', active ? 'Вернуть панели' : 'Только код');
    focusButton.title = active ? 'Вернуть панели' : 'Только код';
  }
  setFocusMode(false);
  focusButton.addEventListener('click', () => setFocusMode(!document.body.classList.contains('code-focus')));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setFocusMode(false); });

  const tabs = Array.from(document.querySelectorAll('.tab-btn'));
  const names = {game:'Игра',code:'Код',scene:'Сцена',files:'Файлы',help:'Справка'};
  document.querySelector('.tabs').setAttribute('role', 'tablist');
  document.querySelector('.tabs').setAttribute('aria-label', 'Разделы студии');
  tabs.forEach((tab, i) => {
    tab.textContent = names[tab.dataset.tab];
    tab.id = 'nav-' + tab.dataset.tab;
    const panel = $('tab-' + tab.dataset.tab);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].click();
      tabs[next].focus();
    });
  });
  function syncPage() {
    tabs.forEach(tab => {
      const selected = tab.classList.contains('active');
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected) {
        document.body.dataset.page = tab.dataset.tab;
        if (tab.dataset.tab !== 'code') setFocusMode(false);
      }
    });
  }
  const observer = new MutationObserver(syncPage);
  tabs.forEach(tab => observer.observe(tab, {attributes:true, attributeFilter:['class']}));
  syncPage();

  const labels = {
    btnAI:'ИИ-агент',btnRun:'Запустить игру',btnStop:'Остановить игру',
    btnSheet:'Шпаргалка',btnFind:'Найти и заменить',btnAiCode:'ИИ-агент',
    btnRunCode:'Запустить игру',btnExportPxl:'Экспорт .mrr',btnImportPxl:'Импорт .mrr',
    btnUndo:'Отменить',btnRedo:'Повторить',btnSaveNow:'Сохранить',btnDebug:'Отладка',
    btnColorPicker:'Цвет',btnNewPxl:'＋ Создать файл .mrr',btnImportPng:'＋ Добавить PNG',
    btnExportGameHtml:'Собрать HTML',btnPublishGithub:'Опубликовать',
    btnExportProject:'Экспорт JSON',btnExportZip:'Скачать ZIP',btnImportProject:'Импорт JSON',
    btnSaveProjectLocal:'Сохранить в браузере',btnProjectHistory:'История версий',
    btnCheckResources:'Проверить ресурсы',acClose:'Закрыть подсказки'
  };
  Object.entries(labels).forEach(([id, text]) => {
    const el = $(id);
    if (!el) return;
    el.setAttribute('aria-label', text);
    if (!['btnAI','btnRun','btnStop'].includes(id)) el.textContent = text;
  });
  // Restore file context without bringing the toolbar actions out of their menu.
  const toolbar = document.querySelector('.code-toolbar');
  const fileContext = document.createElement('div');
  fileContext.className = 'editor-file-context';
  toolbar.prepend(fileContext);
  toolbar.querySelectorAll(':scope > .file-chip, :scope > .chip').forEach(chip => fileContext.appendChild(chip));

  const more = document.createElement('details');
  more.className = 'editor-tools';
  more.innerHTML = '<summary>Инструменты</summary><div class="editor-tools-menu"></div>';
  const menu = more.querySelector('div');
  // Move the original controls so their engine handlers and state are preserved.
  document.querySelectorAll('.code-toolbar > button').forEach(button => menu.appendChild(button));
  menu.appendChild(document.querySelector('.code-toolbar > .color-tool'));
  document.querySelector('.code-toolbar').appendChild(more);
  menu.addEventListener('click', event => {
    if (event.target.closest('button')) more.open = false;
  });
  document.addEventListener('click', event => {
    if (!more.contains(event.target)) more.open = false;
  });
  const mq = window.matchMedia('(max-width:640px)');
  $('examplesSelect').setAttribute('aria-label', 'Примеры');
  more.querySelector('summary').setAttribute('aria-label', 'Инструменты редактора');
  more.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      more.open = false;
      more.querySelector('summary').focus();
    }
  });
  function headerLabels() {
    if (!mq.matches) setFocusMode(false);
    ['btnExportPxl','btnImportPxl','btnDebug','btnColorPicker'].forEach(id => { $(id).textContent = labels[id]; });
    $('btnAI').textContent = mq.matches ? 'ИИ' : 'ИИ-агент';
    $('btnRun').textContent = mq.matches ? '▶' : '▶ Запуск';
    $('btnStop').textContent = mq.matches ? '■' : 'Стоп';
  }
  // Run after the existing mobile labels handler on resize.
  mq.addEventListener('change', headerLabels);
  headerLabels();
  $('codeInput').setAttribute('aria-label', 'Код текущего файла MrrCode');
  $('gameCanvas').setAttribute('aria-label', 'Игровое поле 800 на 450');
  $('sceneCanvas').setAttribute('aria-label', 'Холст редактора сцены');

  const actions = document.createElement('div');
  actions.className = 'project-actions';
  const groups = [
    ['Сборка и публикация', ['btnExportGameHtml','btnPublishGithub']],
    ['Резервная копия', ['btnExportZip','btnExportProject','btnImportProject']],
    ['Инструменты проекта', ['btnSaveProjectLocal','btnProjectHistory','btnCheckResources']]
  ];
  const oldActions = $('btnExportGameHtml').parentElement;
  oldActions.before(actions);
  groups.forEach(([title, ids]) => {
    const group = document.createElement('div');
    group.className = 'action-group';
    const label = document.createElement('h4');
    label.textContent = title;
    const row = document.createElement('div');
    row.className = 'row-btns';
    ids.forEach(id => row.appendChild($(id)));
    group.append(label, row);
    actions.appendChild(group);
  });
  oldActions.remove();
  const info = document.querySelector('.files-info');
  info.lastElementChild.textContent = 'Автосохранение в этом браузере — каждые 15 секунд. Для переноса на другое устройство или резервной копии скачай ZIP или JSON.';
  // Preserve the existing controls and handlers when folding secondary content.
  function mobileFold(element, title) {
    const fold = document.createElement('details');
    fold.className = 'mobile-fold';
    const summary = document.createElement('summary');
    summary.textContent = title;
    const content = document.createElement('div');
    content.className = 'fold-content';
    element.before(fold);
    content.appendChild(element);
    fold.append(summary, content);
    const syncFold = () => { fold.open = !mq.matches; };
    mq.addEventListener('change', syncFold);
    syncFold();
  }
  mobileFold(actions, 'Действия с проектом');
  mobileFold(info, 'Как это работает');
  const sprites = $('spriteList');
  function simplifyEmptyState() {
    const note = sprites.querySelector('.empty-note');
    if (note) note.textContent = 'Пока нет спрайтов. Добавь PNG: имя файла станет именем ресурса для sprite("имя", …).';
  }
  new MutationObserver(simplifyEmptyState).observe(sprites, {childList:true});
  simplifyEmptyState();
})();
