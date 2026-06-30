import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/ToastProvider";
import { ConfirmProvider } from "./components/ConfirmProvider";
import "bootstrap/dist/css/bootstrap.min.css";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/buyer/Home";
import Detail from "./pages/buyer/Detail";
import OwnerDashboard from "./pages/owner/Dashboard";
import CreateProperty from "./pages/owner/CreateProperty";
import EditProperty from "./pages/owner/EditProperty";
import OwnerContacts from "./pages/owner/Contacts";
import AdminDashboard from "./pages/admin/Dashboard";
import Pending from "./pages/admin/Pending";
import Users from "./pages/admin/Users";
import Profile from "./pages/profile/Profile";
import PropertyList from "./pages/property/PropertyList";
import VnpayReturn from "./pages/payment/VnpayReturn";

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/property/:id" element={<Detail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/search" element={<PropertyList />} />
          <Route path="/payment/vnpay-return" element={<VnpayReturn />} />

          {/* Owner */}
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute roles={["owner"]}>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/create"
            element={
              <ProtectedRoute roles={["owner"]}>
                <CreateProperty />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/edit/:id"
            element={
              <ProtectedRoute roles={["owner"]}>
                <EditProperty />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/contacts"
            element={
              <ProtectedRoute roles={["owner"]}>
                <OwnerContacts />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pending"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Pending />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Users />
              </ProtectedRoute>
            }
          />
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
