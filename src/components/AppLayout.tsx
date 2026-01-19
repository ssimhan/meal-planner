'use client';
import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
    },
    {
      id: 'plan',
      label: 'Meal Plan',
      path: '/plan',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      ),
    },
    {
      id: 'recipes',
      label: 'Recipes',
      path: '/recipes',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
    },
    {
      id: 'inventory',
      label: 'Inventory',
      path: '/inventory',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
    },
    {
      id: 'shop',
      label: 'Shop',
      path: '/shop',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/settings',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
    },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-body)]">
      {/* Sidebar */}
      <nav className="w-72 bg-[var(--bg-sidebar)]/80 backdrop-blur-xl border-r border-[var(--border-subtle)] flex flex-col gap-10 p-6 pt-10 z-20 shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--text-main)]/5 to-transparent pointer-events-none" />

        {/* Brand */}
        <div className="flex items-center gap-4 px-2 relative">
          <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-sage)] rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-[var(--accent-primary)]/20 rotate-3">
            M
          </div>
          <span className="text-2xl font-black text-[var(--text-main)] tracking-tight">MealPlanner</span>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col gap-2 relative">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl font-semibold transition-all group ${isActive
                  ? 'bg-[var(--bg-card)] text-[var(--nav-active-text)] shadow-sm border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]/50 hover:text-[var(--text-main)]'
                  }`}
              >
                <span className={`transition-transform group-hover:scale-110 ${isActive ? 'text-[var(--accent-primary)]' : ''}`}>
                  {item.icon}
                </span>
                <span className="tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-[var(--border-subtle)] pt-8 relative">
          <div className="px-4 py-3 bg-[var(--bg-card)]/40 rounded-2xl border border-[var(--border-subtle)]/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] flex items-center justify-center text-xs">👤</div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--text-main)]">Demo User</span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">Family Pro</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="p-8 lg:p-12 relative z-10">
          {/* Header with Theme Toggle */}
          <div className="flex justify-end mb-6">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full flex items-center justify-center hover:bg-[var(--bg-sidebar)] transition-all"
              title="Toggle Theme"
            >
              {mounted && theme === 'light' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              ) : mounted && theme === 'dark' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <div className="w-5 h-5" /> // Placeholder to prevent layout shift
              )}
            </button>
          </div>

          {/* Page Content */}
          {children}
        </div>
      </main>
    </div>
  );
}
