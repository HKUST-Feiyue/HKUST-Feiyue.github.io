(() => {
  const dictionaryUrl = new URL('../../data/i18n.json', document.currentScript.src);
  const storageKey = 'hkust-feiyue-lang';
  const ready = fetch(dictionaryUrl).then(response => {
    if (!response.ok) throw new Error('Could not load translations');
    return response.json();
  }).then(translations => {
    const language = () => document.documentElement.lang === 'zh-Hant' ? 'zh' : document.documentElement.lang === 'zh-CN' ? 'zh-CN' : 'en';
    const t = (key, params = {}) => {
      const dictionary = translations[language()];
      const value = dictionary[key] ?? key;
      return value.replace(/\{(\w+)\}/g, (_, name) => {
        const value = String(params[name] ?? '');
        return dictionary[value] ?? value;
      });
    };
    const text = (node, key, params = {}) => {
      node.dataset.i18n = key;
      node.dataset.i18nParams = JSON.stringify(params);
      node.textContent = t(key, params);
      return node;
    };
    const attribute = (node, name, key) => {
      node.setAttribute('data-i18n-' + name, key);
      node.setAttribute(name, t(key));
    };
    const apply = (root = document) => {
      root.querySelectorAll('[data-i18n]').forEach(node => {
        node.textContent = t(node.dataset.i18n, JSON.parse(node.dataset.i18nParams || '{}'));
      });
      for (const name of ['aria-label', 'title', 'placeholder', 'content']) {
        root.querySelectorAll('[data-i18n-' + name + ']').forEach(node => {
          node.setAttribute(name, t(node.getAttribute('data-i18n-' + name)));
        });
      }
      document.querySelectorAll('.language-toggle').forEach(button => {
        button.setAttribute('aria-label', '简体 / 繁體 / English');
      });
      for (const prefix of ['og:', 'twitter:']) {
        document.querySelector(`meta[${prefix === 'og:' ? 'property' : 'name'}="${prefix}title"]`)?.setAttribute('content', document.title);
        document.querySelector(`meta[${prefix === 'og:' ? 'property' : 'name'}="${prefix}description"]`)?.setAttribute('content', document.querySelector('meta[name="description"]').content);
      }
      document.querySelector('meta[property="og:locale"]')?.setAttribute('content', language() === 'en' ? 'en_US' : language() === 'zh' ? 'zh_HK' : 'zh_CN');
    };
    const setLanguage = (lang) => {
      document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : lang === 'zh-CN' ? 'zh-CN' : 'en';
      try { localStorage.setItem(storageKey, lang); } catch {}
      const url = new URL(location.href);
      url.searchParams.set('lang', lang);
      history.replaceState(history.state, '', url);
      apply();
      dispatchEvent(new Event('hkust:language'));
    };
    document.querySelectorAll('.language-toggle').forEach(button => {
      button.addEventListener('click', () => setLanguage(['en', 'zh', 'zh-CN'][(['en', 'zh', 'zh-CN'].indexOf(language()) + 1) % 3]));
    });
    addEventListener('popstate', () => {
      const requested = new URLSearchParams(location.search).get('lang');
      if (['zh', 'zh-CN', 'en'].includes(requested)) setLanguage(requested);
    });
    addEventListener('storage', event => {
      if (event.key === storageKey && ['zh', 'zh-CN', 'en'].includes(event.newValue)) setLanguage(event.newValue);
    });
    setLanguage(language());
    return { t, text, attribute, apply, language };
  });
  window.HKUST_I18N = { ready };
})();
