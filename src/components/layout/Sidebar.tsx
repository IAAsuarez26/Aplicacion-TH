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
  Coins,
  PieChart,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavigationTab =
  | 'dashboard'
  | 'empresas'
  | 'tabulador'
  | 'tipo_costos'
  | 'centros_costos'
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
      group: 'ESTRUCTURA CORPORATIVA & FINANZAS',
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
        {
          id: 'tipo_costos',
          label: 'Tipos de Costos',
          icon: Coins,
          badge: 'MOD/MOI',
        },
        {
          id: 'centros_costos',
          label: 'Centros de Costos',
          icon: PieChart,
          badge: '01-15',
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
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                Portal TH
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                  v2.0
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Gestión Organizacional</p>
            </div>
          </div>

          {/* Desktop collapse button */}
          {setIsCollapsed && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Ocultar menú lateral"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation items scroll area */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
          {navigationItems.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow'
                        : item.highlight
                        ? 'text-brand-300 hover:text-white hover:bg-slate-800/80 bg-brand-950/30 border border-brand-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-white' : item.highlight ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-medium ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isActive ? 'text-white translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Session Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 p-0.5 text-xs font-bold text-white flex items-center justify-center shrink-0">
                <span className="bg-slate-900 w-full h-full rounded-[10px] flex items-center justify-center">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user?.email || 'Usuario'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[10px] text-slate-400">En línea (InsForge DB)</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition-colors"
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
