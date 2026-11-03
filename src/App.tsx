import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  AdminRoute,
  GuestRoute,
  ProtectedRoute,
  StaffRoute,
  SuperAdminRoute,
  EcosystemRoute,
  WorkspaceRoute,
} from './components/ProtectedRoute';
import { FullPageLoader } from './components/FullPageLoader';
import Login from './pages/Login';
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const Kyc = lazy(() => import('./pages/Kyc'));
const NotFound = lazy(() => import('./pages/NotFound'));
const DashboardLayout = lazy(() =>
  import('./components/DashboardLayout').then((m) => ({ default: m.DashboardLayout })),
);
const Dashboard = lazy(() => import('./pages/app/Dashboard'));
const LeadsPage = lazy(() => import('./pages/app/Leads'));
const OpportunitiesPage = lazy(() => import('./pages/app/Opportunities'));
const ProjectsPage = lazy(() => import('./pages/app/Projects'));
const ProjectDetailPage = lazy(() => import('./pages/app/ProjectDetail'));
const TasksPage = lazy(() => import('./pages/app/Tasks'));
const TaskDetailPage = lazy(() => import('./pages/app/TaskDetail'));
const AccountsPage = lazy(() => import('./pages/app/Accounts'));
const ContactsPage = lazy(() => import('./pages/app/Contacts'));
const InquiriesPage = lazy(() => import('./pages/app/Inquiries'));
const BlogPage = lazy(() => import('./pages/app/Blog'));
const BlogEditorPage = lazy(() => import('./pages/app/BlogEditor'));
const NewsletterPage = lazy(() => import('./pages/app/Newsletter'));
const RolesPage = lazy(() => import('./pages/app/Roles'));
const UsersPage = lazy(() => import('./pages/app/Users'));
const KycReviewPage = lazy(() => import('./pages/app/KycReview'));
const InvestmentsPage = lazy(() => import('./pages/app/Investments'));
const CommitmentsPage = lazy(() => import('./pages/app/Commitments'));
const GithubReposPage = lazy(() => import('./pages/app/GithubRepos'));

/* ------------------------- investor workspace ------------------------- */
// The read-only stakeholder's own dashboard: their position, the company's
// performance, and the paperwork behind both.
const InvestorOverviewPage = lazy(() => import('./pages/app/investor/Overview'));
const InvestorRecordsPage = lazy(() => import('./pages/app/InvestorDashboard'));
const InvestorTimelinePage = lazy(() => import('./pages/app/investor/Timeline'));
const InvestorValuationPage = lazy(() => import('./pages/app/investor/Valuation'));
const InvestorRevenuePage = lazy(() => import('./pages/app/investor/Revenue'));
const InvestorExpensesPage = lazy(() => import('./pages/app/investor/Expenses'));
const InvestorProfitPage = lazy(() => import('./pages/app/investor/Profit'));
const InvestorReportsPage = lazy(() => import('./pages/app/investor/Reports'));
const InvestorRoiPage = lazy(() => import('./pages/app/investor/Roi'));
const InvestorEquityPage = lazy(() => import('./pages/app/investor/EquityProgress'));
const InvestorShareValuePage = lazy(() => import('./pages/app/investor/ShareValue'));
const InvestorPaymentsPage = lazy(() => import('./pages/app/investor/PaymentHistory'));
const InvestorDocumentsPage = lazy(() => import('./pages/app/investor/Documents'));
const InvestorNotificationsPage = lazy(() => import('./pages/app/investor/Notifications'));
const InvestorSettingsPage = lazy(() => import('./pages/app/investor/Settings'));

