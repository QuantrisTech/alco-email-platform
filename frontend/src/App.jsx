import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Templates from "./pages/Templates";
import Campaigns from "./pages/Campaigns";
import Automations from "./pages/Automations";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login"; // Make sure your Login component is imported here

// A wrapper layout that only shows the Sidebar and dashboard styling if a token exists
function ProtectedLayout({ children }) {
  const token = localStorage.getItem("access_token");

  // If no token is found, forcefully redirect straight to the login route
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render your exact structural sidebar layout
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="lg:pl-64">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public Route - Safe from being trapped by Sidebar layouts */}
      <Route path="/login" element={<Login />} />

      {/* Protected App Routes - Wrapped securely inside your layout framework */}
      <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/contacts" element={<ProtectedLayout><Contacts /></ProtectedLayout>} />
      <Route path="/templates" element={<ProtectedLayout><Templates /></ProtectedLayout>} />
      <Route path="/campaigns" element={<ProtectedLayout><Campaigns /></ProtectedLayout>} />
      <Route path="/automations" element={<ProtectedLayout><Automations /></ProtectedLayout>} />
      <Route path="/analytics" element={<ProtectedLayout><Analytics /></ProtectedLayout>} />

      {/* Fallback Catch-All: Anything else redirects home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}