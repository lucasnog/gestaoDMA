import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  LogOut,
  Building2,
  FilePlus,
  X,
  Shield,
  Info,
  Clock,
  BadgeCheck,
  UserCheck,
  DollarSign,
} from "lucide-react";
import { useAuthStore } from "../../stores/auth.store";

const Sidebar = ({ contractsAlertCount = 0, isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const mainMenu = [
    {
      path: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      description: "Visão executiva",
    },
    {
      path: "/medicoes",
      label: "Medições",
      icon: BarChart3,
      description: "Histórico de medições",
    },
    {
      path: "/aditivos",
      label: "Aditivos",
      icon: FilePlus,
      description: "Readequações & reequilíbrios",
    },
    {
      path: "/apostilas",
      label: "Apostilas",
      icon: BadgeCheck,
      description: "Reajustes contratuais",
    },
    {
      path: "/os",
      label: "Ordens de Serviço",
      icon: Clock,
      description: "Histórico de OS",
    },
    {
      path: "/empenhos",
      label: "Empenhos",
      icon: DollarSign,
      description: "Empenhos do contrato",
    },
    {
      path: "/empresas",
      label: "Empresas",
      icon: Building2,
      description: "Fornecedores e prestadores",
    },
    {
      path: "/gestores",
      label: "Gestores",
      icon: UserCheck,
      description: "Gestores e fiscais dos contratos",
    },
  ];

  const { user, isAdmin, logout } = useAuthStore();

  const podeAcessar = () => true;

  // Menu admin — aparece se for admin OU emails autorizados
  const isOwner =
    user?.email &&
    (user.email.includes("lucasnog") || user.email.includes("goinfra") || user.email.includes("tati.souza02"));

  const supportMenu = [
    // { path: '/relatorios', label: 'Relatórios', icon: ShieldCheck },
    { path: "/sobre", label: "Sobre", icon: Info },
  ];

  const adminMenu =
    isAdmin() || isOwner
      ? [{ path: "/admin", label: "Administração", icon: Shield }]
      : [];

  const isActive = (path) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const handleNav = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-emerald-950">
      {/* Logo Area */}
      <div className="pt-6 pb-3 border-b border-emerald-900/20 flex flex-col items-center">
        <img
          src="/Logo de gestão financeira..png"
          alt="Logo Gestão DMA"
          className="w-[13.5rem] h-auto object-contain"
          style={{
            filter: 'drop-shadow(0 0 1.5px #ffffff) drop-shadow(0 0 1.5px #ffffff) drop-shadow(0 0 1.5px #ffffff)',
          }}
        />
        <p className="relative z-10 text-[11px] font-bold text-emerald-400/90 uppercase tracking-[0.35em] -mt-11">
          Analytics
        </p>
        {/* Close button - mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg text-emerald-400/60 hover:bg-emerald-900/30 hover:text-emerald-200/80 transition-colors absolute top-4 right-4"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-5">
        <p className="px-3 pb-3 text-[9px] font-semibold text-emerald-600/50 uppercase tracking-[0.2em]">
          Navegação Principal
        </p>
        <nav className="space-y-1">
          {mainMenu.filter(m => podeAcessar(m.path)).map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                  active
                    ? "bg-emerald-600/15 text-white shadow-sm shadow-emerald-500/5"
                    : "text-emerald-400/60 hover:bg-emerald-900/30 hover:text-emerald-200/80"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                )}
                <item.icon
                  size={18}
                  className={active ? "text-emerald-500" : ""}
                  strokeWidth={active ? 2.5 : 2}
                />
                <div className="flex-1 text-left">
                  <p
                    className={`text-sm font-semibold leading-tight ${active ? "text-white" : ""}`}
                  >
                    {item.label}
                  </p>
                  <p
                    className={`text-[10px] font-medium ${active ? "text-emerald-400/70" : "text-emerald-500/40"} leading-tight`}
                  >
                    {item.description}
                  </p>
                </div>
                {item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-8 pt-5 border-t border-emerald-900/15">
          <p className="px-3 pb-3 text-[9px] font-semibold text-emerald-600/50 uppercase tracking-[0.2em]">
            Suporte
          </p>
          <nav className="space-y-1">
            {supportMenu.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                    active
                      ? "bg-emerald-600/15 text-white"
                      : "text-emerald-400/50 hover:bg-emerald-900/30 hover:text-emerald-200/80"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full bg-emerald-500" />
                  )}
                  <item.icon size={16} strokeWidth={active ? 2.5 : 2} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Admin section — so para admins */}
        {adminMenu.length > 0 && (
          <div className="mt-6 pt-5 border-t border-emerald-900/15">
            <p className="px-3 pb-3 text-[9px] font-semibold text-emerald-600/50 uppercase tracking-[0.2em]">
              Administração
            </p>
            <nav className="space-y-1">
              {adminMenu.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                      active
                        ? "bg-emerald-600/15 text-white"
                        : "text-emerald-400/50 hover:bg-emerald-900/30 hover:text-emerald-200/80"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full bg-emerald-500" />
                    )}
                    <item.icon size={16} strokeWidth={active ? 2.5 : 2} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Area */}
      <div className="px-3 py-4 border-t border-emerald-900/20 bg-emerald-950/80">
        <div className="flex items-center gap-3 px-3 mb-3">
          {user?.foto ? (
            <img
              src={user.foto}
              alt=""
              className="w-8 h-8 rounded-lg object-cover ring-2 ring-emerald-800/50"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-emerald-800/40 border border-emerald-700/30 flex items-center justify-center">
              <span className="text-emerald-300 font-bold text-xs">
                {(user?.nome || "U")[0]}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-emerald-200/90 truncate">
              {user?.nome || "Usuário"}
            </p>
            <p className="text-[9px] font-medium text-emerald-500/50 truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-emerald-500/40 hover:text-emerald-400/70 hover:bg-emerald-900/20 transition-all duration-200 group"
        >
          <LogOut
            size={14}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          <span className="text-[11px] font-medium">Sair</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 h-screen shrink-0 bg-emerald-950">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[99999] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer */}
          <aside className="relative w-72 h-full shadow-sidebar animate-slide-in">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
