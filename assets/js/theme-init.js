(() => {
  const params = new URLSearchParams(location.search);
  document.documentElement.dataset.view = params.has('category') || params.get('view') === 'all' || ['campus','year','degree'].some(key => params.has(key)) ? 'archive' : 'home';
  let language = params.get('lang');
  try {
    if (!['zh', 'en'].includes(language)) language = localStorage.getItem('hkust-feiyue-lang');
    const saved = localStorage.getItem('hkust-theme');
    if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
  } catch {}
  document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
})();
