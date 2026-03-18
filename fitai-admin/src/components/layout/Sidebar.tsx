'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  CreditCard,
  Users,
  BarChart3,
  Database,
  Utensils,
  Webhook,
  Shield,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/config',        icon: Settings,         label: 'Config' },
  { href: '/plans',         icon: CreditCard,       label: 'Plans' },
  { href: '/users',         icon: Users,            label: 'Users' },
  { href: '/analytics',     icon: BarChart3,        label: 'Analytics' },
  { href: '/cache',         icon: Database,         label: 'Cache' },
  { href: '/contributions', icon: Utensils,         label: 'Contributions' },
  { href: '/webhooks',      icon: Webhook,          label: 'Webhooks' },
  { href: '/admins',        icon: Shield,           label: 'Admins' },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-800">
        <span className="text-lg font-bold text-white">FitAI</span>
        <span className="ml-2 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">Admin</span>
      </div>
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path === href || path.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
