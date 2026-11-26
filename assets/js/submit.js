(async () => {
  const i18n = await window.HKUST_I18N.ready;
  const { t } = i18n;
  const form = document.querySelector('#submission-form');
  let category;
  const fields = document.querySelector('#dynamic-fields');
  const preview = document.querySelector('#preview');
  const previewText = document.querySelector('#preview-text');
  const button = document.querySelector('#preview-button');
  const draftStatus = document.querySelector('#draft-status');
  const draftKey = 'hkust-draft-v2';
  const make = (tag, text) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    return node;
  };
  const ui = (tag, key, params) => i18n.text(make(tag), key, params);
  fetch('data/schema.json').then(response => {
    if (!response.ok) throw new Error('Could not load schema');
    return response.json();
  }).then(schema => {
    const controls = new Map();
    let contactRows;
    const readContacts = () => [...contactRows.children].flatMap(row => {
      const [type, value] = row.querySelectorAll('input');
      value.setCustomValidity(Boolean(type.value.trim()) !== Boolean(value.value.trim()) ? t('请补全联系类型和联系信息') : '');
      return type.value.trim() || value.value.trim() ? [{type: type.value.trim(), value: value.value.trim()}] : [];
    });
    const values = () => ({...Object.fromEntries(new FormData(form)), contact: readContacts()});
    let entryPeriod;
    let bodyPreview = null;
    let bodyPreviewButton = null;
    for (const field of schema.fields) {
      if (field.name === 'campus') {
        const section = make('fieldset');
        section.className = 'field campus-field';
        const legend = make('legend');
        legend.append(ui('span', field.label), make('span', ' *'));
        const control = make('input');
        control.type = 'hidden';
        control.id = 'campus';
        const choices = make('div');
        choices.className = 'campus-options';
        for (const option of field.options) {
          const label = make('label');
          label.className = 'campus-choice';
          const radio = make('input');
          radio.type = 'radio';
          radio.name = 'campus';
          radio.value = option.value;
          radio.required = true;
          radio.addEventListener('input', () => {
            control.value = radio.value;
            choices.querySelectorAll('input').forEach(input => input.setCustomValidity(''));
          });
          label.append(radio, ui('span', option.label));
          choices.append(label);
        }
        const sync = () => choices.querySelectorAll('input').forEach(radio => {
          radio.checked = radio.value === control.value;
        });
        control.addEventListener('selectsync', sync);
        form.addEventListener('reset', () => requestAnimationFrame(() => {
          control.value = '';
          choices.querySelectorAll('input').forEach(input => input.setCustomValidity(''));
          sync();
        }));
        section.append(legend, control, choices);
        fields.append(section);
        controls.set(field.name, control);
        continue;
      }
      if (field.name === 'contact') {
        const section = make('fieldset');
        section.className = 'field contact-fields';
        section.append(ui('legend', '联系方式（选填）'));
        contactRows = make('div');
        const add = ui('button', '添加联系方式');
        add.type = 'button';
        add.className = 'secondary-button';
        const addRow = () => {
          const row = make('div');
          row.className = 'contact-row';
          for (const [key, label, placeholder, limit] of [
            ['type', '联系类型', field.typePlaceholder, field.typeMaxLength],
            ['value', '联系信息', field.valuePlaceholder, field.valueMaxLength]
          ]) {
            const wrapper = make('label');
            wrapper.append(ui('span', label));
            const input = make('input');
            input.type = 'text';
            input.dataset.contact = key;
            input.maxLength = limit;
            i18n.attribute(input, 'placeholder', placeholder);
            input.addEventListener('input', () => { row.querySelectorAll('input').forEach(node => node.setCustomValidity('')); });
            wrapper.append(input);
            row.append(wrapper);
          }
          const remove = ui('button', '删除联系方式');
          remove.type = 'button';
          remove.className = 'secondary-button';
          remove.addEventListener('click', () => { row.remove(); if (!contactRows.children.length) addRow(); add.disabled = false; form.dispatchEvent(new Event('input')); });
          row.append(remove);
          contactRows.append(row);
          add.disabled = contactRows.children.length >= field.maxItems;
        };
        add.addEventListener('click', addRow);
        form.addEventListener('reset', () => { contactRows.replaceChildren(); addRow(); });
        section.append(contactRows, add, ui('small', field.hint));
        fields.append(section);
        addRow();
        continue;
      }
      const wrapper = make('div');
      wrapper.className = 'field';
      const label = make('label');
      label.append(ui('span', field.label), field.required ? make('span', ' *') : ui('span', '（选填）'));
      label.htmlFor = field.name;
      const control = make(field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input');
      control.id = field.name;
      control.name = field.name;
      control.required = Boolean(field.required);
      if (field.type === 'text') control.type = 'text';
      if (field.type === 'select') {
        const placeholder = ui('option', field.placeholder);
        placeholder.value = '';
        control.append(placeholder);
        const groups = new Map();
        for (const item of (field.name === 'category' ? schema.categories.map(item => ({value:item.id, label:item.label})) : field.options)) {
          const option = ui('option', item.label);
          option.value = item.value;
          if (item.group) {
            if (!groups.has(item.group)) {
              const group = make('optgroup');
              i18n.attribute(group, 'label', item.group);
              groups.set(item.group, group);
              control.append(group);
            }
            groups.get(item.group).append(option);
          } else control.append(option);
        }
      }
      if (field.name === 'category') category = control;
      if (field.maxLength) control.maxLength = field.maxLength;
      if (field.placeholder) i18n.attribute(control, 'placeholder', field.placeholder);
      if (field.inputMode) control.inputMode = field.inputMode;
      if (field.pattern) control.pattern = field.pattern;
      if (field.type === 'textarea') control.rows = field.name === 'body' ? 9 : 3;
      wrapper.append(label);
      if (field.suffix) {
        const inputRow = make('div');
        inputRow.className = 'input-suffix';
        inputRow.append(control, ui('span', field.suffix));
        wrapper.append(inputRow);
      } else {
        wrapper.append(control);
      }
      if (field.hint) {
        const hint = ui('small', field.hint);
        hint.className = 'field-hint';
        hint.id = field.name + '-hint';
        control.setAttribute('aria-describedby', hint.id);
        wrapper.append(hint);
      }
      if (field.name === 'body') {
        const toolbar = make('div');
        toolbar.className = 'markdown-toolbar';
        toolbar.setAttribute('role', 'toolbar');
        i18n.attribute(toolbar, 'aria-label', '正文排版快捷操作');
        const actions = [
          ['正文', 'plain'], ['H1', 'h1'], ['H2', 'h2'], ['H3', 'h3'],
          ['加粗', 'bold'], ['斜体', 'italic'], ['无序列表', 'ul'],
          ['有序列表', 'ol'], ['引用', 'quote']
        ];
        const apply = kind => {
          const start = control.selectionStart;
          const end = control.selectionEnd;
          const selected = control.value.slice(start, end);
          const lineStart = control.value.lastIndexOf('\n', start - 1) + 1;
          let from = start, to = end, replacement = '', selectStart = 0, selectEnd = 0;
          if (kind === 'plain') {
            from = lineStart;
            const before = control.value.slice(from, start);
            const prefix = /^(?:#{1,3} |[-*] |\d+\. |> )/.exec(before)?.[0] || '';
            if (!prefix) { control.focus(); return; }
            replacement = before.slice(prefix.length) + selected;
            selectStart = before.length - prefix.length;
            selectEnd = selectStart + selected.length;
          } else if (kind === 'bold' || kind === 'italic') {
            const sample = selected || (t(kind === 'bold' ? '加粗文字' : '斜体文字'));
            replacement = kind === 'bold' ? '**' + sample + '**' : '*' + sample + '*';
            selectStart = kind === 'bold' ? 2 : 1;
            selectEnd = selectStart + sample.length;
          } else {
            from = lineStart;
            const prefix = { h1: '# ', h2: '## ', h3: '### ', ul: '- ', ol: '1. ', quote: '> ' }[kind];
            const before = control.value.slice(from, start);
            const lineText = before + (selected || t('在这里输入内容'));
            replacement = prefix + lineText;
            selectStart = prefix.length + before.length;
            selectEnd = selectStart + (selected || t('在这里输入内容')).length;
          }
          control.setRangeText(replacement, from, to, 'end');
          control.focus();
          control.setSelectionRange(from + selectStart, from + selectEnd);
          control.dispatchEvent(new Event('input', { bubbles: true }));
        };
        for (const [label, kind] of actions) {
          const action = ui('button', label);
          action.type = 'button';
          action.className = 'markdown-action';
          i18n.attribute(action, 'aria-label', label);
          action.addEventListener('click', () => {
            if (bodyPreview && !bodyPreview.hidden) bodyPreviewButton.click();
            apply(kind);
          });
          toolbar.append(action);
        }
        bodyPreview = make('div');
        bodyPreview.className = 'markdown-preview article-body';
        bodyPreview.hidden = true;
        i18n.attribute(bodyPreview, 'aria-label', '正文排版预览');
        bodyPreviewButton = ui('button', '预览排版');
        bodyPreviewButton.type = 'button';
        bodyPreviewButton.className = 'markdown-action markdown-preview-toggle';
        bodyPreviewButton.setAttribute('aria-pressed', 'false');
        bodyPreviewButton.addEventListener('click', () => {
          const showing = bodyPreview.hidden;
          if (showing) renderMarkdown(control.value, bodyPreview);
          bodyPreview.hidden = !showing;
          control.hidden = showing;
          i18n.text(bodyPreviewButton, showing ? '返回编辑' : '预览排版');
          bodyPreviewButton.setAttribute('aria-pressed', String(showing));
          if (!showing) { control.dispatchEvent(new Event('input', {bubbles:true})); control.focus(); }
        });
        toolbar.append(bodyPreviewButton);
        wrapper.insertBefore(toolbar, control);
        control.after(bodyPreview);
        const demoActions = make('div');
        demoActions.className = 'demo-actions';
        const loadDemo = ui('button', '载入示例');
        loadDemo.type = 'button';
        loadDemo.className = 'markdown-action';
        const clearBody = ui('button', '清空正文');
        clearBody.type = 'button';
        clearBody.className = 'markdown-action';
        loadDemo.addEventListener('click', async () => {
          if (control.value.trim() && !confirm(t('载入示例会替换当前正文，确认继续吗？'))) return;
          try {
            const response = await fetch('data/demo-submission.md');
            if (!response.ok) throw new Error('Demo unavailable');
            control.value = await response.text();
            control.dispatchEvent(new Event('input', { bubbles: true }));
            // The example is intentionally raw Markdown so beginners can inspect
            // syntax before switching to the rendered preview themselves.
            if (!bodyPreview.hidden) bodyPreviewButton.click();
            control.focus();
            i18n.text(draftStatus, '已载入带有 Markdown 格式的示例；可自行查看语法说明或点击「预览排版」。');
          } catch { i18n.text(draftStatus, '示例加载失败，请稍后重试。'); }
        });
        clearBody.addEventListener('click', () => {
          if (control.value.trim() && !confirm(t('确定清空正文吗？'))) return;
          control.value = '';
          control.dispatchEvent(new Event('input', { bubbles: true }));
          if (!bodyPreview.hidden) bodyPreviewButton.click();
          control.focus();
        });
        demoActions.append(loadDemo, clearBody);
        wrapper.insertBefore(demoActions, toolbar);
        // No duplicate Markdown engine or external editor dependency.
        const guide = make('details');
        guide.className = 'markdown-help';
        guide.append(ui('summary', '第一次写 Markdown？查看排版语法'));
        const explanation = make('div');
        explanation.className = 'markdown-help-content';
        const examples = [
          ['## 小标题', '使用 ## 开始一个章节'],
          ['### 子标题', '使用 ### 细分章节'],
          ['**重点文字**', '用两个星号突出重要内容'],
          ['- 一条经验', '用 - 整理无序清单'],
          ['1. 第一步', '用数字和句点表示步骤'],
          ['> 提醒', '用 > 写出引用或提示']
        ];
        for (const [syntax, meaning] of examples) {
          const item = make('div');
          item.append(ui('code', syntax), ui('span', meaning));
          explanation.append(item);
        }
        explanation.append(ui('p', '以上符号只有在「编辑」时可见；点击右上角「预览排版」就能看到最终文章的效果。也可以完全不使用 Markdown，直接写普通文字。'));
        guide.append(explanation);
        wrapper.insertBefore(guide, toolbar);
        const guidance = ui('small', '可直接粘贴 Markdown；也可以载入示例学习写作，再一键清空。');
        guidance.className = 'field-hint';
        wrapper.append(guidance);
      }
      if (field.name === 'year') {
        entryPeriod = make('div');
        entryPeriod.className = 'entry-period';
        entryPeriod.append(wrapper);
        fields.append(entryPeriod);
      } else if (field.name === 'term') {
        entryPeriod.append(wrapper);
        entryPeriod.append(entryPeriod.querySelector('#year-hint'));
      } else fields.append(wrapper);
      controls.set(field.name, control);
    }
    window.HKUSTSelect.enhance(fields);
    const year = controls.get('year');
    year.addEventListener('input', () => {
      const clean = year.value.replace(/[^0-9]/g, '').slice(0, 4);
      if (year.value !== clean) year.value = clean;
    });
    const updateCategory = () => {
      for (const name of ['destination']) {
        const definition = schema.fields.find(field => field.name === name);
        i18n.attribute(controls.get(name), 'placeholder', definition.placeholders[category.value] || definition.placeholder);
      }
    };
    category.addEventListener('change', updateCategory);
    updateCategory();

    const hidePreview = () => { preview.hidden = true; };
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      if (draft) {
        for (const [name, value] of Object.entries(draft)) {
          const control = name === 'category' ? category : controls.get(name);
          if (control && name !== 'contact' && typeof value === 'string') control.value = value;
        }
        i18n.text(draftStatus, '已恢复当前标签页的草稿（不含联系方式），尚未提交。');
      }
    } catch {}
    updateCategory();
    controls.forEach(control => control.dispatchEvent(new Event('selectsync')));
    const save = () => {
      hidePreview();
      if (bodyPreview && !bodyPreview.hidden) renderMarkdown(controls.get('body').value, bodyPreview);
      try {
        const draft = Object.fromEntries(new FormData(form));
        sessionStorage.setItem(draftKey, JSON.stringify(draft));
      } catch { i18n.text(draftStatus, '无法暂存草稿，请自行备份。'); }
    };
    form.addEventListener('input', save);
    form.addEventListener('change', save);
    form.addEventListener('reset', () => {
      hidePreview();
      if (bodyPreview && !bodyPreview.hidden) bodyPreviewButton.click();
      try { sessionStorage.removeItem(draftKey); } catch {}
      i18n.text(draftStatus, '草稿已清空，尚未提交。');
      requestAnimationFrame(() => {
        updateCategory();
      });
    });
    const renderMarkdown = (source, target) => {
      if (!window.marked || !window.DOMPurify) {
        i18n.text(target, '预览组件暂不可用，请检查网络后刷新。');
        return;
      }
      // Never trust the Markdown input or allow embedded HTML to execute.
      const safeSource = source.replace(/<(?=[a-z!/])/gi, '&lt;');
      target.innerHTML = DOMPurify.sanitize(marked.parse(safeSource, { gfm: true, breaks: false }), {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['style', 'iframe', 'form'],
        FORBID_ATTR: ['style']
      });
      target.querySelectorAll('a').forEach(link => {
        link.rel = 'noopener noreferrer';
      });
    };
    // Mirror the published article's heading anchors and H2/H3 contents list.
    // Both previews render the same .article-body rules as generated articles.
    const buildArticleToc = body => {
      const headings = [...body.querySelectorAll('h2, h3')];
      const used = new Set();
      for (const heading of headings) {
        const base = heading.textContent.toLowerCase()
          .replace(/[^\p{L}\p{N}_\s-]/gu, '').trim().replace(/[-\s]+/g, '-') || 'section';
                let id = base;
        for (let i = 1; used.has(id); i++) id = base + '_' + i;
        heading.id = id;
        used.add(id);
      }
      if (headings.length < 2) return null;
      const nav = make('details');
      nav.className = 'article-toc';
      nav.append(ui('summary', '本页目录'));
      const list = make('ul');
      for (const heading of headings) {
        const item = make('li');
        item.className = 'toc-depth-' + heading.tagName.slice(1);
        const link = make('a', heading.textContent);
        link.href = '#' + heading.id;
        item.append(link);
        list.append(item);
      }
      const panel = make('div');
      panel.className = 'article-toc-panel';
      const clip = make('div');
      clip.className = 'article-toc-clip';
      clip.append(list);
      panel.append(clip);
      nav.append(panel);
      return nav;
    };
    const validateForm = () => {
      for (const field of schema.fields.filter(field => field.name !== 'contact')) {
        const control = controls.get(field.name);
        const target = field.name === 'campus' ? form.querySelector('[name=campus]') : control;
        target.setCustomValidity(field.required && !control.value.trim() ? t('请填写{field}', {field: field.label}) : '');
      }
      readContacts();
      return form.reportValidity();
    };
    button.addEventListener('click', () => {
      if (!validateForm()) return;
      const data = new FormData(form);
      const selected = schema.categories.find(item => item.id === data.get('category'));
      if (!selected) return;
      const author = String(data.get('author') || '').trim();
      const destination = String(data.get('destination') || '').trim();
      previewText.replaceChildren();
      const back = ui('span', '返回{category}', {category: selected.label});
      back.className = 'article-back';
      const period = data.get('year') + ' ' + schema.fields.find(field => field.name === 'term').options.find(option => option.value === data.get('term')).label;
      const authorLine = make('p', author + ' · ' + period);
      authorLine.className = 'article-author';
      const tools = make('div');
      tools.className = 'article-tools';
      tools.append(back);
      previewText.append(tools, make('h1', destination), authorLine);
      const byline = make('p');
      const details = [ui('span', schema.fields.find(field => field.name === 'campus').options.find(item => item.value === data.get('campus')).label), make('span', data.get('degree'))];
      details.filter(node => node.textContent).forEach((node, index) => {
        if (index) byline.append(document.createTextNode(' · '));
        byline.append(node);
      });
      byline.className = 'article-byline';
      const fieldLine = make('span', data.get('field'));
      fieldLine.className = 'article-field';
      byline.append(document.createTextNode(' · '), fieldLine);
      previewText.append(byline);
      const body = make('div');
      body.className = 'article-body';
      renderMarkdown(String(data.get('body') || ''), body);
      const toc = buildArticleToc(body);
      if (toc) previewText.append(toc);
      previewText.append(body);
      if (toc) window.initArticleToc?.(previewText);
      const contacts = readContacts();
      if (contacts.length) {
        const aside = make('aside');
        aside.className = 'article-contact';
        aside.append(ui('strong', '联系作者'));
        for (const row of contacts) {
          const line = make('p', row.type + '：' + row.value + ' ');
          const copy = ui('button', '复制');
          copy.type = 'button';
          copy.className = 'copy-contact';
          copy.dataset.copy = row.value;
          line.append(copy);
          aside.append(line);
        }
        previewText.append(aside);
      }
      preview.hidden = false;
      preview.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    for (const control of controls.values()) control.addEventListener('input', () => control.setCustomValidity(''));

    // Public posting is opt-in. A successful Issue creation is not publication.
    const submitButton = document.querySelector('#submit-button');
    const submitStatus = document.querySelector('#submission-status');
    const captchaHost = document.querySelector('#submission-turnstile');
    const config = window.HKUST_SUBMISSION_CONFIG || {};
    const enabled = config.enabled === true &&
      /^https:\/\//.test(config.apiEndpoint || '') && Boolean(config.turnstileSiteKey);
    let widgetId = null;
    let submitting = false;
    const say = (message, state = 'info') => {
      i18n.text(submitStatus, message);
      submitStatus.dataset.state = state;
    };
    if (enabled) {
      captchaHost.hidden = false;
      say('请先完成人机验证，再确认公开投稿。');
      const captchaScript = document.createElement('script');
      captchaScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      captchaScript.async = true;
      const renderVerification = () => {
        try {
          if (widgetId !== null) window.turnstile.remove(widgetId);
          submitButton.disabled = true;
          widgetId = window.turnstile.render(captchaHost, {
            sitekey: config.turnstileSiteKey,
            action: 'hkust_feiyue_submit',
            language: i18n.language() === 'zh' ? 'zh-TW' : 'en',
            callback: () => {
              if (!submitting) {
                submitButton.disabled = false;
                if (!submitStatus.querySelector('a')) say('验证完成，可以投稿。', 'success');
              }
            },
            'expired-callback': () => { submitButton.disabled = true; say('验证已过期，请重新验证。', 'error'); },
            'error-callback': () => { submitButton.disabled = true; say('人机验证暂不可用，请刷新重试。', 'error'); }
          });
        } catch { say('无法加载人机验证，请刷新重试。', 'error'); }
      };
      captchaScript.onload = renderVerification;
      addEventListener('hkust:language', () => {
        if (widgetId !== null) renderVerification();
      });
      captchaScript.onerror = () => say('无法加载人机验证，请稍后重试。', 'error');
      document.head.append(captchaScript);
      submitButton.addEventListener('click', async () => {
        const data = values();
        if (submitting || !validateForm()) return;
        const token = widgetId === null ? '' : window.turnstile?.getResponse(widgetId);
        if (!token) { say('请先完成人机验证。', 'error'); return; }
        const payload = { version: 1, ...data, turnstileToken: token };
        if (new TextEncoder().encode(JSON.stringify(payload)).length > 65536) {
          say('内容过长，请精简后重试。', 'error');
          return;
        }
        submitting = true;
        submitButton.disabled = true;
        i18n.text(submitButton, '正在提交…');
        say('正在提交，请勿重复点击。');
        try {
          const response = await fetch(config.apiEndpoint, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const result = await response.json();
          if (!response.ok || !result.ok || !/^https:\/\/github\.com\/HKUST-Feiyue\/HKUST-Feiyue\/issues\/\d+$/.test(result.issueUrl || ''))
            throw new Error(result.message || '投稿未成功，请稍后再试。');
          form.reset();
          submitStatus.dataset.state = 'success';
          delete submitStatus.dataset.i18n;
          submitStatus.replaceChildren(ui('span', '已提交到 GitHub，审核通过后才会发布。'), document.createTextNode(' '));
          const link = ui('a', '查看投稿记录');
          link.href = result.issueUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          submitStatus.append(link);
        } catch (error) {
          say(error.message || '网络异常，投稿未确认保存。请检查 Issue 列表后再试。', 'error');
        } finally {
          submitting = false;
          i18n.text(submitButton, '投稿分享');
          window.turnstile?.reset(widgetId);
          submitButton.disabled = true;
        }
      });
    } else {
      say(config.localPreview ? '本地预览可填写、预览和保存草稿；投稿验证仅在正式网站提供。' : '投稿服务暂未开放，可先预览并保存草稿。');
    }

    addEventListener('hkust:language', () => {
      updateCategory();
      readContacts();
      for (const field of schema.fields.filter(field => field.name !== 'contact')) {
        const control = controls.get(field.name);
        const target = field.name === 'campus' ? form.querySelector('[name=campus]') : control;
        if (target.validity.customError) target.setCustomValidity(t('请填写{field}', {field: field.label}));
      }
    });
  }).catch(() => {
    i18n.text(fields, '表单加载失败，请刷新重试。');
    button.disabled = true;
  });
})();
