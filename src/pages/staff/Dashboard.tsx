import Header from "../../components/Header";
import KpiWidget from "../../components/KpiWidget";
import Sidebar from "../../components/Sidebar";
import { STAFF_NAV_ITEMS } from "../../config/navigation";
import { useStaffDashboardController } from "../../lib/controllers/staffDashboard";

function StaffDashboard() {
  const { kpiWidgets, isLoading, loadError } = useStaffDashboardController();

  return (
    <div className="flex h-screen w-screen bg-gray-50">
      <Sidebar navItems={STAFF_NAV_ITEMS} roleLabel="Staff" />

      <div className="flex flex-1 flex-col">
        <Header title="Overview" />

        <main className="flex-1 overflow-auto p-8">
          {isLoading && <p className="text-gray-600">Loading dashboard...</p>}
          {loadError && (
            <p role="alert" className="text-sm text-red-600">
              {loadError}
            </p>
          )}
          <div className="grid grid-cols-3 gap-6">
            {kpiWidgets.map((widget) => (
              <KpiWidget key={widget.title} title={widget.title} value={widget.value} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default StaffDashboard;
