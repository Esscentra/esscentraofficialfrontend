import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Download,
  KeyRound,
  LogOut,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Section } from '@/components/finance/Controls';
import { InfoNote } from '@/components/finance/States';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { changePassword } from '@/lib/authApi';
import {
  downloadMonthlyReport,
  getInvestorOverview,
  getInvestmentTimeline,
} from '@/lib/investorFinanceApi';
import { getMyPaymentHistory } from '@/lib/financeApi';
import { getErrorMessage } from '@/lib/utils';

/**
 * ============================================================================
 *  15. SETTINGS
 * ============================================================================
 *
 * Password, two-factor, notification preferences, data export and sign-out.
 *
 * Notification preferences are stored in this browser rather than on the
 * server: the backend has no per-user preference field, and inventing an
 * endpoint that silently discards the setting would be worse than being
 * honest that it is device-local. The copy says so.
 * ============================================================================
 */

const NOTIFICATION_PREFS_KEY = 'esscentra.investor.notifications';

interface NotificationPrefs {
  profitCredited: boolean;
  valuationUpdated: boolean;
  revenueMilestone: boolean;
  documents: boolean;
  investmentDue: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  profitCredited: true,
  valuationUpdated: true,
  revenueMilestone: true,
  documents: true,
  investmentDue: true,
};

function loadPrefs(): NotificationPrefs {
  try {
    const stored = window.localStorage.getItem(NOTIFICATION_PREFS_KEY);
    return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS;
  } catch {
    // A corrupt or unavailable store should not break the settings page.
    return DEFAULT_PREFS;
  }
}

const PREF_LABELS: Array<{ key: keyof NotificationPrefs; label: string; hint: string }> = [
  {
    key: 'profitCredited',
    label: 'Profit credited',
    hint: 'When a distribution is approved or paid to you',
  },
  {
    key: 'valuationUpdated',
    label: 'Valuation updated',
    hint: 'When the company is re-valued and your share value changes',
  },
  {
    key: 'revenueMilestone',
    label: 'Revenue milestones',
    hint: 'When total revenue crosses a milestone',
  },
  {
    key: 'documents',
    label: 'Documents and agreements',
    hint: 'When a new document is shared with you',
  },
  {
    key: 'investmentDue',
    label: 'Investment reminders',
    hint: 'When an installment of your commitment falls due',
  },
];

