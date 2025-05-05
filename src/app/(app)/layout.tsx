import { BottomNav } from '@/components/layout/BottomNav';
import React from 'react';

// This layout wraps all pages inside the (app) group
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Main content area */}
      <main className="flex-grow pb-16 md:pb-0"> {/* Add padding-bottom for mobile nav */}
        {children}
      </main>

      {/* Bottom Navigation for mobile */}
      <BottomNav />
    </div>
  );
}
