import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  ClipboardList,
  History,
  House,
  UserRound,
  Users,
} from 'lucide-react';

export interface NavigationItem {
  label: string;
  /** Used by the six-item mobile bar, where full labels do not fit. */
  shortLabel: string;
  to: string;
  icon: LucideIcon;
}

const trainingItems: readonly NavigationItem[] = [
  { label: 'Ana sayfa', shortLabel: 'Ana sayfa', to: '/app', icon: House },
  {
    label: 'Antrenmanlar',
    shortLabel: 'Antrenman',
    to: '/app/history',
    icon: History,
  },
  {
    label: 'Programlar',
    shortLabel: 'Program',
    to: '/app/programs',
    icon: ClipboardList,
  },
  {
    label: 'Raporlar',
    shortLabel: 'Rapor',
    to: '/app/reports',
    icon: BarChart3,
  },
];
const clientsItem: NavigationItem = {
  label: 'Danışanlar',
  shortLabel: 'Danışan',
  to: '/app/clients',
  icon: Users,
};
const profileItem: NavigationItem = {
  label: 'Profil',
  shortLabel: 'Profil',
  to: '/app/profile',
  icon: UserRound,
};

/** Coaches get their client list before the profile. */
export function navigationItemsFor(
  isCoach: boolean,
): readonly NavigationItem[] {
  return isCoach
    ? [...trainingItems, clientsItem, profileItem]
    : [...trainingItems, profileItem];
}

export function isNavigationItemActive(pathname: string, to: string) {
  if (to === '/app') {
    return (
      pathname === '/app' ||
      pathname.startsWith('/app/muscles/') ||
      pathname.startsWith('/app/exercises/')
    );
  }

  return pathname === to || pathname.startsWith(`${to}/`);
}
