'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/hooks/useTheme';

const NAV = [
  { href: '/',            label: 'Home',     key: 'H', section: 'Main' },
  { href: '/kanban',      label: 'Kanban',   key: 'K', section: 'Main' },
  { href: '/brain',       label: 'Brain',    key: 'B', section: 'Main' },
  { href: '/calendar',    label: 'Calendar', key: 'L', section: 'Main' },
  { href: '/research',    label: 'Research',  key: 'E', section: 'Main' },
  { href: '/pipeline',    label: 'Pipeline', key: 'P', section: 'Main' },
  { href: '/agents',      label: 'Agents',   key: 'A', section: 'Monitor' },
  { href: '/cron',        label: 'Cron',     key: 'C', section: 'Monitor' },
  { href: '/healthcheck', label: 'Health',   key: 'H', section: 'Monitor' },
  { href: '/monitoring',  label: 'Monitor',  key: 'M', section: 'Monitor' },
  { href: '/skills',      label: 'Skills',   key: 'S', section: 'System' },
  { href: '/system',      label: 'System',   key: 'Y', section: 'System' },
  { href: '/brief',       label: 'Brief',    key: 'R', section: 'System' },
];

export function SideBar() {
  const pathname = usePathname();
  const sectionOrder = ['Main', 'Monitor', 'System'];
  const sections = sectionOrder.filter(s => NAV.some(n => n.section === s));

  const { resolvedTheme, setTheme } = useTheme();
  const [nodeVersion, setNodeVersion] = useState('');
  useEffect(() => { setNodeVersion(process.version.slice(0, 5)); }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sb-brand">
        <span className="sb-dot" />
        <span>MC v2.0</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {sections.map(sec => (
          <div key={sec}>
            <div className="sb-section-label">{sec}</div>
            {NAV.filter(n => n.section === sec).map(n => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`nav-item${active ? ' active' : ''}`}
                >
                  <span className="nav-key">{n.key}</span>
                  <span>{n.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sb-footer">
        <span>v2.0.0{nodeVersion ? ` · Node ${nodeVersion}` : ''}</span>
        <button onClick={toggleTheme} className="theme-btn">
          {resolvedTheme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </aside>
  );
}
