import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { USER_NAV_ITEMS } from "../../config/navigation";
import { formatPriority, formatStatus, formatTicketId } from "../../lib/format";
import { useMyTicketsController, type StatusFilter } from "../../lib/controllers/myTickets";

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function MyTickets() {
  const { tickets, hasTickets, isLoading, searchTerm, statusFilter, setSearchTerm, setStatusFilter } =
    useMyTicketsController();

  return (
    <div className="flex h-screen w-screen bg-gray-50">
      <Sidebar navItems={USER_NAV_ITEMS} roleLabel="User" />

      <div className="flex flex-1 flex-col">
        <Header title="My Tickets" />

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
                </tr>
              </thead>
              <tbody>
                {!isLoading && tickets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      {hasTickets ? "No tickets match your search." : "You haven't submitted any tickets yet."}
                    </td>
                  </tr>
                )}
                {tickets.map((ticket) => (
                  <tr key={ticket.ticket_id} className="border-b border-gray-200 last:border-b-0">
                    <td className="px-4 py-3 text-gray-800">{formatTicketId(ticket.ticket_id)}</td>
                    <td className="px-4 py-3 text-gray-800">{ticket.title}</td>
                    <td className="px-4 py-3 text-gray-800">{ticket.category}</td>
                    <td className="px-4 py-3 text-gray-800">{formatPriority(ticket.priority)}</td>
                    <td className="px-4 py-3 text-gray-800">{formatStatus(ticket.status)}</td>
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

export default MyTickets;
