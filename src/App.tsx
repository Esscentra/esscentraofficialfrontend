import { Routes, Route, Navigate } from 'react-router-dom';
import {
  AdminRoute,
  GuestRoute,
  ProtectedRoute,
  StaffRoute,
  SuperAdminRoute,
  WorkspaceRoute,
} from './components/ProtectedRoute';
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
import ProjectDetailPage from './pages/app/ProjectDetail';
import TasksPage from './pages/app/Tasks';
import TaskDetailPage from './pages/app/TaskDetail';
import AccountsPage from './pages/app/Accounts';
import ContactsPage from './pages/app/Contacts';
import InquiriesPage from './pages/app/Inquiries';
import BlogPage from './pages/app/Blog';
import BlogEditorPage from './pages/app/BlogEditor';
import NewsletterPage from './pages/app/Newsletter';
import RolesPage from './pages/app/Roles';
import UsersPage from './pages/app/Users';
import KycReviewPage from './pages/app/KycReview';
import InvestmentsPage from './pages/app/Investments';
import CommitmentsPage from './pages/app/Commitments';

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
      {/* Same page, but the URL carries the user's name for a friendlier path. */}
      <Route
        path="/profile/:username"
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

      {/* Dashboard workspace (sidebar + topbar shell).
          WorkspaceRoute applies the per-role page allowlist to every child. */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <WorkspaceRoute>
              <DashboardLayout />
            </WorkspaceRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        {/* Admin governance pages */}
        <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="kyc-review" element={<AdminRoute><KycReviewPage /></AdminRoute>} />
        <Route path="investments" element={<AdminRoute><InvestmentsPage /></AdminRoute>} />
        <Route path="commitments" element={<AdminRoute><CommitmentsPage /></AdminRoute>} />
        {/* Super-admin only: managing role types */}
        <Route path="roles" element={<SuperAdminRoute><RolesPage /></SuperAdminRoute>} />

        {/* Operational CRM pages — blocked for read-only INVESTOR accounts */}
        <Route path="leads" element={<StaffRoute><LeadsPage /></StaffRoute>} />
        <Route path="opportunities" element={<StaffRoute><OpportunitiesPage /></StaffRoute>} />
        <Route path="accounts" element={<StaffRoute><AccountsPage /></StaffRoute>} />
        <Route path="projects" element={<StaffRoute><ProjectsPage /></StaffRoute>} />
        {/* Project detail — read-only unless the caller is a super admin. */}
        <Route path="projects/:id" element={<StaffRoute><ProjectDetailPage /></StaffRoute>} />
        {/* Tasks carry the contractor engagement, so the marketer reaches
            these (via WorkspaceRoute's allowlist). Writes are admin-gated
            server-side and the UI hides the controls. */}
        <Route path="tasks" element={<StaffRoute><TasksPage /></StaffRoute>} />
        <Route path="tasks/:id" element={<StaffRoute><TaskDetailPage /></StaffRoute>} />
        <Route path="contacts" element={<StaffRoute><ContactsPage /></StaffRoute>} />
        <Route path="inquiries" element={<StaffRoute><InquiriesPage /></StaffRoute>} />
        {/* Blog is admin-only: the listing endpoint is admin-gated, and only
            ADMIN / SUPER_ADMIN may write to the public site. */}
        <Route path="blog" element={<AdminRoute><BlogPage /></AdminRoute>} />
        <Route path="blog/new" element={<AdminRoute><BlogEditorPage /></AdminRoute>} />
        <Route path="blog/:id" element={<AdminRoute><BlogEditorPage /></AdminRoute>} />
        {/* Newsletter is admin-only: subscriber addresses are PII and the
            campaign history records exactly who was mailed. */}
        <Route path="newsletter" element={<AdminRoute><NewsletterPage /></AdminRoute>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
