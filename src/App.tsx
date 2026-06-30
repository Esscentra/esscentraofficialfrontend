import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminRoute, GuestRoute, ProtectedRoute, SuperAdminRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Kyc from './pages/Kyc';
import NotFound from './pages/NotFound';
import { DashboardLayout } from './components/DashboardLayout';
import Dashboard from './pages/app/Dashboard';
import LeadsPage from './pages/app/Leads';
import OpportunitiesPage from './pages/app/Opportunities';
import ProjectsPage from './pages/app/Projects';
import TasksPage from './pages/app/Tasks';
import AccountsPage from './pages/app/Accounts';
import ContactsPage from './pages/app/Contacts';
import InquiriesPage from './pages/app/Inquiries';
import BlogPage from './pages/app/Blog';
import NewsletterPage from './pages/app/Newsletter';
import RolesPage from './pages/app/Roles';
import UsersPage from './pages/app/Users';
import KycReviewPage from './pages/app/KycReview';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth screens — only for signed-out visitors */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <Register />
          </GuestRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <GuestRoute>
            <ForgotPassword />
          </GuestRoute>
        }
      />

      {/* These work whether or not a user is signed in (links come from email) */}
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Standalone authenticated screens */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kyc"
        element={
          <ProtectedRoute>
            <Kyc />
          </ProtectedRoute>
        }
      />

      {/* Dashboard workspace (sidebar + topbar shell) */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        {/* Admin governance pages */}
        <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="kyc-review" element={<AdminRoute><KycReviewPage /></AdminRoute>} />
        {/* Super-admin only: managing role types */}
        <Route path="roles" element={<SuperAdminRoute><RolesPage /></SuperAdminRoute>} />

        <Route path="leads" element={<LeadsPage />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="inquiries" element={<InquiriesPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="newsletter" element={<NewsletterPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
