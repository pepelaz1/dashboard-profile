import 'bootstrap/dist/css/bootstrap.min.css';
import Offcanvas from 'bootstrap/js/dist/offcanvas';
import './style.css';
import { breadcrumbs, isMenuActive, resolveRoute, routes, type Route } from './routes';
import { escapeHtml as esc, required } from './html';
import { hasChanges, initialProfile, normalizeProfile, saveDemoProfile, validateProfile, type Field, type FormState, type Profile } from './profile';

const app = required<HTMLDivElement>('#app');
let saved: Profile = { ...initialProfile };
let draft: Profile = { ...saved };
let formState: FormState = 'idle';
let context = 'Личное пространство';
let pendingPath: string | null = null;
let routeFocus = false;
let pageVersion = 0;
let navigation: Offcanvas;

function menu(): string {
  return routes.filter(route => route.menu).map(route => `
    <a href="${route.path}" data-route="${route.path}" class="menu-link" data-menu-path="${route.path}">
      <span aria-hidden="true" class="menu-symbol">${route.symbol}</span><span>${route.label}</span>
    </a>`).join('');
}

app.innerHTML = `
  <a class="skip-link" href="#page-title">Перейти к содержимому</a>
  <aside class="sidebar d-none d-lg-flex" aria-label="Основная навигация">
    <a class="brand" href="/dashboard" data-route="/dashboard"><span class="brand-mark" aria-hidden="true">w.</span> workspace</a>
    <span class="nav-caption">РАБОЧИЙ КАБИНЕТ</span><nav>${menu()}</nav>
    <div class="sidebar-bottom"><span class="context-dot"></span> Демо-пространство <span class="small-note">Изменения хранятся в этой сессии</span></div>
  </aside>
  <div class="workspace">
    <header class="topbar">
      <div class="d-flex align-items-center gap-3">
        <button class="btn menu-toggle d-lg-none" id="menu-toggle" type="button" aria-controls="mobile-nav" aria-expanded="false" aria-label="Открыть меню"><span aria-hidden="true">☰</span></button>
        <div class="context-control"><label for="context-select">Рабочий контекст</label><select id="context-select" class="form-select form-select-sm"><option>Личное пространство</option><option>Команда продукта</option><option>Консалтинг</option></select></div>
      </div>
      <div class="topbar-account"><span class="session-badge">DEMO</span><span class="avatar avatar-small" aria-hidden="true">АМ</span><span class="d-none d-sm-inline" id="account-name">Александр М.</span></div>
    </header>
    <main id="main-content" class="page"></main>
    <footer class="page-footer"><span>Workspace · Личный кабинет</span><span>Образец интерфейса · 2026</span></footer>
  </div>
  <div class="offcanvas offcanvas-start" tabindex="-1" id="mobile-nav" aria-labelledby="mobile-nav-title">
    <div class="offcanvas-header"><h2 class="offcanvas-title brand" id="mobile-nav-title"><span class="brand-mark" aria-hidden="true">w.</span> workspace</h2><button type="button" class="btn-close" id="menu-close" aria-label="Закрыть меню"></button></div>
    <div class="offcanvas-body"><span class="nav-caption">РАБОЧИЙ КАБИНЕТ</span><nav aria-label="Мобильная навигация">${menu()}</nav></div>
  </div>`;

const mobile = required<HTMLDivElement>('#mobile-nav');
const toggle = required<HTMLButtonElement>('#menu-toggle');
navigation = new Offcanvas(mobile, { backdrop: true, keyboard: true, scroll: false });
toggle.addEventListener('click', () => navigation.show());
required('#menu-close').addEventListener('click', () => navigation.hide());
mobile.addEventListener('show.bs.offcanvas', () => toggle.setAttribute('aria-expanded', 'true'));
mobile.addEventListener('hidden.bs.offcanvas', () => {
  toggle.setAttribute('aria-expanded', 'false');
  if (pendingPath) {
    const path = pendingPath;
    pendingPath = null;
    navigate(path);
  } else if (routeFocus) {
    routeFocus = false;
    focusTitle();
  } else if (toggle.getClientRects().length) toggle.focus();
});
window.matchMedia('(min-width: 992px)').addEventListener('change', event => {
  if (event.matches) navigation.hide();
});
required<HTMLSelectElement>('#context-select').addEventListener('change', event => {
  context = (event.target as HTMLSelectElement).value;
  document.querySelectorAll<HTMLElement>('[data-context]').forEach(element => { element.textContent = context; });
});

