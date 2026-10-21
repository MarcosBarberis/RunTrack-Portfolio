import { clearSession } from '../services/api';
import { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ActivitySquare,
  Calendar,
  Menu,
  X,
  Layers,
  CalendarClock,
  CreditCard,
  FileText 
} from 'lucide-react';

const navItems = [
  { name: 'Panel', path: '/coach', icon: LayoutDashboard },
  { name: 'Corredores', path: '/coach/corredores', icon: Users },
  { name: 'Ver Entrenamientos', path: '/coach/entrenamientos', icon: ActivitySquare },
  { name: 'Asistencia', path: '/coach/asistencia', icon: Calendar },
  { name: 'Categorías', path: '/coach/categorias', icon: Layers },
  { name: 'Crear Entrenamientos', path: '/coach/eventos-entrenamiento', icon: CalendarClock },
  { name: 'Cuotas', path: '/coach/cuotas', icon: CreditCard },
  { name: 'Documentos', path: '/coach/documentos', icon: FileText },

];


export default function Layout() {
  const nav = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  function logout() {
    clearSession();
    nav('/login', { replace: true });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      {/* Sidebar for desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col z-50">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900/90 backdrop-blur-xl px-6 pb-4 border-r border-slate-800/50">
          <div className="flex h-20 shrink-0 items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-500 rounded-xl flex items-center justify-center">
             <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-500 rounded-xl flex items-center justify-center">
  		<img
  		  src={`${import.meta.env.BASE_URL}media/brand/logo2.png`}
  		  alt="AFRunning"
  		  className="w-6 h-6 object-contain"
  		/>
		</div>
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
                AFRunning
              </h1>
              <p className="text-xs text-slate-400 font-body">Performance Analytics</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`group flex gap-x-3 rounded-xl px-4 py-3 text-sm font-semibold leading-6 transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 text-white border border-primary-500/30 shadow-lg shadow-primary-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 shrink-0 ${
                        isActive(item.path) ? 'text-primary-400' : 'text-slate-500 group-hover:text-primary-400'
                      }`}
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout en sidebar (opcional, pero queda mejor que en topbar) */}
          <button
            onClick={logout}
            className="mt-4 w-full px-4 py-2 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800"
            type="button"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/50">
            <div className="flex h-20 items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-500 rounded-xl flex items-center justify-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-500 rounded-xl flex items-center justify-center">
  		<img
   		 src={`${import.meta.env.BASE_URL}media/brand/logo2.png`}
   		 alt="AFRunning"
  		  className="w-6 h-6 object-contain"
 		 />
		</div>
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
                    AFRunning
                  </h1>
                  <p className="text-xs text-slate-400 font-body">Performance Analytics</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="px-6 mt-6">
              <ul role="list" className="flex flex-col gap-y-2">
                {navItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`group flex gap-x-3 rounded-xl px-4 py-3 text-sm font-semibold leading-6 transition-all duration-200 ${
                        isActive(item.path)
                          ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 text-white border border-primary-500/30 shadow-lg shadow-primary-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <item.icon
                        className={`h-5 w-5 shrink-0 ${
                          isActive(item.path) ? 'text-primary-400' : 'text-slate-500 group-hover:text-primary-400'
                        }`}
                      />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>

              <button
                onClick={logout}
                className="mt-4 w-full px-4 py-2 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800"
                type="button"
              >
                Cerrar sesión
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top header */}
        <div className="sticky top-0 z-40 flex h-20 shrink-0 items-center gap-x-4 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
            <div className="flex items-center gap-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-slate-400 font-body">System Active</span>
            </div>
            <div className="ml-auto flex items-center gap-x-4">
              <span className="text-sm text-slate-400 font-mono">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-10 relative z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
