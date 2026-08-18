import React from 'react';
import {
  LayoutDashboard,
  Building,
  Layers,
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
  PanelLeftClose,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavigationTab =
  | 'dashboard'
  | 'empresas'
  | 'tabulador'
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
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
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
  isCollapsed,
  setIsCollapsed,
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
      group: 'ESTRUCTURA CORPORATIVA',
      items: [
        {
          id: 'empresas',
          label: 'Empresas & Filiales',
          icon: Building,
          badge: 'Grupo',
        },
        {
          id: 'tabulador',
          label: 'Tabulador Salarial',
          icon: Layers,
          badge: '80-120%',
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
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-900/95 border-r border-slate-800/80 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isCollapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 p-0.5 shadow-glow flex items-center justify-center shrink-0">
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

          {/* Desktop collapse button */}
          {setIsCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
              title="Ocultar barra lateral"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {navigationItems.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400/90 mb-2">
                {group.group}
              </div>
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
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-brand-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-4 h-4 text-white/70" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Database Status & User Profile Footer */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          {/* InsForge Status Indicator */}
          <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-medium text-slate-300">InsForge TH_PB</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>

          {/* User Session Profile */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                {user?.name ? user.name.charAt(0) : user?.email?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-white truncate">
                  {user?.name || 'Administrador'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {user?.email || 'admin@th.local'}
                </div>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