/* --------------------------- finance admin ---------------------------- */
// Where the numbers the investor sees are actually recorded.
const RevenueAdminPage = lazy(() => import('./pages/app/finance/RevenueAdmin'));
const ExpensesAdminPage = lazy(() => import('./pages/app/finance/ExpensesAdmin'));
const ValuationAdminPage = lazy(() => import('./pages/app/finance/ValuationAdmin'));
const DistributionsPage = lazy(() => import('./pages/app/finance/Distributions'));
const DocumentsAdminPage = lazy(() => import('./pages/app/finance/DocumentsAdmin'));
const AuditLogPage = lazy(() => import('./pages/app/finance/AuditLog'));
const InvoicesPage = lazy(() => import('./pages/app/finance/Invoices'));
const MarketerPaymentsAdminPage = lazy(() => import('./pages/app/finance/MarketerPayments'));
const EcosystemPage = lazy(() => import('./pages/app/ecosystem/Ecosystem'));
const PlatformDashboardPage = lazy(() => import('./pages/app/ecosystem/PlatformDashboard'));
const MarketerOverviewPage = lazy(() => import('./pages/app/marketer/Overview'));
const MarketerTasksPage = lazy(() => import('./pages/app/marketer/Tasks'));
const MarketerDocumentsPage = lazy(() => import('./pages/app/marketer/Documents'));
const MarketerPaymentsPage = lazy(() => import('./pages/app/marketer/Payments'));
const MarketerTicketsPage = lazy(() => import('./pages/app/marketer/Tickets'));
const ClientOverviewPage = lazy(() => import('./pages/app/client/Overview'));
const ClientProjectsPage = lazy(() => import('./pages/app/client/Projects'));
const ClientDocumentsPage = lazy(() => import('./pages/app/client/Documents'));
const ClientSettingsPage = lazy(() => import('./pages/app/client/Settings'));
const ClientsAdminPage = lazy(() => import('./pages/app/finance/Clients'));

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
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
        {/* Holding-company view: super admin manages, investor reads. */}
        <Route path="ecosystem" element={<EcosystemRoute><EcosystemPage /></EcosystemRoute>} />
        {/* One sub-product: its ledger, agreement and live data. */}
        <Route path="ecosystem/:slug" element={<EcosystemRoute><PlatformDashboardPage /></EcosystemRoute>} />

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
        {/* Invoices and payment bills. Admins read; only a super admin can
            generate, edit or delete — enforced server-side, not here. */}
        <Route path="finance/invoices" element={<AdminRoute><InvoicesPage /></AdminRoute>} />
        {/* Contractor payment ledger: admins read, super admins write. */}
        <Route
          path="finance/contractor-payments"
          element={<AdminRoute><MarketerPaymentsAdminPage /></AdminRoute>}
        />

        {/* Investor workspace. Not behind AdminRoute or StaffRoute — this IS
            the investor's area. WorkspaceRoute's allowlist keeps other
            narrow-surface roles out, and every endpoint behind these pages is
            scoped to the calling investor server-side. */}
        <Route path="investor" element={<InvestorOverviewPage />} />
        {/* The original records view, preserved: commitments, invoices and
            how the investor's own funds were spent. */}
        <Route path="investor/records" element={<InvestorRecordsPage />} />
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
        {/*
          The investor profile was merged into the single /profile page, so
          there is one profile screen rather than two. Redirected rather than
          removed so existing bookmarks and emailed links still land somewhere.
        */}
        <Route
          path="investor/profile"
          element={<Navigate to="/profile" replace />}
        />
        <Route path="investor/settings" element={<InvestorSettingsPage />} />

        {/* Contractor workspace. Not admin gated — this IS the freelance
            performance marketer's area. WorkspaceRoute's allowlist keeps
            other roles out, and every endpoint behind these pages is
            scoped to the calling contractor server-side. */}
        <Route path="marketer" element={<MarketerOverviewPage />} />
        <Route path="marketer/tasks" element={<MarketerTasksPage />} />
        <Route path="marketer/documents" element={<MarketerDocumentsPage />} />
        <Route path="marketer/payments" element={<MarketerPaymentsPage />} />
        <Route path="marketer/tickets" element={<MarketerTicketsPage />} />
        {/* Shared support desk: contractors, clients and admins all land on
            the same conversation view rather than three that drift. */}
        <Route path="tickets" element={<MarketerTicketsPage />} />

        {/* Client portal. Read-only and scoped to the caller's company
            server-side; WorkspaceRoute's allowlist keeps other roles out. */}
        <Route path="client" element={<ClientOverviewPage />} />
        <Route path="client/projects" element={<ClientProjectsPage />} />
        <Route path="client/documents" element={<ClientDocumentsPage />} />
        <Route path="client/settings" element={<ClientSettingsPage />} />

        {/* Client administration — super admin only, enforced server-side. */}
        <Route
          path="finance/clients"
          element={<SuperAdminRoute><ClientsAdminPage /></SuperAdminRoute>}
        />
        {/* Super-admin only: managing role types */}
        <Route path="roles" element={<SuperAdminRoute><RolesPage /></SuperAdminRoute>} />
        {/* Super-admin only: the company GitHub account, private repos included. */}
        <Route path="github" element={<SuperAdminRoute><GithubReposPage /></SuperAdminRoute>} />

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
    </Suspense>
  );
}