document.addEventListener('click', event => {
  const mouse = event as MouseEvent;
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-route]');
  if (!link || mouse.button !== 0 || mouse.ctrlKey || mouse.metaKey || mouse.shiftKey || mouse.altKey) return;
  event.preventDefault();
  const path = link.dataset.route!;
  if (mobile.classList.contains('show')) {
    pendingPath = path;
    navigation.hide();
  } else navigate(path);
});

function focusTitle(): void { required<HTMLElement>('#page-title').focus(); }

function navigate(path: string): void {
  if (location.pathname !== path) history.pushState({}, '', path);
  renderPage();
  focusTitle();
}

window.addEventListener('popstate', () => {
  renderPage();
  if (mobile.classList.contains('show')) {
    pendingPath = null;
    routeFocus = true;
    navigation.hide();
  } else focusTitle();
});

function heading(route: Route): string {
  const crumbs = breadcrumbs(route);
  return `<nav aria-label="Хлебные крошки"><ol class="breadcrumb">${crumbs.map((item, index) => index === crumbs.length - 1
    ? `<li class="breadcrumb-item active" aria-current="page">${item.label}</li>`
    : `<li class="breadcrumb-item"><a href="${item.path}" data-route="${item.path}">${item.label}</a></li>`).join('')}</ol></nav>
    <div class="page-heading"><div><div class="eyebrow">ВАШЕ ПРОСТРАНСТВО</div><h1 tabindex="-1" id="page-title">${route.page === 'profile' ? 'Личный профиль' : route.label}</h1><p>${route.page === 'profile' ? 'Всё, что помогает команде узнать вас лучше.' : 'Контекст, профиль и работа — в одном месте.'}</p></div><span class="context-label" data-context>${esc(context)}</span></div>`;
}

function tabs(route: Route): string {
  return `<nav class="profile-tabs" aria-label="Разделы профиля">${routes.filter(item => item.page === 'profile' || item.page === 'professional').map(item => `<a href="${item.path}" data-route="${item.path}" ${item.path === route.path ? 'aria-current="page" class="selected"' : ''}>${item.label}</a>`).join('')}</nav>`;
}

