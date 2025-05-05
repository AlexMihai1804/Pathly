'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Compass, Search, Heart, ListChecks, Route, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon: Icon, label }) => {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <button
      onClick={() => router.push(href)} // This should handle navigation
      className={cn(
        'flex flex-col items-center justify-center flex-1 px-2 py-2 text-xs transition-colors duration-200 ease-in-out focus:outline-none',
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className={cn('h-5 w-5 mb-1', isActive ? 'text-primary' : 'text-muted-foreground')} strokeWidth={isActive ? 2.5 : 2} />
      <span className={cn('truncate', isActive ? 'font-semibold' : 'font-medium')}>{label}</span>
    </button>
  );
};

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  // Hide Nav on login page or potentially others
  if (pathname === '/login') {
    return null;
  }


  const navItems: NavItemProps[] = [
    { href: '/discover', icon: Compass, label: 'Discover' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/favorites', icon: Heart, label: 'Favorites' },
    { href: '/plan', icon: ListChecks, label: 'Plan' },
    { href: '/itinerary', icon: Route, label: 'Itinerary' },
    { href: '/account', icon: User, label: 'Account' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t bg-background shadow-up md:hidden">
      {navItems.map((item) => (
        <NavItem key={item.href} {...item} />
      ))}
    </nav>
  );
};
