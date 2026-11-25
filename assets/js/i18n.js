(() => {
  const dictionaryUrl = new URL('../../data/i18n.json', document.currentScript.src);
  const storageKey = 'hkust-feiyue-lang';
  const embedded = document.querySelector('#site-translations');
  const dictionary = embedded ? Promise.resolve(JSON.parse(embedded.textContent)) : fetch(dictionaryUrl).then(response => {
    if (!response.ok) throw new Error('Could not load translations');
    return response.json();
  });
  const ready = dictionary.then(translations => {
    const language = () => document.documentElement.lang === 'zh-Hant' ? 'zh' : 'en';
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
      for (const name of ['aria-label', 'title', 'placeholder', 'content', 'label']) {
        root.querySelectorAll('[data-i18n-' + name + ']').forEach(node => {
          node.setAttribute(name, t(node.getAttribute('data-i18n-' + name)));
        });
      }
      document.querySelectorAll('.language-toggle').forEach(button => {
        button.setAttribute('aria-label', language() === 'en' ? 'Switch to Traditional Chinese' : '切換到英文');
      });
      for (const prefix of ['og:', 'twitter:']) {
        document.querySelector(`meta[${prefix === 'og:' ? 'property' : 'name'}="${prefix}title"]`)?.setAttribute('content', document.title);
        document.querySelector(`meta[${prefix === 'og:' ? 'property' : 'name'}="${prefix}description"]`)?.setAttribute('content', document.querySelector('meta[name="description"]').content);
      }
      document.querySelector('meta[property="og:locale"]')?.setAttribute('content', language() === 'en' ? 'en_US' : 'zh_HK');
    };
    const setLanguage = (lang) => {
      document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
      try { localStorage.setItem(storageKey, lang); } catch {}
      const url = new URL(location.href);
      url.searchParams.set('lang', lang);
      history.replaceState(history.state, '', url);
      apply();
      dispatchEvent(new Event('hkust:language'));
    };
    document.querySelectorAll('.language-toggle').forEach(button => {
      button.addEventListener('click', () => setLanguage(language() === 'en' ? 'zh' : 'en'));
    });
    addEventListener('popstate', () => {
      const requested = new URLSearchParams(location.search).get('lang');
      if (['zh', 'en'].includes(requested)) setLanguage(requested);
    });
    addEventListener('storage', event => {
      if (event.key === storageKey && ['zh', 'en'].includes(event.newValue)) setLanguage(event.newValue);
    });
    setLanguage(language());
    delete document.documentElement.dataset.languagePending;
    return { t, text, attribute, apply, language };
  }).catch(error => {
    document.documentElement.lang = 'en';
    delete document.documentElement.dataset.languagePending;
    throw error;
  });
  window.HKUST_I18N = { ready };
})();
