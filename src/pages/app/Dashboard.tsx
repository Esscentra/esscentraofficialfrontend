import { Link } from 'react-router-dom';
import {
  Building2,
  FileText,
  FolderKanban,
  ListChecks,
  Mail,
  MessageSquare,
  ShieldHalf,
  Target,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';

const CARDS = [
  { to: '/app/leads', label: 'Leads', icon: Users, hint: 'Capture and qualify prospects' },
  { to: '/app/opportunities', label: 'Opportunities', icon: Target, hint: 'Track deals through stages' },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban, hint: 'Plan and deliver work' },
  { to: '/app/tasks', label: 'Tasks', icon: ListChecks, hint: 'Your to-dos and assignments' },
  { to: '/app/contacts', label: 'Contacts', icon: Building2, hint: 'People at your accounts' },
  { to: '/app/inquiries', label: 'Inquiries', icon: MessageSquare, hint: 'Inbound contact requests' },
  { to: '/app/blog', label: 'Blog', icon: FileText, hint: 'Write and publish posts' },
  { to: '/app/newsletter', label: 'Newsletter', icon: Mail, hint: 'Manage subscribers' },
  { to: '/app/roles', label: 'Roles', icon: ShieldHalf, hint: 'Define team access roles' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? user?.name?.split(' ')[0] ?? 'there';

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Jump into any workspace below."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
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