export default function InvestorSettings() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [prefs, setPrefs] = useState<NotificationPrefs>(loadPrefs);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [changing, setChanging] = useState(false);
  const [exporting, setExporting] = useState(false);

  const togglePref = (key: keyof NotificationPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);

    try {
      window.localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(updated));
    } catch {
      toast.error('Could not save', 'Your browser blocked local storage.');
    }
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (passwords.next !== passwords.confirm) {
      toast.error('Passwords do not match', 'Re-enter the new password.');
      return;
    }
    if (passwords.next.length < 8) {
      toast.error('Too short', 'Use at least 8 characters.');
      return;
    }

    setChanging(true);
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      toast.success('Password changed', 'Use your new password next time you sign in.');
    } catch (thrown) {
      toast.error('Could not change password', getErrorMessage(thrown));
    } finally {
      setChanging(false);
    }
  };

  /**
   * Export everything the platform holds about this investor's position as a
   * single JSON file, generated client-side from the same endpoints the
   * dashboard uses — so what is exported is exactly what is displayed.
   */
  const downloadData = async () => {
    setExporting(true);
    try {
      const [overview, timeline, payments] = await Promise.all([
        getInvestorOverview(),
        getInvestmentTimeline(),
        getMyPaymentHistory(),
      ]);

      const payload = {
        exportedAt: new Date().toISOString(),
        account: { name: user?.name, email: user?.email },
        position: overview,
        investments: timeline,
        payments,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `esscentra-investor-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      toast.success('Data exported', 'Your investment data has been downloaded.');
    } catch (thrown) {
      toast.error('Export failed', getErrorMessage(thrown));
    } finally {
      setExporting(false);
    }
  };

  const downloadReport = async () => {
    setExporting(true);
    try {
      await downloadMonthlyReport('excel', 24);
      toast.success('Report downloaded', 'Your 24-month report is ready.');
    } catch (thrown) {
      toast.error('Export failed', getErrorMessage(thrown));
    } finally {
      setExporting(false);
    }
  };

  const signOut = async () => {
    await logout();
    toast.info('Signed out', 'See you soon.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Security, notifications and your data."
      />

      {/* ------------------------------- password -------------------------------- */}
      <Section title="Password" description="Change the password you use to sign in.">
        <form onSubmit={submitPassword} className="glass-card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={passwords.current}
              onChange={(event) =>
                setPasswords((prev) => ({ ...prev, current: event.target.value }))
              }
              required
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={passwords.next}
              onChange={(event) =>
                setPasswords((prev) => ({ ...prev, next: event.target.value }))
              }
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(event) =>
                setPasswords((prev) => ({ ...prev, confirm: event.target.value }))
              }
              required
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={changing}>
              <KeyRound className="h-4 w-4" />
              Update password
            </Button>
          </div>
        </form>
      </Section>

      {/* ------------------------------ two-factor ------------------------------- */}
      <Section
        title="Two-factor authentication"
        description="An extra step at sign-in, on top of your password."
      >
        <div className="glass-card flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400/25 to-emerald-700/10 text-emerald-300 ring-1 ring-emerald-500/30">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Authenticator app</p>
              <p className="mt-0.5 text-sm text-slate-400">
                Two-factor authentication is not yet enabled on your account.
              </p>
            </div>
          </div>

          <Button variant="secondary" size="sm" disabled title="Coming soon">
            <ShieldCheck className="h-4 w-4" />
            Set up
          </Button>
        </div>

        <InfoNote tone="neutral">
          Two-factor sign-in is being rolled out across the platform. Until it is
          available, keep your password strong and unique — it is the only thing standing
          between someone and your investment records.
        </InfoNote>
      </Section>

      {/* --------------------------- notification prefs -------------------------- */}
      <Section
        title="Notification preferences"
        description="Which updates you want highlighted in your notification feed."
      >
        <div className="glass-card divide-y divide-white/5 p-1">
          {PREF_LABELS.map((pref) => (
            <label
              key={pref.key}
              className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Bell className="h-3.5 w-3.5 text-brand-300" />
                  {pref.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{pref.hint}</p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={prefs[pref.key]}
                aria-label={pref.label}
                onClick={() => togglePref(pref.key)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  prefs[pref.key] ? 'bg-brand-500' : 'bg-white/15'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    prefs[pref.key] ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          These preferences are saved in this browser. They control what is highlighted in
          your feed; they do not stop the platform from recording an event.
        </p>
      </Section>

      {/* ------------------------------ data export ------------------------------ */}
      <Section
        title="Your data"
        description="Download everything the platform holds about your investment."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="glass-card flex flex-col gap-3 p-5">
            <p className="text-sm font-semibold text-white">Full data export</p>
            <p className="text-sm text-slate-400">
              Your position, every payment you have made, and every distribution paid to
              you — as JSON.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-auto self-start"
              onClick={() => void downloadData()}
              loading={exporting}
            >
              <Download className="h-4 w-4" />
              Download JSON
            </Button>
          </div>

          <div className="glass-card flex flex-col gap-3 p-5">
            <p className="text-sm font-semibold text-white">24-month report</p>
            <p className="text-sm text-slate-400">
              Revenue, expenses, net profit and your share, month by month, as a
              spreadsheet.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-auto self-start"
              onClick={() => void downloadReport()}
              loading={exporting}
            >
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          </div>
        </div>
      </Section>

      {/* -------------------------------- sign out ------------------------------- */}
      <Section title="Session" description="Sign out of this device.">
        <div className="glass-card flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="mt-0.5 truncate text-sm text-slate-400">{user?.email}</p>
          </div>

          <Button variant="danger" size="sm" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </Section>
    </div>
  );
}
