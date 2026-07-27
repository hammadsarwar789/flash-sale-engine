import React from 'react';
import { Outlet } from 'react-router-dom';
import { TickerBar } from '../common/TickerBar';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-bone text-ink selection:bg-signal selection:text-signal-ink">
      <TickerBar />
      <Navbar />
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
