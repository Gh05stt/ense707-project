import Header from "../../components/Header";
import KpiWidget from "../../components/KpiWidget";
import Sidebar from "../../components/Sidebar";
import { USER_NAV_ITEMS } from "../../config/navigation";
import { useUserDashboardController } from "../../lib/controllers/userDashboard";

function UserDashboard() {
  const { kpiWidgets } = useUserDashboardController();

  return (
    <div className="flex h-screen w-screen bg-gray-50">
      <Sidebar navItems={USER_NAV_ITEMS} roleLabel="User" />

      <div className="flex flex-1 flex-col">
        <Header title="Overview" />

        <main className="flex-1 overflow-auto p-8">
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

export default UserDashboard;
