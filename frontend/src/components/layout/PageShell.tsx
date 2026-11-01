import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface PageShellProps {
  currentSection?: string;
  children: React.ReactNode;
}

export const PageShell: React.FC<PageShellProps> = ({ currentSection, children }) => {
  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar />
      <div className="pl-[260px] w-full min-h-screen flex flex-col">
        <Header currentSection={currentSection} />
        <main className="w-full pt-16 flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
};

