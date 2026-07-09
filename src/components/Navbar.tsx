import React from 'react';
import { useApp } from '../hooks/useApp';
import { Coffee, Package, BarChart3, Tag, LogOut, User as UserIcon, Settings, Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavbarProps {
  activeView: 'pos' | 'inventory' | 'reports' | 'discounts' | 'settings';
  setActiveView: (view: 'pos' | 'inventory' | 'reports' | 'discounts' | 'settings') => void;
  logoUrl?: string;
}

const Navbar: React.FC<NavbarProps> = ({ activeView, setActiveView, logoUrl }) => {
  const { user, logout, settings, theme, toggleTheme } = useApp();

  const navItems = [
    { id: 'pos', label: 'Point of Sale', icon: Coffee, roles: ['admin', 'cashier'] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: ['admin', 'cashier'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'cashier'] },
    { id: 'discounts', label: 'Discounts', icon: Tag, roles: ['admin', 'cashier'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin', 'cashier'] },
  ];

  const cafeLogo = settings?.logoUrl || logoUrl;
  const cafeName = settings?.name || 'BossKasir';
  const nameParts = cafeName.split(' ');
  const mainName = nameParts[0];
  const subName = nameParts.slice(1).join(' ');

  return (
    <nav className="bg-white border-b border-coffee-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-3">
        {cafeLogo ? (
          <img src={cafeLogo} alt="Logo" className="h-10 w-10 object-cover rounded-xl" />
        ) : (
          <div className="p-2 bg-coffee-800 rounded-xl text-cream-50">
            <Coffee size={24} />
          </div>
        )}
        <h1 className="text-xl font-black tracking-tighter text-coffee-900 italic">
          {mainName} <span className="text-coffee-600 font-normal">{subName}</span>
        </h1>
      </div>

      <div className="flex items-center gap-1">
        {navItems.filter(item => item.roles.includes(user?.role || '')).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium",
              activeView === item.id 
                ? "bg-coffee-50 text-coffee-800" 
                : "text-coffee-400 hover:text-coffee-600 hover:bg-coffee-50/50"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 pl-4 border-l border-coffee-100">
        <button
          onClick={toggleTheme}
          className="p-2 text-coffee-400 hover:text-coffee-600 hover:bg-coffee-50/50 rounded-lg transition-all"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold text-coffee-800">{user?.username}</span>
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-coffee-400">
            <UserIcon size={10} />
            {user?.role}
          </div>
        </div>
        <button 
          onClick={logout}
          className="p-2 text-coffee-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors tooltip"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
