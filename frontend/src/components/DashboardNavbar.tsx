'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Home,
  LogOut,
  ShieldCheck,
  Ticket,
  UserCircle,
  Users,
} from 'lucide-react';

import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

type DashboardRole = 'student' | 'organizer' | 'admin';

type DashboardNavbarProps = {
  role: DashboardRole;
  title: string;
  subtitle: string;
  backHref?: string;
  trailingActions?: ReactNode;
};

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
};

const roleLinks: Record<DashboardRole, NavItem[]> = {
  student: [
    { key: 'student-dashboard', label: 'Dashboard', href: '/dashboard/student', icon: <Home className="h-4 w-4" /> },
    { key: 'student-profile', label: 'Profile', href: '/dashboard/student/profile', icon: <UserCircle className="h-4 w-4" /> },
  ],
  organizer: [
    { key: 'organizer-dashboard', label: 'Dashboard', href: '/dashboard/organizer', icon: <Home className="h-4 w-4" /> },
    { key: 'organizer-analytics', label: 'Analytics', href: '/dashboard/organizer/analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'organizer-profile', label: 'Profile', href: '/dashboard/organizer/profile', icon: <UserCircle className="h-4 w-4" /> },
  ],
  admin: [
    { key: 'admin-dashboard', label: 'Dashboard', href: '/dashboard/admin', icon: <Home className="h-4 w-4" /> },
    { key: 'admin-approvals', label: 'Approvals', href: '/dashboard/admin', icon: <Users className="h-4 w-4" /> },
    { key: 'admin-control', label: 'Control', href: '/dashboard/admin', icon: <ShieldCheck className="h-4 w-4" /> },
  ],
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNavbar({
  role,
  title,
  subtitle,
  backHref,
  trailingActions,
}: DashboardNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const links = roleLinks[role];

  return (
    <header className="relative z-20 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-4">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/78 px-3 py-3 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {backHref ? (
                <button
                  onClick={() => router.push(backHref)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-neutral-200/80 bg-white text-neutral-700 transition hover:bg-neutral-100"
                  aria-label="Go back"
                  title="Go back"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                </button>
              ) : null}

              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#111827_100%)] text-white shadow-sm">
                  <Ticket className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-lg font-semibold tracking-tight text-neutral-950">UniEvent</p>
                    <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
                      {role}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium text-neutral-900">{title}</p>
                  <p className="truncate text-xs text-neutral-500">{subtitle}</p>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3 xl:items-end">
              <nav
                aria-label={`${role} dashboard navigation`}
                className="flex w-full flex-wrap items-center gap-2 rounded-[1.2rem] border border-neutral-200/80 bg-neutral-50/90 p-1.5 xl:w-auto"
              >
                {links.map((item) => {
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-[0.95rem] px-3.5 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-neutral-900 text-white shadow-sm'
                          : 'text-neutral-700 hover:bg-white'
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex flex-wrap items-center justify-between gap-2 xl:justify-end">
                <div className="min-w-0 rounded-full border border-neutral-200/80 bg-white px-3 py-2 text-sm text-neutral-600">
                  <span className="font-semibold text-neutral-900">{user?.name}</span>
                  <span className="mx-2 text-neutral-300">/</span>
                  <span className="truncate">{user?.department || user?.email}</span>
                </div>

                <div className="flex items-center gap-2">
                  {trailingActions}
                  <NotificationBell />
                  <button
                    onClick={logout}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-neutral-200/80 pt-3 text-xs text-neutral-500">
            <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
            <span className="font-medium uppercase tracking-[0.16em] text-neutral-400">{role}</span>
            <span className="truncate text-neutral-600">{title}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
