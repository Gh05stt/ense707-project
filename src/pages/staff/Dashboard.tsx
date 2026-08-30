import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import KpiWidget from "./components/KpiWidget";

const KPI_WIDGETS = [
  { title: "Total Number of Tickets", value: 128 },
  { title: "Overdue Tickets", value: 6 },
  { title: "In Progress Tickets", value: 24 },
  { title: "Average Time to Close Ticket", value: 3 },
  { title: "Open Tickets", value: 41 },
];

function StaffDashboard() {
  return (
    <div className="flex h-screen w-screen bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Header title="Overview" />

        <main className="flex-1 overflow-auto p-8">
          <div className="grid grid-cols-3 gap-6">
            {KPI_WIDGETS.map((widget) => (
              <KpiWidget key={widget.title} title={widget.title} value={widget.value} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default StaffDashboard;
