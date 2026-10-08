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
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

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

  useEffect(() => {
    setPendingPath(null);
    setIsNavigating(false);
  }, [pathname]);

  const authPage = ['/', '/login', '/signup', '/forgot-password', '/update-password'].includes(pathname);
  if (authPage) return <>{children}</>;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign('/login');
  }

  const currentPath = pendingPath ?? pathname;

  const isLinkActive = (href: string) => {
    return (
      currentPath === href ||
      (href === '/expenses' && currentPath.startsWith('/expenses') && currentPath !== '/expenses/new')
    );
  };

  const handleNavClick = (href: string) => {
    if (pathname !== href) {
      setPendingPath(href);
      setIsNavigating(true);
    }
  };

  return (
    <div className="app-frame">
      {isNavigating && <div className="nav-progress-bar" aria-hidden="true" />}
      {!online && (
        <div className="offline-banner" role="status">
          You’re offline. Reconnect before saving household changes.
        </div>
      )}
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/home" prefetch={true} onClick={() => handleNavClick('/home')}>
            <span className="brand-mark"><House size={19} /></span>
            <span>Expense Manager<span className="brand-dot">.</span></span>
          </Link>
          <div className="top-actions">
            <Link className="icon-button" href="/notifications" prefetch={true} aria-label="Notifications">
              <Bell size={19} />
            </Link>
            <Link className="avatar-mini" href="/profile" prefetch={true} aria-label="Profile">
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
                className={`nav-link ${isLinkActive(href) ? 'active' : ''}`}
                href={href}
                prefetch={true}
                onClick={() => handleNavClick(href)}
              >
                <Icon size={19} />
                <span>{label}</span>
              </Link>
            ))}
            <Link
              className={`nav-link add-expense-nav ${currentPath === '/expenses/new' ? 'active' : ''}`}
              href="/expenses/new"
              prefetch={true}
              onClick={() => handleNavClick('/expenses/new')}
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
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isLinkActive(href);
          const isPending = pendingPath === href;
          return (
            <Link
              key={href}
              className={`bottom-link ${active ? 'active' : ''} ${isPending ? 'pending-nav' : ''}`}
              href={href}
              prefetch={true}
              onClick={() => handleNavClick(href)}
            >
              <Icon size={21} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
