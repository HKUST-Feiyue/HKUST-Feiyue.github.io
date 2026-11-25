/* One progressive select control for submission fields and archive filters. */
(() => {
  const instances = new WeakMap();
  window.HKUSTSelect = {
    enhance(root = document) {
      if (!('showPopover' in HTMLElement.prototype)) return;
      root.querySelectorAll('select').forEach(select => {
        if (instances.has(select)) return;
        const base = select.id.replace(/-filter$/, '');
        const wrapper = document.createElement('div');
        wrapper.className = 'select-control';
        select.before(wrapper);
        wrapper.append(select);
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.id = base + '-trigger';
        trigger.className = 'select-trigger';
        trigger.setAttribute('role', 'combobox');
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-required', String(select.required));
        const label = select.labels[0];
        if (label) {
          label.id ||= select.id + '-field-label';
          trigger.setAttribute('aria-labelledby', label.id + ' ' + base + '-label');
          label.addEventListener('click', event => {
            if (event.target.closest('button')) return;
            event.preventDefault();
            trigger.focus();
          });
        }
        const value = document.createElement('span');
        value.id = base + '-label';
        value.className = 'select-value';
        trigger.append(value);
        trigger.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>');
        const panel = document.createElement('div');
        panel.id = base + '-options';
        panel.className = 'select-options';
        panel.setAttribute('popover', 'auto');
        panel.setAttribute('role', 'listbox');
        if (label) panel.setAttribute('aria-labelledby', label.id);
        trigger.setAttribute('aria-controls', panel.id);
        const error = document.createElement('small');
        error.id = select.id + '-error';
        error.className = 'select-error';
        error.hidden = true;
        trigger.setAttribute('aria-describedby', [select.getAttribute('aria-describedby'), error.id].filter(Boolean).join(' '));
        wrapper.append(trigger, panel, error);
        select.classList.add('select-native');
        select.tabIndex = -1;
        select.setAttribute('aria-hidden', 'true');
        let options = [], active = 0, typed = '', lastTyped = 0;
        const isOpen = () => panel.matches(':popover-open');
        const activate = index => {
          active = Math.max(0, Math.min(index, options.length - 1));
          options.forEach((option, i) => option.classList.toggle('is-active', i === active));
          trigger.setAttribute('aria-activedescendant', options[active]?.id || '');
          options[active]?.scrollIntoView({block: 'nearest'});
        };
        const sync = () => {
          value.textContent = select.selectedOptions[0]?.textContent || '';
          trigger.disabled = select.disabled;
          trigger.classList.toggle('is-placeholder', select.value === '');
          options.forEach(option => option.setAttribute('aria-selected', String(option.dataset.value === select.value)));
          if (!error.hidden) error.textContent = select.value ? select.validationMessage : select.options[0].textContent;
        };
        const position = () => {
          const rect = trigger.getBoundingClientRect();
          const viewport = window.visualViewport;
          const top = viewport?.offsetTop || 0;
          const bottom = top + (viewport?.height || innerHeight);
          const below = bottom - rect.bottom - 12;
          const above = rect.top - top - 12;
          const down = below >= Math.min(panel.scrollHeight, 320) || below >= above;
          const height = Math.min(320, Math.max(44, down ? below : above));
          const width = Math.min(Math.max(rect.width, 180), 360, innerWidth - 24);
          panel.style.width = width + 'px';
          panel.style.maxHeight = height + 'px';
          panel.style.left = Math.max(12, Math.min(rect.left, innerWidth - width - 12)) + 'px';
          panel.style.top = (down ? rect.bottom + 6 : Math.max(top + 12, rect.top - Math.min(panel.scrollHeight, height) - 6)) + 'px';
        };
        const close = () => { if (isOpen()) panel.hidePopover(); };
        const commit = () => {
          const option = options[active];
          if (!option) return;
          select.value = option.dataset.value;
          select.dispatchEvent(new Event('input', {bubbles: true}));
          select.dispatchEvent(new Event('change', {bubbles: true}));
          close();
          trigger.focus({preventScroll: true});
        };
        const rebuild = () => {
          close();
          panel.replaceChildren();
          options = [];
          const groups = new Map();
          for (const option of select.options) {
            if (option.disabled) continue;
            const group = option.parentElement;
            if (group.tagName === 'OPTGROUP' && !groups.has(group)) {
              const section = document.createElement('div');
              section.setAttribute('role', 'group');
              const heading = document.createElement('div');
              heading.id = select.id + '-group-' + groups.size;
              heading.className = 'select-group';
              heading.textContent = group.label;
              section.setAttribute('aria-labelledby', heading.id);
              section.append(heading);
              panel.append(section);
              groups.set(group, section);
            }
            const row = document.createElement('div');
            row.id = select.id + '-option-' + options.length;
            row.className = 'select-option';
            row.setAttribute('role', 'option');
            row.dataset.value = option.value;
            row.textContent = option.textContent;
            row.addEventListener('pointerdown', event => event.preventDefault());
            row.addEventListener('pointerup', event => {
              if (event.pointerType !== 'touch') return;
              event.preventDefault();
              active = options.indexOf(row);
              commit();
            });
            row.addEventListener('click', () => {
              if (!isOpen()) return;
              active = options.indexOf(row);
              commit();
            });
            options.push(row);
            (groups.get(group) || panel).append(row);
          }
          sync();
        };
        const open = () => {
          if (trigger.disabled || !options.length) return;
          if (!isOpen()) panel.showPopover();
          position();
          activate(Math.max(0, options.findIndex(option => option.dataset.value === select.value)));
        };
        trigger.addEventListener('click', () => {
          trigger.focus({preventScroll: true});
          if (isOpen()) close();
          else open();
        });
        trigger.addEventListener('keydown', event => {
          const key = event.key;
          if (key === 'Escape') { close(); return; }
          if (key === 'Tab') { if (isOpen()) commit(); return; }
          if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(key)) {
            event.preventDefault();
            const opened = isOpen();
            if (!opened) open();
            if ((key === 'Enter' || key === ' ') && opened) commit();
            else if (key === 'Home') activate(0);
            else if (key === 'End') activate(options.length - 1);
            else if (key === 'ArrowDown') activate((active + 1) % options.length);
            else if (key === 'ArrowUp') activate((active + options.length - 1) % options.length);
          } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            if (!isOpen()) open();
            typed = performance.now() - lastTyped > 700 ? key : typed + key;
            lastTyped = performance.now();
            const index = options.findIndex(option => option.textContent.toLocaleLowerCase().startsWith(typed.toLocaleLowerCase()));
            if (index >= 0) activate(index);
          }
        });
        panel.addEventListener('toggle', () => {
          trigger.setAttribute('aria-expanded', String(isOpen()));
          if (!isOpen()) trigger.removeAttribute('aria-activedescendant');
        });
        trigger.addEventListener('blur', close);
        select.addEventListener('change', () => {
          error.hidden = true;
          trigger.removeAttribute('aria-invalid');
          sync();
        });
        select.addEventListener('selectsync', sync);
        select.addEventListener('invalid', event => {
          event.preventDefault();
          error.hidden = false;
          sync();
          trigger.setAttribute('aria-invalid', 'true');
          if (!select.form.querySelector('[aria-invalid="true"]:focus')) trigger.focus();
        });
        select.form?.addEventListener('reset', () => requestAnimationFrame(() => {
          close();
          error.hidden = true;
          trigger.removeAttribute('aria-invalid');
          sync();
        }));
        addEventListener('hkust:language', rebuild);
        addEventListener('resize', () => { if (isOpen()) position(); }, {passive: true});
        addEventListener('scroll', () => {
          if (!isOpen()) return;
          const rect = trigger.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > innerHeight) close();
          else position();
        }, {passive: true});
        window.visualViewport?.addEventListener('resize', () => { if (isOpen()) position(); });
        instances.set(select, {sync});
        rebuild();
      });
    }
  };
})();
