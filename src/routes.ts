export type Page = 'overview' | 'profile' | 'professional' | 'contexts' | 'settings';
export interface Route {
  path: string;
  label: string;
  page: Page;
  symbol: string;
  parent?: string;
  menu?: boolean;
}

// One registry feeds routing, sidebar, title, tabs and breadcrumbs.
export const routes: readonly Route[] = [
  { path: '/dashboard', label: 'Обзор', page: 'overview', symbol: '◫' },
  { path: '/dashboard/overview', label: 'Обзор', page: 'overview', symbol: '◫', menu: true },
  { path: '/dashboard/profile', label: 'Личные данные', page: 'profile', symbol: '○', menu: true },
  { path: '/dashboard/profile/professional', label: 'Профессиональный профиль', page: 'professional', symbol: '◇', parent: '/dashboard/profile' },
  { path: '/dashboard/work-contexts', label: 'Рабочие контексты', page: 'contexts', symbol: '▦', menu: true },
  { path: '/dashboard/settings', label: 'Настройки', page: 'settings', symbol: '⚙', menu: true },
];

export function resolveRoute(path: string): Route | undefined {
  const normalized = path.replace(/\/+$/, '') || '/';
  return routes.find(route => route.path === normalized);
}

export function isMenuActive(item: Route, route: Route): boolean {
  return item.path === route.path || item.page === route.page || route.parent === item.path;
}

export function breadcrumbs(route: Route): Route[] {
  const root = routes[0]!;
  if (route.page === 'overview') return [root];
  const parent = routes.find(item => item.path === route.parent);
  return parent ? [root, parent, route] : [root, route];
}
