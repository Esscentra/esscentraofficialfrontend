import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Building,
  Building2,
  FileText,
  FolderKanban,
  ListChecks,
  Mail,
  MessageSquare,
  ShieldHalf,
  Target,
  UserCog,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { isAdminRole, isSuperAdminRole } from '@/lib/utils';

type Card = {
  to: string;
  label: string;
  icon: typeof Users;
  hint: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
};

const CARDS: Card[] = [
  { to: '/app/leads', label: 'Leads', icon: Users, hint: 'Capture and qualify prospects' },
  { to: '/app/opportunities', label: 'Opportunities', icon: Target, hint: 'Track deals through stages' },
  { to: '/app/accounts', label: 'Accounts', icon: Building, hint: 'Companies you work with' },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban, hint: 'Plan and deliver work' },
  { to: '/app/tasks', label: 'Tasks', icon: ListChecks, hint: 'Your to-dos and assignments' },
  { to: '/app/contacts', label: 'Contacts', icon: Building2, hint: 'People at your accounts' },
  { to: '/app/inquiries', label: 'Inquiries', icon: MessageSquare, hint: 'Inbound contact requests' },
  { to: '/app/blog', label: 'Blog', icon: FileText, hint: 'Write and publish posts' },
  { to: '/app/newsletter', label: 'Newsletter', icon: Mail, hint: 'Manage subscribers' },
  // Admin governance
  { to: '/app/users', label: 'Users', icon: UserCog, hint: 'Manage members and roles', adminOnly: true },
  { to: '/app/kyc-review', label: 'KYC Review', icon: BadgeCheck, hint: 'Verify identity submissions', adminOnly: true },
  { to: '/app/roles', label: 'Roles', icon: ShieldHalf, hint: 'Define team access roles', superAdminOnly: true },
];

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? user?.name?.split(' ')[0] ?? 'there';

  const isAdmin = isAdminRole(user?.role);
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const cards = useMemo(
    () =>
      CARDS.filter((c) => {
        if (c.superAdminOnly) return isSuperAdmin;
        if (c.adminOnly) return isAdmin;
        return true;
      }),
    [isAdmin, isSuperAdmin],
  );

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Jump into any workspace below."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="glass-card group flex items-start gap-4 p-5 transition hover:-translate-y-0.5"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30 transition group-hover:bg-brand-500/25">
              <c.icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-white">{c.label}</h3>
              <p className="mt-0.5 text-sm text-slate-400">{c.hint}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
