import { Route, Routes } from "react-router-dom";

import StaffDashboard from "./pages/staff/Dashboard";

function App() {
  return (
    <Routes>
      <Route path="/staff/dashboard" element={<StaffDashboard />} />
    </Routes>
  );
}

export default App;