function renderPage(): void {
  pageVersion++;
  // Preserve an unsaved draft across routes, but stop stale async saves from updating a new page.
  if (formState === 'saving') formState = 'dirty';
  const route = resolveRoute(location.pathname);
  const main = required<HTMLElement>('#main-content');
  document.querySelectorAll<HTMLAnchorElement>('[data-menu-path]').forEach(link => {
    const item = routes.find(item => item.path === link.dataset.menuPath)!;
    const active = route && isMenuActive(item, route);
    link.classList.toggle('active', Boolean(active));
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (!route) {
    document.title = 'Страница не найдена · Workspace';
    main.innerHTML = '<h1 id="page-title" tabindex="-1">Страница не найдена</h1><p>Этот маршрут не входит в образец.</p><a href="/dashboard/profile" data-route="/dashboard/profile">Вернуться к профилю</a>';
    return;
  }
  document.title = `${route.label} · Workspace`;
  main.innerHTML = heading(route) + (route.page === 'profile' ? tabs(route) + profileMarkup()
    : route.page === 'overview' ? overviewMarkup()
    : route.page === 'professional' ? tabs(route) + '<section class="surface p-4"><h2>Профессиональный профиль</h2><p class="text-secondary">Раздел зарегистрирован в общем shell. Его форма находится вне объёма этого образца.</p><a href="/dashboard/profile" data-route="/dashboard/profile">Перейти к личным данным</a></section>'
    : route.page === 'contexts' ? contextsMarkup()
    : '<section class="surface p-4"><h2>Настройки кабинета</h2><p class="text-secondary">Раздел предусмотрен в registry. Настройки аккаунта находятся вне объёма образца.</p></section>');
  if (route.page === 'profile') bindProfile();
  if (route.page === 'contexts') {
    main.querySelectorAll<HTMLButtonElement>('[data-select-context]').forEach(button => button.addEventListener('click', () => {
      const select = required<HTMLSelectElement>('#context-select');
      select.value = button.dataset.selectContext!;
      select.dispatchEvent(new Event('change'));
      renderPage();
      focusTitle();
    }));
  }
}

function overviewMarkup(): string {
  // /dashboard and /dashboard/overview both render this view, without redirects.
  return `<section class="overview-banner surface"><div><div class="eyebrow">ДОБРО ПОЖАЛОВАТЬ</div><h2>Здравствуйте, ${esc(saved.firstName)}.</h2><p>Ваш рабочий день начинается здесь.</p><a class="btn btn-primary" href="/dashboard/profile" data-route="/dashboard/profile">Открыть профиль <span aria-hidden="true">↗</span></a></div><span class="overview-art" aria-hidden="true">◫</span></section>
    <div class="overview-grid"><section class="surface p-4"><span class="eyebrow">ПРОФИЛЬ</span><h2 class="mt-2">${esc(saved.firstName)} ${esc(saved.lastName)}</h2><p class="text-secondary">${esc(saved.bio) || 'Расскажите о себе в профиле.'}</p><span class="detail-chip">${esc(saved.city) || 'Город не указан'}</span></section><section class="surface p-4"><span class="eyebrow">РАБОЧИЙ КОНТЕКСТ</span><h2 class="mt-2" data-context>${esc(context)}</h2><p class="text-secondary">Единая навигация для всех пространств.</p><a href="/dashboard/work-contexts" data-route="/dashboard/work-contexts">Управление контекстами →</a></section></div>`;
}

function contextsMarkup(): string {
  return `<section class="surface p-4"><h2>Ваши пространства</h2><p class="text-secondary">Переключение меняет демо-контекст; профиль остаётся общим.</p><div class="context-list">${['Личное пространство', 'Команда продукта', 'Консалтинг'].map(item => `<button type="button" class="context-option ${item === context ? 'selected' : ''}" data-select-context="${item}" aria-pressed="${item === context}"><span>${item}</span><span aria-hidden="true">${item === context ? '✓' : '→'}</span></button>`).join('')}</div></section>`;
}

function input(field: Field, label: string, options: { type?: string; autocomplete?: string; required?: boolean; max: number; hint?: string }): string {
  return `<div class="col-md-6"><label class="form-label" for="${field}">${label}${options.required ? ' <span class="required-mark" aria-hidden="true">*</span>' : ''}</label><input class="form-control" id="${field}" name="${field}" type="${options.type ?? 'text'}" value="${esc(draft[field])}" maxlength="${options.max}" ${options.required ? 'required' : ''} autocomplete="${options.autocomplete ?? 'off'}" aria-describedby="${field}-error${options.hint ? ` ${field}-hint` : ''}"><div class="invalid-feedback" id="${field}-error"></div>${options.hint ? `<div class="form-text" id="${field}-hint">${options.hint}</div>` : ''}</div>`;
}

function profileMarkup(): string {
  return `<div class="profile-layout">
    <section class="surface profile-form-card" aria-labelledby="details-title">
      <div class="section-heading"><span class="section-icon" aria-hidden="true">○</span><div><h2 id="details-title">Основная информация</h2><p>Личные данные и способы связаться с вами.</p></div></div>
      <form id="profile-form" novalidate>
        <div class="form-content"><p class="required-note"><span class="required-mark">*</span> Обязательные поля</p>
          <div id="form-status" class="status-message" role="status" aria-live="polite" aria-atomic="true"></div>
          <div id="error-summary" class="alert alert-danger" tabindex="-1" role="alert" hidden></div>
          <div class="row g-4">${input('firstName', 'Имя', { required: true, autocomplete: 'given-name', max: 60 })}${input('lastName', 'Фамилия', { required: true, autocomplete: 'family-name', max: 60 })}${input('email', 'Email', { type: 'email', required: true, autocomplete: 'email', max: 254, hint: 'Используется для связи по рабочим вопросам.' })}${input('phone', 'Телефон', { type: 'tel', autocomplete: 'tel', max: 30, hint: 'Необязательно. Номер с кодом страны.' })}${input('city', 'Город', { autocomplete: 'address-level2', max: 80 })}
            <div class="col-md-6"><label class="form-label" for="timezone">Часовой пояс <span class="required-mark" aria-hidden="true">*</span></label><select id="timezone" name="timezone" class="form-select" required aria-describedby="timezone-error">${[['Asia/Tomsk', 'Томск · UTC+7'], ['Europe/Moscow', 'Москва · UTC+3'], ['Asia/Yekaterinburg', 'Екатеринбург · UTC+5']].map(([value, label]) => `<option value="${value}" ${draft.timezone === value ? 'selected' : ''}>${label}</option>`).join('')}</select><div class="invalid-feedback" id="timezone-error"></div></div>
            <div class="col-12"><div class="d-flex justify-content-between"><label class="form-label" for="bio">О себе</label><span class="char-count" id="bio-count">${draft.bio.length} / 280</span></div><textarea class="form-control" id="bio" name="bio" rows="4" maxlength="280" aria-describedby="bio-hint bio-error bio-count">${esc(draft.bio)}</textarea><div class="invalid-feedback" id="bio-error"></div><div class="form-text" id="bio-hint">Пара слов о вашей работе, интересах и подходе.</div></div>
          </div>
        </div>
        <div class="form-actions"><span id="save-note" class="save-note">Нет несохранённых изменений</span><div class="d-flex gap-2"><button type="button" class="btn btn-outline-secondary" id="reset-profile">Отменить</button><button type="submit" class="btn btn-primary" id="save-profile">Сохранить изменения <span aria-hidden="true">→</span></button></div></div>
      </form>
    </section>
    <aside class="profile-aside" aria-label="Карточка профиля">
      <section class="surface identity-card"><div class="identity-cover"><span class="cover-orbit" aria-hidden="true"></span></div><div class="identity-body"><div class="avatar avatar-large" id="profile-avatar" aria-hidden="true">${esc(initials())}</div><span class="detail-chip">Личный профиль</span><h2 id="profile-name">${esc(saved.firstName)} ${esc(saved.lastName)}</h2><p class="text-secondary" id="profile-city">${esc(saved.city) || 'Город не указан'}</p><div class="identity-divider"></div><span class="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</span><p class="identity-context" data-context>${esc(context)}</p></div></section>
      <section class="tip-card"><span class="tip-icon" aria-hidden="true">✦</span><h2>Данные под вашим контролем</h2><p>В этом образце изменения действуют до перезагрузки страницы.</p></section>
      <details class="demo-controls"><summary>Проверка состояний формы</summary><label class="form-check mt-3"><input class="form-check-input" type="checkbox" id="simulate-error"><span class="form-check-label">Ошибка при следующем сохранении</span></label></details>
    </aside>
  </div>`;
}

function initials(): string { return `${saved.firstName[0] ?? ''}${saved.lastName[0] ?? ''}`.toUpperCase(); }

function bindProfile(): void {
  const form = required<HTMLFormElement>('#profile-form');
  const status = required<HTMLElement>('#form-status');
  const summary = required<HTMLElement>('#error-summary');
  const submit = required<HTMLButtonElement>('#save-profile');
  const reset = required<HTMLButtonElement>('#reset-profile');
  const fields = Object.keys(saved) as Field[];
  const controls = fields.map(field => required<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`#${field}`, form));
  const version = pageVersion;
  let submitted = false;

  function updateErrors(): void {
    const errors = validateProfile(normalizeProfile(draft));
    for (const control of controls) {
      const error = errors[control.name as Field];
      control.classList.toggle('is-invalid', Boolean(error));
      control.setAttribute('aria-invalid', String(Boolean(error)));
      required<HTMLElement>(`#${control.name}-error`, form).textContent = error ?? '';
    }
  }

  function updateActions(): void {
    const dirty = hasChanges(draft, saved);
    const busy = formState === 'saving';
    controls.forEach(control => { control.disabled = busy; });
    submit.disabled = busy || !dirty;
    reset.disabled = busy || !dirty;
    form.setAttribute('aria-busy', String(busy));
    submit.innerHTML = busy ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Сохранение…' : 'Сохранить изменения <span aria-hidden="true">→</span>';
    required('#save-note').textContent = busy ? 'Сохраняем данные…' : dirty ? 'Есть несохранённые изменения' : 'Нет несохранённых изменений';
  }

  form.addEventListener('input', event => {
    const control = event.target as HTMLInputElement;
    if (!fields.includes(control.name as Field)) return;
    draft[control.name as Field] = control.value;
    formState = hasChanges(draft, saved) ? 'dirty' : 'idle';
    status.textContent = '';
    summary.hidden = true;
    if (submitted) updateErrors();
    required('#bio-count').textContent = `${draft.bio.length} / 280`;
    updateActions();
  });

  reset.addEventListener('click', () => {
    draft = { ...saved };
    formState = 'idle';
    renderPage();
    required<HTMLElement>('#firstName').focus();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (formState === 'saving' || !hasChanges(draft, saved)) return;
    submitted = true;
    const value = normalizeProfile(draft);
    const errors = validateProfile(value);
    updateErrors();
    if (Object.keys(errors).length) {
      formState = 'invalid';
      summary.innerHTML = `<strong>Проверьте данные перед сохранением.</strong><ul class="mb-0 mt-2">${fields.filter(field => errors[field]).map(field => `<li><a href="#${field}">${esc(errors[field]!)}</a></li>`).join('')}</ul>`;
      summary.hidden = false;
      summary.focus();
      return;
    }
    formState = 'saving';
    summary.hidden = true;
    status.className = 'status-message';
    status.textContent = 'Сохраняем изменения…';
    updateActions();
    try {
      const next = await saveDemoProfile(value, required<HTMLInputElement>('#simulate-error').checked);
      if (version !== pageVersion) return;
      saved = next;
      draft = { ...saved };
      controls.forEach(control => { control.value = saved[control.name as Field]; });
      formState = 'success';
      status.className = 'status-message success';
      status.textContent = 'Изменения сохранены в демо-сессии.';
      required('#profile-name').textContent = `${saved.firstName} ${saved.lastName}`;
      required('#profile-city').textContent = saved.city || 'Город не указан';
      required('#profile-avatar').textContent = initials();
      required('#account-name').textContent = `${saved.firstName} ${saved.lastName[0] ?? ''}.`;
      required('.avatar-small').textContent = initials();
    } catch (error) {
      if (version !== pageVersion) return;
      formState = 'error';
      summary.textContent = error instanceof Error ? error.message : 'Ошибка сохранения. Повторите попытку.';
      summary.hidden = false;
      summary.focus();
      status.textContent = '';
    } finally {
      if (version === pageVersion) {
        updateActions();
        if (formState === 'success') required<HTMLElement>('#firstName').focus();
      }
    }
  });
  updateActions();
}

renderPage();
