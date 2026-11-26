// Search and article navigation. License: personal-site-LICENSE.txt.
(async () => {
  const i18n = await window.HKUST_I18N.ready;
  const { t } = i18n;
  // The saved theme is applied before CSS in theme-init.js, not during first paint.
  const root = document.documentElement;
  const siteName = document.querySelector('.footer-brand-name')?.textContent.trim();
  const sourceUrl = document.querySelector('.footer-github')?.href;
  if (siteName && sourceUrl) {
    const styles = getComputedStyle(root);
    const accent = styles.getPropertyValue('--accent').trim();
    console.info(`%c ${siteName} %c ${sourceUrl}`,
      `background:${accent};color:${styles.getPropertyValue('--bg').trim()};font-weight:700;padding:5px 8px;border-radius:6px 0 0 6px`,
      `background:${styles.getPropertyValue('--soft').trim()};color:${accent};padding:5px 8px;border-radius:0 6px 6px 0`);
  }
  // Three-way system / light / dark cycle.
  const modes = ['system', 'light', 'dark'];
  const themeButton = document.querySelector('#theme-toggle');
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const syncThemeControls = () => {
    const mode = root.dataset.theme || 'system';
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    const labels = {system:'跟随系统',light:'浅色模式',dark:'深色模式'};
    themeButton.dataset.mode = mode;
    themeButton.setAttribute('aria-label', t('当前{current}，切换到{next}', {current: labels[mode], next: labels[next]}));
    themeButton.title = t('{current} · 点击切换到{next}', {current: labels[mode], next: labels[next]});
    i18n.text(themeButton.querySelector('#theme-label'), labels[mode]);
  };
  themeButton?.addEventListener('click', () => {
    const mode = root.dataset.theme || 'system';
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    if (next === 'system') delete root.dataset.theme;
    else root.dataset.theme = next;
    try { localStorage.setItem('hkust-theme', next); } catch {}
    syncThemeControls();
  });
  systemTheme.addEventListener('change', syncThemeControls);
  window.addEventListener('storage', event => {
    if (event.key !== 'hkust-theme') return;
    if (event.newValue === 'light' || event.newValue === 'dark') root.dataset.theme = event.newValue;
    else delete root.dataset.theme;
    syncThemeControls();
  });
  window.addEventListener('pageshow', syncThemeControls);
  syncThemeControls();
  addEventListener('hkust:language', () => { syncThemeControls(); setMenu(isOpen()); });
  // Article directory with native details fallback.
  const initArticleToc = article => {
    const contents = article.querySelector('details.article-toc');
    if (!contents) return;
    const panel = contents.querySelector('.article-toc-panel');
    const summary = contents.querySelector('summary');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    contents.classList.add('is-enhanced');
    const list = contents.querySelector('ul');
    const side = document.createElement('nav');
    side.className = 'article-toc-side';
    side.setAttribute('aria-label', summary.textContent);
    side.setAttribute('data-pagefind-ignore', '');
    const sideTitle = document.createElement('span');
    sideTitle.className = 'toc-title';
    i18n.text(sideTitle, '本页目录');
    side.append(sideTitle, list.cloneNode(true));
    article.append(side);
    const sideList = side.querySelector('ul');
    const syncScrollFade = () => {
      list.classList.toggle('can-scroll-up', list.scrollTop > 2);
      list.classList.toggle('can-scroll-down', list.scrollHeight - list.clientHeight - list.scrollTop > 2);
      sideList.classList.toggle('can-scroll-up', sideList.scrollTop > 2);
      sideList.classList.toggle('can-scroll-down', sideList.scrollHeight - sideList.clientHeight - sideList.scrollTop > 2);
    };
    list.addEventListener('scroll', syncScrollFade, {passive:true});
    new ResizeObserver(syncScrollFade).observe(list);
    sideList.addEventListener('scroll', syncScrollFade, {passive:true});
    new ResizeObserver(syncScrollFade).observe(sideList);
    let closing = false;
    let navigating = false;
    let pendingTarget = null;
    summary.addEventListener('click', event => {
      event.preventDefault();
      navigating = false;
      if (reducedMotion.matches) {
        contents.open = !contents.open;
        contents.classList.toggle('is-open', contents.open);
        return;
      }
      if (closing) closing = false;
      if (contents.open && contents.classList.contains('is-open')) {
        contents.classList.remove('is-open');
        closing = true;
      } else {
        contents.open = true;
        requestAnimationFrame(() => contents.classList.add('is-open'));
      }
    });
    panel.addEventListener('transitionend', event => {
      if (event.target !== panel || event.propertyName !== 'grid-template-rows') return;
      if (closing) {
        contents.open = false;
        closing = false;
      } else if (pendingTarget) {
        const target = pendingTarget;
        pendingTarget = null;
        scrollToTarget(target);
      } else if (contents.open && !reducedMotion.matches && !navigating) {
        const overflow = contents.getBoundingClientRect().bottom - (innerHeight - 24);
        if (overflow > 0) scrollBy({top: overflow, behavior: 'smooth'});
      }
    });
    const links = [...contents.querySelectorAll('a[href^="#"]'), ...side.querySelectorAll('a[href^="#"]')];
    const headings = [...new Set(links.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1)))))];
    let clickedTarget = null;
    const scrollToTarget = target => {
      const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const top = Math.max(0, Math.min(target.getBoundingClientRect().top + scrollY - offset, document.documentElement.scrollHeight - innerHeight));
      clickedTarget = {target, top, settled: false};
      scrollTo({top, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
      update();
    };
    links.forEach(link => link.addEventListener('click', event => {
      const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (!target) return;
      event.preventDefault();
      navigating = true;
      history.pushState(null, '', link.hash);
      if (panel.getAnimations().some(animation => animation.playState === 'running')) {
        pendingTarget = target;
      } else {
        scrollToTarget(target);
      }
    }));
    const update = () => {
      const probe = scrollY + (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + 28;
      let active = -1;
      headings.forEach((heading, i) => {
        if (heading && heading.getBoundingClientRect().top + scrollY <= probe) active = i;
      });
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 6) active = headings.length - 1;
      if (clickedTarget) {
        if (Math.abs(scrollY - clickedTarget.top) <= 2) clickedTarget.settled = true;
        else if (clickedTarget.settled) clickedTarget = null;
        if (clickedTarget) active = headings.indexOf(clickedTarget.target);
      }
      links.forEach(link => {
        const selected = document.getElementById(decodeURIComponent(link.hash.slice(1))) === headings[active];
        link.classList.toggle('is-active', selected);
        if (selected) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      const selected = side.querySelector('.is-active');
      if (selected && sideList.scrollHeight > sideList.clientHeight) {
        const item = selected.getBoundingClientRect(), bounds = sideList.getBoundingClientRect();
        if (item.top < bounds.top || item.bottom > bounds.bottom) sideList.scrollTop += item.top - bounds.top - (sideList.clientHeight - item.height) / 2;
      }
    };
    const releaseTarget = () => { clickedTarget = null; update(); };
    window.addEventListener('wheel', releaseTarget, {passive:true});
    window.addEventListener('touchstart', releaseTarget, {passive:true});
    document.addEventListener('keydown', event => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) releaseTarget();
    });
    let pending = false;
    window.addEventListener('scroll', () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; update(); });
    }, {passive:true});
    window.addEventListener('resize', releaseTarget, {passive:true});
    window.addEventListener('hashchange', () => {
      const target = headings.find(heading => heading?.id === decodeURIComponent(location.hash.slice(1)));
      clickedTarget = target ? {target, top: scrollY, settled: true} : null;
      update();
    });
    update();
  };
  window.initArticleToc = initArticleToc;
  document.querySelectorAll('.article-page:not(#preview-text)').forEach(initArticleToc);

  const sidebar = document.querySelector('#sidebar');
  const toggle = document.querySelector('#menu-toggle');
  const shell = document.querySelector('.shell');
  const mobile = matchMedia('(max-width: 900px)');
  const languageToggle = document.querySelector('.language-toggle');
  const placeLanguageToggle = () => {
    if (mobile.matches) toggle.before(languageToggle);
    else document.querySelector('.sidebar-bottom').prepend(languageToggle);
  };
  placeLanguageToggle();
  mobile.addEventListener('change', placeLanguageToggle);
  const isOpen = () => mobile.matches && shell.classList.contains('menu-open');
  const setMenu = (open, restoreFocus = false) => {
    open = Boolean(open && mobile.matches);
    shell.classList.toggle('menu-open', open);
    sidebar.inert = mobile.matches && !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', t(open ? '关闭导航' : '打开导航'));
    if (restoreFocus && mobile.matches) toggle.focus();
  };
  // Navigation has its own lifecycle: dismiss the outgoing menu synchronously,
  // without replaying its closing animation over the old or restored page.
  const resetMenu = () => {
    shell.classList.add('nav-reset');
    setMenu(false);
  };
  const finishReset = () => requestAnimationFrame(() => shell.classList.remove('nav-reset'));
  toggle.addEventListener('click', () => {
    shell.classList.remove('nav-reset');
    setMenu(!isOpen());
  });
  document.addEventListener('click', event => {
    if (isOpen() && !sidebar.contains(event.target) && !toggle.contains(event.target)) setMenu(false);
  });
  sidebar.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!isOpen() || !link || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href);
    if (destination.origin !== location.origin) return;
    resetMenu();
    const sameDocument = destination.pathname.replace(/index\.html$/, '') ===
      location.pathname.replace(/index\.html$/, '');
    // In-page links finish immediately; regular navigation retains the reset
    // state until pagehide, so no outgoing menu panel can flash.
    if (sameDocument) finishReset();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen()) setMenu(false, true);
  });
  mobile.addEventListener('change', () => setMenu(false));
  window.addEventListener('pagehide', resetMenu);
  window.addEventListener('pageshow', () => {
    resetMenu();
    finishReset();
  });
  setMenu(false);

  document.addEventListener('click', async event => {
    const button = event.target.closest('button[data-copy]');
    if (!button) return;
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      i18n.text(button, '已复制');
    } catch { i18n.text(button, '复制失败'); }
  });
  const archive = document.querySelector('#archive-section');
  const nav = document.querySelector('#category-nav');
  const attributes = ['campus', 'year', 'degree'].map(name => document.querySelector('#' + name + '-filter')).filter(Boolean);
  const attributeOptions = new Map(attributes.map(control => [control, [...control.options].map(option => option.cloneNode(true))]));
  if (archive) window.HKUSTSelect.enhance(archive);

  const cards = [...(archive?.querySelectorAll('.article-item') || [])];
  const siteUrl = new URL('../../', document.querySelector('script[src*="assets/js/site.js"]').src);
  const siteRoot = siteUrl.pathname;
  const indexedPath = path => path.startsWith(siteRoot) ? '/' + path.slice(siteRoot.length) : path;
  const cardByPath = new Map(cards.map(card => [indexedPath(card.querySelector('h3 a').pathname), card]));
  const returnKey = 'hkust-article-return';
  let articleReturn = history.state?.articleReturn;
  try { articleReturn ||= JSON.parse(sessionStorage.getItem(returnKey)); } catch {}
  const backLink = document.querySelector('.article-back');
  if (backLink && articleReturn?.article === location.pathname) {
    history.replaceState({...history.state, articleReturn}, '');
    try { sessionStorage.removeItem(returnKey); } catch {}
    backLink.href = articleReturn.url;
    i18n.text(backLink.querySelector('[data-i18n]'), '返回{category}', {category: articleReturn.category});
    backLink.addEventListener('click', () => {
      const destination = new URL(articleReturn.url);
      destination.searchParams.set('lang', i18n.language());
      backLink.href = articleReturn.url = destination.href;
      articleReturn.restore = true;
      try { sessionStorage.setItem(returnKey, JSON.stringify(articleReturn)); } catch {}
    });
  }
  if (archive) document.addEventListener('click', event => {
    const link = event.target.closest('.article-item a, #search-results a');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destination = new URL(link.href);
    if (destination.origin !== location.origin || !destination.pathname.startsWith(siteRoot + 'articles/')) return;
    const current = nav.querySelector('[data-category][aria-current=page]');
    const context = {article: destination.pathname, url: location.href, top: scrollY,
      category: current?.dataset.categoryLabel || '全部经历'};
    try { sessionStorage.setItem(returnKey, JSON.stringify(context)); } catch {}
  });
  let cardRequest;
  const loadCards = () => archive ? Promise.resolve() : cardRequest ??= fetch(siteUrl).then(response => {
    if (!response.ok) throw new Error('Article catalogue unavailable');
    return response.text();
  }).then(source => {
    const home = new DOMParser().parseFromString(source, 'text/html');
    home.querySelectorAll('.article-item').forEach(card => {
      const link = card.querySelector('h3 a');
      link.href = new URL(link.getAttribute('href'), siteUrl).href;
      cardByPath.set(indexedPath(link.pathname), card);
    });
  });
  const highlight = (element, value, query) => {
    const terms = [...new Set(query.split(/\s+/))].sort((a, b) => b.length - a.length);
    const pattern = new RegExp(terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'giu');
    let end = 0;
    for (const match of value.matchAll(pattern)) {
      element.append(value.slice(end, match.index));
      const mark = document.createElement('mark');
      mark.textContent = match[0];
      element.append(mark);
      end = match.index + match[0].length;
    }
    element.append(value.slice(end));
  };
  const empty = document.querySelector('#empty-state');
  const count = document.querySelector('#results-count');
  let activeCategory = 'all';
  const renderFilters = () => {
    let visibleCount = 0;
    for (const card of cards) {
      const visible = (activeCategory === 'all' || card.dataset.category === activeCategory) &&
        attributes.every(control => control.value === 'all' || card.dataset[control.id.replace('-filter', '')] === control.value);
      card.hidden = !visible;
      if (visible) visibleCount++;
    }
    count.textContent = t('{count} 篇经历', {count: visibleCount});
    empty.hidden = visibleCount > 0;
  };
  const dialog = document.querySelector('#search-dialog');
  const search = document.querySelector('#search');
  const searchOpen = document.querySelector('.search-open');
  if (!searchOpen) return;
  const searchDesktopParent = searchOpen.parentElement;
  const syncSearchPlacement = () => {
    if (mobile.matches) toggle.before(searchOpen);
    else searchDesktopParent.append(searchOpen);
  };
  syncSearchPlacement();
  mobile.addEventListener('change', syncSearchPlacement);
  const results = document.querySelector('#search-results');
  const scrollHint = document.createElement('div');
  scrollHint.className = 'scroll-hint';
  scrollHint.setAttribute('aria-hidden', 'true');
  dialog.append(scrollHint);
  const syncScrollHint = () => {
    scrollHint.classList.toggle('is-visible', results.scrollHeight - results.clientHeight - results.scrollTop > 2);
  };
  results.addEventListener('scroll', syncScrollHint, {passive:true});
  new ResizeObserver(syncScrollHint).observe(results);
  let engine;
  let requestId = 0;
  const loadSearch = () => engine ??= import('/pagefind/pagefind.js').then(async pagefind => {
    await pagefind.options({ excerptLength: 18, excerptEllipsis: '…' });
    return pagefind;
  });
  dialog.tabIndex = -1;
  const positionSearch = () => {
    if (mobile.matches) {
      const viewport = window.visualViewport;
      dialog.style.setProperty('--search-viewport-height', Math.round(viewport?.height || innerHeight) + 'px');
      dialog.style.top = (viewport?.offsetTop || 0) + 'px';
      return;
    }
    dialog.style.removeProperty('--search-viewport-height');
    dialog.style.removeProperty('top');
  };
  const openSearch = () => {
    if (archive?.hidden) return;
    positionSearch();
    dialog.showModal();
    search.focus({preventScroll:true});
    requestAnimationFrame(positionSearch);
    syncScrollHint();
  };
  searchOpen.addEventListener('click', openSearch);
  window.addEventListener('resize', () => { if (dialog.open) positionSearch(); });
  window.visualViewport?.addEventListener('resize', () => { if (dialog.open) positionSearch(); });
  window.visualViewport?.addEventListener('scroll', () => { if (dialog.open) positionSearch(); });
  dialog.addEventListener('close', () => {
    ++requestId;
    search.value = '';
    delete results.dataset.i18n;
    results.replaceChildren();
    syncScrollHint();
    if (!archive?.hidden) searchOpen.focus({preventScroll:true});
  });
  dialog.querySelector('.search-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) dialog.close(); else openSearch();
    } else if (event.key === 'Escape' && dialog.open) {
      event.preventDefault();
      dialog.close();
    }
  });
  search.addEventListener('input', async () => {
    const query = search.value.trim();
    const id = ++requestId;
    delete results.dataset.i18n;
    results.replaceChildren();
    results.scrollTop = 0;
    syncScrollHint();
    if (!query) return;
    i18n.text(results, '正在搜索…');
    try {
      await loadCards();
      if (!cardByPath.size) {
        i18n.text(results, '没有找到匹配内容');
        return;
      }
      const pagefind = await loadSearch();
      const found = await pagefind.debouncedSearch(query);
      if (id !== requestId) return;
      const pages = await Promise.all((found?.results || []).map(item => item.data()));
      if (id !== requestId) return;
      const normalize = value => value.normalize('NFKC').toLocaleLowerCase();
      const titleQuery = normalize(query);
      const exactCjkPhrase = /^[\p{Script=Han}]{2,}$/u.test(query);
      const bodyMatches = new Map(pages.map((page, rank) => [indexedPath(new URL(page.url, location.href).pathname), {page, rank}]));
      const matches = [...cardByPath].flatMap(([path, card]) => {
        if (card.hidden) return [];
        const title = card.querySelector('h3 a').textContent;
        const byline = card.querySelector('.article-author').textContent + ' · ' + card.querySelector('.article-meta').textContent;
        const titleMatch = normalize(title).includes(titleQuery);
        const bylineMatch = normalize(byline).includes(titleQuery);
        const body = bodyMatches.get(path);
        if (!titleMatch && !bylineMatch && !body) return [];
        if (exactCjkPhrase && !title.includes(query) && !byline.includes(query) && !(body?.page.content || '').includes(query)) return [];
        return [{card, title, byline, titleMatch, bylineMatch, body}];
      });
      matches.sort((a, b) => Number(b.titleMatch) - Number(a.titleMatch) ||
        Number(b.bylineMatch) - Number(a.bylineMatch) ||
        (a.body?.rank ?? pages.length) - (b.body?.rank ?? pages.length));
      const list = document.createElement('ul');
      for (const match of matches) {
        const row = document.createElement('li');
        const link = document.createElement('a');
        link.href = match.card.querySelector('h3 a').href;
        const title = document.createElement('span');
        title.className = 'search-title';
        highlight(title, match.title, query);
        link.append(title);
        for (const selector of ['.article-author', '.article-meta']) {
          const metadata = document.createElement('span');
          metadata.className = 'search-match';
          metadata.textContent = match.card.querySelector(selector).textContent;
          link.append(metadata);
        }
        const page = match.body?.page;
        const position = exactCjkPhrase ? (page?.content || '').indexOf(query) : -1;
        if (match.bylineMatch || position >= 0 || page?.excerpt?.includes('<mark>')) {
          const note = document.createElement('span');
          note.className = 'search-match';
          if (match.bylineMatch) {
            highlight(note, match.byline, query);
          } else if (position >= 0) {
            highlight(note, page.content.slice(Math.max(0, position - 30), position + query.length + 50), query);
          } else note.innerHTML = page.excerpt;
          link.append(note);
        }
        row.append(link);
        list.append(row);
      }
      delete results.dataset.i18n;
      results.replaceChildren();
      if (list.childElementCount) {
        const summary = document.createElement('p');
        summary.className = 'search-summary';
        i18n.text(summary, '找到 {count} 篇经历', {count: list.childElementCount});
        results.append(summary, list);
      }
      else i18n.text(results, '没有找到匹配内容');
      syncScrollHint();
    } catch (error) {
      if (id !== requestId) return;
      i18n.text(results, '全文搜索暂不可用，请刷新页面后重试。');
      console.error('Pagefind search failed', error);
    }
  });
  if (!archive) return;
  const renderArchiveHeading = current => {
    document.querySelector('#stories-heading').textContent = current ? t('{category}经历', {category: current.dataset.categoryLabel}) : t('全部经历');
    document.querySelector('#category-intro').textContent = current ? t('{description}，阅读同学的经验分享。', {description: current.dataset.categoryDescription}) : t('按方向浏览同学分享的升学与职业经验。');
  };
  const renderView = () => {
    if (dialog.open) dialog.close();
    const params = new URLSearchParams(location.search);
    const selected = params.get('category');
    const isHome = !selected && params.get('view') !== 'all' && !attributes.some(control => params.has(control.id.replace('-filter', '')));
    document.documentElement.dataset.view = isHome ? 'home' : 'archive';
    document.querySelector('.page').classList.toggle('is-home', isHome);
    document.querySelector('#home-intro').hidden = !isHome;
    document.querySelector('#archive-intro').hidden = isHome;
    archive.hidden = isHome;
    searchOpen.hidden = isHome;
    const current = [...nav.querySelectorAll('[data-category]')].find(link => link.dataset.category === selected && selected !== 'all');
    activeCategory = current?.dataset.category || 'all';
    nav.querySelectorAll('[aria-current]').forEach(link => link.removeAttribute('aria-current'));
    const active = isHome ? nav.querySelector('a:not([data-category])') : current || nav.querySelector('[data-category="all"]');
    active?.setAttribute('aria-current', 'page');
    renderArchiveHeading(current);
    for (const control of attributes) {
      const key = control.id.replace('-filter', '');
      const available = new Set(cards.filter(card => activeCategory === 'all' || card.dataset.category === activeCategory).map(card => card.dataset[key]));
      control.replaceChildren(...attributeOptions.get(control)
        .filter(option => option.value === 'all' || available.has(option.value))
        .map(option => {
          const copy = option.cloneNode(true);
          copy.textContent = t(copy.dataset.i18n || copy.textContent);
          return copy;
        }));
      const value = params.get(key) || 'all';
      control.value = [...control.options].some(option => option.value === value) ? value : 'all';
      if (control.value === 'all') params.delete(key);
      control.dispatchEvent(new Event('optionschange'));
    }
    const normalized = new URL(location.href);
    normalized.search = params.toString();
    if (normalized.href !== location.href) history.replaceState(null, '', normalized);
    attributes.forEach(control => control.dispatchEvent(new Event('selectsync')));
    renderFilters();
  };
  const saveFilters = () => {
    const url = new URL(location.href);
    if (!url.searchParams.has('category')) url.searchParams.set('view', 'all');
    for (const control of attributes) {
      const key = control.id.replace('-filter', '');
      if (control.value === 'all') url.searchParams.delete(key);
      else url.searchParams.set(key, control.value);
    }
    history.pushState(null, '', url);
    attributes.forEach(control => control.dispatchEvent(new Event('selectsync')));
    renderFilters();
  };
  attributes.forEach(control => control.addEventListener('change', saveFilters));
  document.querySelector('#reset-filters').addEventListener('click', () => {
    attributes.forEach(control => { control.value = 'all'; });
    saveFilters();
  });
  const indexPath = path => path.replace(/index\.html$/, '');
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || indexPath(url.pathname) !== indexPath(location.pathname) || url.hash) return;
    event.preventDefault();
    url.searchParams.set('lang', i18n.language());
    if (url.href === location.href) {
      // Like the personal homepage: clicking the brand on the current home
      // document returns to the top instead of silently swallowing the click.
      if (link.matches('.brand, .mobile-brand')) {
        setMenu(false);
        window.scrollTo({
          top: 0,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
        });
      }
      return;
    }
    for (const control of attributes) {
      if (control.value !== 'all') url.searchParams.set(control.id.replace('-filter', ''), control.value);
    }
    history.pushState(null, '', url);
    const update = () => {
      renderView();
      window.scrollTo(0, 0);
      const heading = document.querySelector(archive.hidden ? '#hero-title' : '#stories-heading');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({preventScroll: true});
    };
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const transition = document.startViewTransition(update);
      transition.ready.catch(error => {
        if (error.name !== 'AbortError' && error.name !== 'InvalidStateError') throw error;
      });
    } else update();
  });
  window.addEventListener('popstate', renderView);
  renderView();
  if (articleReturn?.restore && articleReturn.url === location.href) {
    try { sessionStorage.removeItem(returnKey); } catch {}
    requestAnimationFrame(() => scrollTo({top: articleReturn.top, behavior: 'instant'}));
  }
  addEventListener('hkust:language', () => {
    const current = nav.querySelector('[data-category][aria-current=page]');
    renderArchiveHeading(current?.dataset.category === 'all' ? null : current);
    attributes.forEach(control => control.dispatchEvent(new Event('selectsync')));
    renderFilters();
  });
})();
