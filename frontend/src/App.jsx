import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/ToastProvider";
import { ConfirmProvider } from "./components/ConfirmProvider";
import GlobalLoading from "./components/GlobalLoading";
import "bootstrap/dist/css/bootstrap.min.css";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Home = lazy(() => import("./pages/buyer/Home"));
const Detail = lazy(() => import("./pages/buyer/Detail"));
const OwnerDashboard = lazy(() => import("./pages/owner/Dashboard"));
const PublicOwnerProfile = lazy(() => import("./pages/owner/PublicProfile"));
const CreateProperty = lazy(() => import("./pages/owner/CreateProperty"));
const EditProperty = lazy(() => import("./pages/owner/EditProperty"));
const OwnerContacts = lazy(() => import("./pages/owner/Contacts"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const Pending = lazy(() => import("./pages/admin/Pending"));
const Users = lazy(() => import("./pages/admin/Users"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const PropertyList = lazy(() => import("./pages/property/PropertyList"));
const VnpayReturn = lazy(() => import("./pages/payment/VnpayReturn"));
const PostingPolicy = lazy(() => import("./pages/policy/PostingPolicy"));

function PageLoading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
      <div className="spinner-border text-danger" />
    </div>
  );
}

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
            <GlobalLoading />
            <Suspense fallback={<PageLoading />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/property/:id" element={<Detail />} />
                <Route path="/owners/:id" element={<PublicOwnerProfile />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/search" element={<PropertyList />} />
                <Route path="/posting-policy" element={<PostingPolicy />} />
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
            </Suspense>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
