import { Link } from "react-router-dom";

import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { STAFF_NAV_ITEMS } from "../../config/navigation";
import { formatPriority, formatStatus, formatTicketId } from "../../lib/format";
import { useStaffTicketsController, type StatusFilter } from "../../lib/controllers/staffTickets";

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function StaffTickets() {
  const { tickets, isLoading, searchTerm, statusFilter, setSearchTerm, setStatusFilter } = useStaffTicketsController();

  return (
    <div className="flex h-screen w-screen bg-gray-50">
      <Sidebar navItems={STAFF_NAV_ITEMS} roleLabel="Staff" />

      <div className="flex flex-1 flex-col">
        <Header title="Tickets" />

        <main className="flex-1 overflow-auto p-8">
          <div className="mb-4 flex gap-3">
            <input
              type="text"
              placeholder="Search by ticket ID or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-sm rounded-md border border-gray-400 px-3 py-2 focus:border-gray-600 focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-md border border-gray-400 px-3 py-2 focus:border-gray-600 focus:outline-none"
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-300 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-300 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Ticket ID</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Title</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Category</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Priority</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Submitted By</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && tickets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      No tickets match your search.
                    </td>
                  </tr>
                )}
                {tickets.map((ticket) => (
                  <tr key={ticket.ticket_id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/staff/tickets/${ticket.ticket_id}`}
                        className="font-medium text-gray-900 underline"
                      >
                        {formatTicketId(ticket.ticket_id)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{ticket.title}</td>
                    <td className="px-4 py-3 text-gray-800">{ticket.category}</td>
                    <td className="px-4 py-3 text-gray-800">{formatPriority(ticket.priority)}</td>
                    <td className="px-4 py-3 text-gray-800">{formatStatus(ticket.status)}</td>
                    <td className="px-4 py-3 text-gray-800">{ticket.users?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

export default StaffTickets;
