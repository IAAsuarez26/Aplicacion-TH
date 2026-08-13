import React from 'react';
import {
  LayoutDashboard,
  Building2,
  GitFork,
  Network,
  Briefcase,
  Users,
  History,
  ShieldCheck,
  LogOut,
  Sparkles,
  ChevronRight,
  Database,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavigationTab =
  | 'dashboard'
  | 'direcciones'
  | 'gerencias'
  | 'departamentos'
  | 'cargos'
  | 'empleados'
  | 'historial'
  | 'organigrama'
  | 'responsables';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  highlight?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
}) => {
  const { user, signOut } = useAuth();

  const navigationItems: NavGroup[] = [
    {
      group: 'PANEL PRINCIPAL',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard General',
          icon: LayoutDashboard,
          badge: 'KPIs',
        },
      ],
    },
    {
      group: 'ESTRUCTURA ORGANIZATIVA',
      items: [
        {
          id: 'direcciones',
          label: 'Direcciones (Nivel 1)',
          icon: Building2,
        },
        {
          id: 'gerencias',
          label: 'Gerencias (Nivel 2)',
          icon: GitFork,
        },
        {
          id: 'departamentos',
          label: 'Departamentos (Nivel 3)',
          icon: Network,
        },
      ],
    },
    {
      group: 'GESTIÓN DE TALENTO',
      items: [
        {
          id: 'cargos',
          label: 'Catálogo de Cargos',
          icon: Briefcase,
        },
        {
          id: 'empleados',
          label: 'Ficha de Empleados',
          icon: Users,
          highlight: true,
        },
        {
          id: 'historial',
          label: 'Historial de Traslados',
          icon: History,
        },
      ],
    },
    {
      group: 'JERARQUÍA & REPORTES',
      items: [
        {
          id: 'organigrama',
          label: 'Organigrama & Mando',
          icon: Network,
          badge: 'Live',
        },
        {
          id: 'responsables',
          label: 'Responsables por Área',
          icon: ShieldCheck,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-900/95 border-r border-slate-800/80 backdrop-blur-xl flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 p-0.5 shadow-glow flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-brand-400" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Talento Humano
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  TH
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Gestión Organizacional</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {navigationItems.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              <h2 className="px-3 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                {group.group}
              </h2>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow font-semibold'
                          : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? 'text-white' : 'text-slate-400'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* InsForge Status & User footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
          {/* Backend link badge */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-slate-200">InsForge Backend</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">TH_PB</span>
          </div>

          {/* User Profile bar */}
          {user && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-300 text-xs font-bold shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {user.name || user.email.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
