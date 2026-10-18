import { Link, useParams } from "react-router-dom";

import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { STAFF_NAV_ITEMS } from "../../config/navigation";
import { useStaffTicketDetailController } from "../../lib/controllers/staffTicketDetail";
import { formatDateTime, formatPriority, formatStatus, formatTicketId } from "../../lib/format";
import type { TicketPriority, TicketStatus } from "../../types/database";

const STATUS_OPTIONS: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const PRIORITY_OPTIONS: TicketPriority[] = ["low", "medium", "high", "critical"];

const INLINE_SELECT_CLASS =
  "cursor-pointer appearance-none rounded border-none bg-transparent p-0 pr-4 font-medium text-gray-900 underline decoration-dotted underline-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

function TicketDetail() {
  const params = useParams<{ ticketId: string }>();
  const ticketId = Number(params.ticketId);

  const {
    ticket,
    notes,
    isLoading,
    loadError,
    isUpdating,
    updateError,
    canClose,
    noteText,
    isAddingNote,
    noteError,
    setNoteText,
    handleStatusChange,
    handlePriorityChange,
    handleAddNote,
  } = useStaffTicketDetailController(ticketId);

  return (
    <div className="flex h-screen w-screen bg-gray-50">
      <Sidebar navItems={STAFF_NAV_ITEMS} roleLabel="Staff" />

      <div className="flex flex-1 flex-col">
        <Header title={ticket ? `Ticket ${formatTicketId(ticket.ticket_id)}` : "Ticket"} />

        <main className="flex-1 overflow-auto p-8">
          <Link to="/staff/tickets" className="mb-4 inline-block text-sm text-gray-600 underline">
            ← Back to all tickets
          </Link>

          {isLoading && <p className="text-gray-600">Loading ticket...</p>}
          {loadError && <p className="text-sm text-red-600">{loadError}</p>}

          {ticket && (
            <div className="flex max-w-3xl flex-col gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-600">
                  <span>{formatTicketId(ticket.ticket_id)}</span>

                  <span className="flex items-center gap-1">
                    Priority:
                    <select
                      value={ticket.priority}
                      disabled={isUpdating}
                      onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                      className={INLINE_SELECT_CLASS}
                    >
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {formatPriority(priority)}
                        </option>
                      ))}
                    </select>
                  </span>

                  <span className="flex items-center gap-1">
                    Status:
                    <select
                      value={ticket.status}
                      disabled={isUpdating}
                      onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                      className={INLINE_SELECT_CLASS}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status} disabled={status === "closed" && !canClose}>
                          {formatStatus(status)}
                        </option>
                      ))}
                    </select>
                  </span>
                </div>
                {!canClose && (
                  <p className="mt-1 text-xs text-gray-500">A ticket must be Resolved before it can be Closed.</p>
                )}
                {updateError && (
                  <p role="alert" className="mt-1 text-sm text-red-600">
                    {updateError}
                  </p>
                )}

                <h1 className="mt-2 text-xl text-gray-900">{ticket.title}</h1>

                <p className="mt-2 text-sm text-gray-500">
                  {ticket.users?.name && <>Submitted by {ticket.users.name} · </>}
                  {formatDateTime(ticket.created_at)}
                  {ticket.category ? ` · ${ticket.category}` : ""}
                </p>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-semibold text-gray-700">Description</h2>
                <p className="whitespace-pre-wrap text-gray-800">{ticket.description}</p>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-semibold text-gray-700">Notes</h2>

                {notes.length === 0 && <p className="text-gray-500">No resolution notes yet.</p>}
                <div className="flex flex-col gap-4">
                  {notes.map((note) => (
                    <div key={note.note_id}>
                      <p className="whitespace-pre-wrap text-gray-800">{note.note_text}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {note.users?.name ?? "Staff"} · {formatDateTime(note.created_at)}
                      </p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddNote} className="mt-4 flex flex-col gap-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                    className="rounded-md border border-gray-400 px-3 py-2 focus:border-gray-600 focus:outline-none"
                  />
                  {noteError && (
                    <p role="alert" className="text-sm text-red-600">
                      {noteError}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isAddingNote || !noteText.trim()}
                      className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                    >
                      {isAddingNote ? "Adding..." : "Add Note"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default TicketDetail;
