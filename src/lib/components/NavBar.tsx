'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',        label: '首页',    icon: '🏠' },
  { href: '/kanban',  label: '看板',    icon: '📋' },
  { href: '/brain',   label: '大脑',    icon: '🧠' },
  { href: '/agents',  label: 'Agents',  icon: '🤖' },
  { href: '/cron',    label: 'Cron',    icon: '⏰' },
  { href: '/healthcheck', label: '健康', icon: '💊' },
  { href: '/skills',  label: 'Skills',  icon: '🧩' },
  { href: '/system',  label: '系统',    icon: '🖥️' },
  { href: '/brief',   label: '晨报',    icon: '📰' },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex gap-1 overflow-x-auto">
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              pathname === n.href
                ? 'bg-blue-600 text-white font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{n.icon}</span>
            <span>{n.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
