# Проверка образца — 8 октября 2026

- npm run build: TypeScript strict + Vite production bundle — PASS.
- npm test: 7 тестов — PASS.
- Desktop: профиль, sidebar, форма и карточка отображаются.
- Пустое имя: сводка ошибки, aria-invalid=true, фокус на сводке — PASS.
- Сохранение: aria-busy=true, поля disabled — PASS.
- Успешное сохранение: карточка и topbar обновляются, live status, фокус на имени — PASS.
- Искусственная ошибка: прежние сохранённые данные остаются, сводка получает фокус — PASS.
- Отмена: восстановление последнего успешного состояния — PASS.
- Контекст: изменение topbar и текущей страницы — PASS.
- /dashboard: прямая загрузка overview без изменения URL — PASS.
- /dashboard/overview: тот же renderer — PASS (registry + browser navigation).
- Mobile 390 px: Bootstrap Offcanvas открывается и получает фокус — PASS.
- Escape: закрытие, backdrop удалён, aria-expanded=false, фокус возвращён на кнопку — PASS.
- Выбор маршрута в mobile nav: меню закрыто, фокус на H1, URL изменён — PASS.
- Back: возврат к profile с фокусом на H1 — PASS.
- Узкий viewport 320 px: horizontal overflow отсутствует (scrollWidth = clientWidth) — PASS.

Это проверки standalone-образца. QA108 заказчика не выполнена: параметры и его quality gates не предоставлены.
