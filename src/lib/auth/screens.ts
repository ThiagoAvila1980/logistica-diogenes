/**
 * Catálogo das telas operacionais configuráveis pelo admin.
 * `key` bate com a coluna `screen` em `role_screen_access`.
 * `route` é o prefixo usado para casar com `pathname`.
 */
export type ScreenKey =
  | "dashboard"
  | "field"
  | "production"
  | "logistics"
  | "installation"
  | "concluded"
  | "administrative";

export type Screen = {
  key: ScreenKey;
  label: string;
  route: string;
};

export const SCREENS: Screen[] = [
  { key: "dashboard",    label: "Painel",             route: "/dashboard" },
  { key: "field",        label: "Medições",            route: "/field" },
  { key: "production",   label: "Corte e Logística",   route: "/production" },
  { key: "logistics",    label: "Transporte",          route: "/logistics" },
  { key: "installation", label: "Instalação",          route: "/installation" },
  { key: "concluded",    label: "Concluídos",          route: "/concluded" },
  { key: "administrative", label: "Administrativo",    route: "/admin/users" },
];

export const SCREEN_KEYS: ScreenKey[] = SCREENS.map((s) => s.key);

/** Retorna a tela cujo route-prefix bate com o pathname, ou undefined. */
export function screenForPathname(pathname: string): Screen | undefined {
  return SCREENS.find(
    (s) => pathname === s.route || pathname.startsWith(`${s.route}/`),
  );
}
