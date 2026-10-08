'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Cat, House, LogOut, Plus, ReceiptText, Scale, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/expenses', label: 'Expenses', icon: ReceiptText },
  { href: '/cat', label: 'Cat', icon: Cat },
  { href: '/settlement', label: 'Settle', icon: Scale },
  { href: '/profile', label: 'Profile', icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const authPage = ['/', '/login', '/signup', '/forgot-password', '/update-password'].includes(pathname);
  if (authPage) return <>{children}</>;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign('/login');
  }

  return (
    <div className="app-frame">
      {!online && (
        <div className="offline-banner" role="status">
          You’re offline. Reconnect before saving household changes.
        </div>
      )}
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/home">
            <span className="brand-mark"><House size={19} /></span>
            <span>Expense Manager<span className="brand-dot">.</span></span>
          </Link>
          <div className="top-actions">
            <Link className="icon-button" href="/notifications" aria-label="Notifications">
              <Bell size={19} />
            </Link>
            <Link className="avatar-mini" href="/profile" aria-label="Profile">
              Y
            </Link>
            <button className="icon-button desktop-logout" onClick={signOut} aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="app-shell-body">
        <aside className="side-nav" aria-label="Main navigation">
          <div className="side-nav-links">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                className={`nav-link ${
                  pathname === href || (href === '/expenses' && pathname.startsWith('/expenses') && pathname !== '/expenses/new')
                    ? 'active'
                    : ''
                }`}
                href={href}
              >
                <Icon size={19} />
                <span>{label}</span>
              </Link>
            ))}
            <Link
              className={`nav-link add-expense-nav ${pathname === '/expenses/new' ? 'active' : ''}`}
              href="/expenses/new"
            >
              <Plus size={19} />
              <span>Add expense</span>
            </Link>
          </div>
        </aside>

        <main className="main-content">
          {children}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            className={`bottom-link ${
              pathname === href || (href === '/expenses' && pathname.startsWith('/expenses')) ? 'active' : ''
            }`}
            href={href}
          >
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
