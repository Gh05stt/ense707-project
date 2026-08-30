import { NavLink } from "react-router-dom";

interface NavItem {
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", path: "/staff/dashboard" },
  { label: "Tickets", path: "/staff/tickets" },
];

function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col justify-between border-r border-gray-300 bg-white">
      <div>
        <div className="flex items-center border-b border-gray-300 px-6 py-5">
          <span className="text-lg font-semibold tracking-wide text-gray-900">SQA</span>
        </div>

        <nav className="flex flex-col gap-1 px-4 py-6">
          {NAV_ITEMS.map((item) => (
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

      <div className="flex items-center gap-3 border-t border-gray-300 px-6 py-4">
        {/* User Role defined here */}
        <span className="text-base text-gray-800">Staff</span> 
        {/* TODO: Replace with profile settings (logout), maybe just logout button */}
        <span className="h-6 w-6 rounded-full border border-gray-400" />
      </div>
    </aside>
  );
}

export default Sidebar;
