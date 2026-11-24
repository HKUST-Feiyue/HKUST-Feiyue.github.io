(() => {
  const params = new URLSearchParams(location.search);
  document.documentElement.dataset.view = params.has('category') || params.get('view') === 'all' ? 'archive' : 'home';
  let language = params.get('lang');
  try {
    if (language !== 'zh' && language !== 'en') language = localStorage.getItem('hkust-feiyue-lang');
    const saved = localStorage.getItem('hkust-theme');
    if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
  } catch {}
  document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
})();
