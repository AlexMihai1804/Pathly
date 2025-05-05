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
      {/* pb-16 adds padding to the bottom only on small screens (default) */}
      {/* md:pb-0 removes the padding on medium screens and larger */}
      <main className="flex-grow pb-16 md:pb-0">
        {children}
      </main>

      {/* Bottom Navigation for mobile - shown only on md breakpoint and below */}
      <BottomNav />
    </div>
  );
}
