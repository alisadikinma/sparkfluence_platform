import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { ScrollToTop } from '../ScrollToTop';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-page">
      <PublicNavbar />
      <main className="flex-1 pt-16 md:pt-[72px] lg:pt-20">
        <Outlet />
      </main>
      <PublicFooter />
      <ScrollToTop />
    </div>
  );
};
