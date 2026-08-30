import { NavLink } from "react-router-dom";

import { useAuth } from "../lib/auth/AuthProvider";
import type { NavItem } from "../config/navigation";

interface SidebarProps {
  navItems: NavItem[];
  roleLabel: string;
}

function Sidebar({ navItems, roleLabel }: SidebarProps) {
  const { profile, signOut } = useAuth();
  return (
    <aside className="flex h-full w-56 flex-col justify-between border-r border-gray-300 bg-white">
      <div>
        <div className="flex items-center border-b border-gray-300 px-6 py-5">
          <span className="text-lg font-semibold tracking-wide text-gray-900">SQA</span>
        </div>

        <nav className="flex flex-col gap-1 px-4 py-6">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-base text-gray-800 transition-colors ${
                  isActive ? "font-medium bg-gray-100" : "hover:bg-gray-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-300 px-6 py-4">
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-base text-gray-800">{profile?.name ?? roleLabel}</span>
          <span className="text-xs text-gray-500">{roleLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="shrink-0 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
