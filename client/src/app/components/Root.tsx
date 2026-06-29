import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  MessageSquare,
  XCircle,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  Bell,
  Plus,
  Dumbbell,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';

export function Root() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [gymSettings, setGymSettings] = useState<any>({
    gym_name: 'FitPro Gym',
    owner_name: 'Gym Owner'
  });
  const [stats, setStats] = useState({
    expired: 0,
    expiring_soon: 0
  });

  const fetchData = async () => {
    try {
      const [settingsRes, statsRes] = await Promise.all([
        axiosInstance.get('/api/settings'),
        axiosInstance.get('/api/memberships/stats')
      ]);
      if (settingsRes.data && settingsRes.data.gym_name) {
        setGymSettings(settingsRes.data);
      }
      if (statsRes.data) {
        setStats({
          expired: statsRes.data.expired || 0,
          expiring_soon: statsRes.data.expiring_soon || 0
        });
      }
    } catch (error) {
      console.error('Error fetching root sidebar info:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    {
      name: 'All Members',
      href: '/members',
      icon: Users,
      badge: stats.expired > 0 ? { count: stats.expired, color: 'bg-red-500 text-white' } : null
    },
    { name: 'Register Member', href: '/register', icon: UserPlus },
    {
      name: 'Auto Messages',
      href: '/messages',
      icon: MessageSquare,
      badge: stats.expiring_soon > 0 ? { count: stats.expiring_soon, color: 'bg-amber-500 text-white' } : null
    },
    { name: 'Unpaid / Expired', href: '/unpaid', icon: XCircle },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0f0f0f]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/5">
        <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/40 shrink-0">
          <Dumbbell className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <span className="font-extrabold text-white text-base tracking-tight">GymOS</span>
          <span className="block text-[10px] text-white/40 font-medium leading-none">Owner Panel</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-white/40 group-hover:text-red-400'} transition-colors`} />
                <span className="text-sm font-semibold">{item.name}</span>
              </div>
              {item.badge && (
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full ${item.badge.color}`}>
                  {item.badge.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-2">
          <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-sm shrink-0">
            {gymSettings.owner_name.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{gymSettings.owner_name}</p>
            <span className="text-[10px] text-white/40 font-medium truncate block">{gymSettings.gym_name}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-white/50 hover:text-red-400 hover:bg-white/5 rounded-xl transition-colors text-sm font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-[#f7f7f7] flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-black/5 bg-white/90 backdrop-blur-md px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-slate-600">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 border-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>

          {/* Desktop breadcrumb / brand */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-extrabold text-slate-900 text-sm tracking-tight">GymOS</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-sm font-semibold text-slate-500">
              {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
            </span>
          </div>
        </div>

        {/* Header Right */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-red-600 rounded-xl relative"
            onClick={() => navigate('/messages')}
          >
            <Bell className="w-4.5 h-4.5" />
            {stats.expiring_soon > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm shadow-red-600/20 transition-all duration-200 hover:scale-[1.02] text-xs font-bold h-8 px-3"
            onClick={() => navigate('/register')}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Member
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-60 lg:flex-col shrink-0">
          <SidebarContent />
        </aside>

        {/* Main Content — wider, dynamic, only this scrolls */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="w-full max-w-[1600px] mx-auto px-4 pb-8 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
