import React, { useState } from 'react';
import { Sidebar, NavigationTab } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  activeTab,
  setActiveTab,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          activeTab={activeTab}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>

        <footer className="py-6 px-8 border-t border-slate-800/60 text-center text-xs text-slate-400">
          <p>
            Sistema de Gestión de Talento Humano © {new Date().getFullYear()} — Desarrollado con React, Vite, TypeScript e InsForge BaaS.
          </p>
        </footer>
      </div>
    </div>
  );
};
