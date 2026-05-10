import type { Metadata } from 'next';
import './globals.css';
import { SideBar } from '@/lib/components/SideBar';
import { ThemeProvider } from '@/lib/hooks/useTheme';

export const metadata: Metadata = {
  title: 'Mission Control v2.0',
  description: 'OpenClaw Agent Orchestration Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body style={{ margin: 0, fontFamily: 'var(--font-body)' }}>
        <ThemeProvider>
          <div className="shell">
            <SideBar />
            <main className="main-content">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
