import { Navigate, Route, Routes } from "react-router-dom";

import { useAppController } from "./lib/controllers/app";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import StaffDashboard from "./pages/staff/Dashboard";
import StaffTicketDetail from "./pages/staff/TicketDetail";
import StaffTickets from "./pages/staff/Tickets";
import CreateTicket from "./pages/user/CreateTicket";
import UserDashboard from "./pages/user/Dashboard";
import MyTickets from "./pages/user/MyTickets";

function App() {
  const { isLoading, isAuthenticated, role } = useAppController();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 text-gray-600">Loading...</div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // if user is staff, they can view staff only pages
  if (role === "staff" || role === "admin") {
    return (
      <Routes>
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        <Route path="/staff/tickets" element={<StaffTickets />} />
        <Route path="/staff/tickets/:ticketId" element={<StaffTicketDetail />} />
        <Route path="*" element={<Navigate to="/staff/dashboard" replace />} />
      </Routes>
    );
  }

  //all other cases can go to user view
  return (
    <Routes>
      <Route path="/user/dashboard" element={<UserDashboard />} />
      <Route path="/user/tickets" element={<MyTickets />} />
      <Route path="/user/tickets/new" element={<CreateTicket />} />
      <Route path="*" element={<Navigate to="/user/dashboard" replace />} />
    </Routes>
  );
}

export default App;
