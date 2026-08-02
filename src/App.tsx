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

/* ------------------------- investor workspace ------------------------- */
// The read-only stakeholder's own dashboard: their position, the company's
// performance, and the paperwork behind both.
import InvestorOverviewPage from './pages/app/investor/Overview';
import InvestorRecordsPage from './pages/app/InvestorDashboard';
import InvestorTimelinePage from './pages/app/investor/Timeline';
import InvestorValuationPage from './pages/app/investor/Valuation';
import InvestorRevenuePage from './pages/app/investor/Revenue';
import InvestorExpensesPage from './pages/app/investor/Expenses';
import InvestorProfitPage from './pages/app/investor/Profit';
import InvestorReportsPage from './pages/app/investor/Reports';
import InvestorRoiPage from './pages/app/investor/Roi';
import InvestorEquityPage from './pages/app/investor/EquityProgress';
import InvestorShareValuePage from './pages/app/investor/ShareValue';
import InvestorFundUsagePage from './pages/app/investor/FundUsage';
import InvestorPaymentsPage from './pages/app/investor/PaymentHistory';
import InvestorDocumentsPage from './pages/app/investor/Documents';
import InvestorNotificationsPage from './pages/app/investor/Notifications';
import InvestorProfilePage from './pages/app/investor/Profile';
import InvestorSettingsPage from './pages/app/investor/Settings';

/* --------------------------- finance admin ---------------------------- */
// Where the numbers the investor sees are actually recorded.
import RevenueAdminPage from './pages/app/finance/RevenueAdmin';
import ExpensesAdminPage from './pages/app/finance/ExpensesAdmin';
import ValuationAdminPage from './pages/app/finance/ValuationAdmin';
import DistributionsPage from './pages/app/finance/Distributions';
import DocumentsAdminPage from './pages/app/finance/DocumentsAdmin';
import AuditLogPage from './pages/app/finance/AuditLog';

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

        {/* Finance administration — recording the figures investors read.
            Admin-gated on the server too; these guards only hide the UI. */}
        <Route path="finance/revenue" element={<AdminRoute><RevenueAdminPage /></AdminRoute>} />
        <Route path="finance/expenses" element={<AdminRoute><ExpensesAdminPage /></AdminRoute>} />
        <Route path="finance/valuation" element={<AdminRoute><ValuationAdminPage /></AdminRoute>} />
        <Route path="finance/distributions" element={<AdminRoute><DistributionsPage /></AdminRoute>} />
        <Route path="finance/documents" element={<AdminRoute><DocumentsAdminPage /></AdminRoute>} />
        <Route path="finance/audit" element={<AdminRoute><AuditLogPage /></AdminRoute>} />

        {/* Investor workspace. Not behind AdminRoute or StaffRoute — this IS
            the investor's area. WorkspaceRoute's allowlist keeps other
            narrow-surface roles out, and every endpoint behind these pages is
            scoped to the calling investor server-side. */}
        <Route path="investor" element={<InvestorOverviewPage />} />
        {/* The original records view, preserved: commitments, invoices and
            how the investor's own funds were spent. */}
        <Route path="investor/records" element={<InvestorRecordsPage />} />
        <Route path="investor/fund-usage" element={<InvestorFundUsagePage />} />
        <Route path="investor/timeline" element={<InvestorTimelinePage />} />
        <Route path="investor/valuation" element={<InvestorValuationPage />} />
        <Route path="investor/revenue" element={<InvestorRevenuePage />} />
        <Route path="investor/expenses" element={<InvestorExpensesPage />} />
        <Route path="investor/profit" element={<InvestorProfitPage />} />
        <Route path="investor/reports" element={<InvestorReportsPage />} />
        <Route path="investor/roi" element={<InvestorRoiPage />} />
        <Route path="investor/equity" element={<InvestorEquityPage />} />
        <Route path="investor/share-value" element={<InvestorShareValuePage />} />
        <Route path="investor/payments" element={<InvestorPaymentsPage />} />
        <Route path="investor/documents" element={<InvestorDocumentsPage />} />
        <Route path="investor/notifications" element={<InvestorNotificationsPage />} />
        <Route path="investor/profile" element={<InvestorProfilePage />} />
        <Route path="investor/settings" element={<InvestorSettingsPage />} />
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
