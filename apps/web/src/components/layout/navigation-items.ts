import type { LucideIcon } from 'lucide-react';
import { BarChart3, History, House, UserRound } from 'lucide-react';

export interface NavigationItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const navigationItems: readonly NavigationItem[] = [
  { label: 'Ana sayfa', to: '/app', icon: House },
  { label: 'Antrenmanlar', to: '/app/history', icon: History },
  { label: 'Raporlar', to: '/app/reports', icon: BarChart3 },
  { label: 'Profil', to: '/app/profile', icon: UserRound },
];

export function isNavigationItemActive(pathname: string, to: string) {
  if (to === '/app') {
    return (
      pathname === '/app' ||
      pathname.startsWith('/app/muscles/') ||
      pathname.startsWith('/app/exercises/')
    );
  }

  return pathname === to;
}
