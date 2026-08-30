export interface NavItem {
  label: string;
  path: string;
}

export const STAFF_NAV_ITEMS: NavItem[] = [
  { label: "Overview", path: "/staff/dashboard" },
  { label: "Tickets", path: "/staff/tickets" },
];

export const USER_NAV_ITEMS: NavItem[] = [
  { label: "Overview", path: "/user/dashboard" },
  { label: "My Tickets", path: "/user/tickets" },
  { label: "Create Ticket", path: "/user/tickets/new" },
];
