import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Camera,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Lock,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { AuroraBackground } from '@/components/AuroraBackground';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PasswordStrength } from '@/components/PasswordStrength';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { changePassword } from '@/lib/authApi';
import { updateProfile } from '@/lib/userApi';
import { initials } from '@/lib/utils';
import {
  profileSchema,
  changePasswordSchema,
  type ProfileValues,
  type ChangePasswordValues,
} from '@/lib/validation';

type Tab = 'profile' | 'security';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('profile');
  const [loggingOut, setLoggingOut] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // user is guaranteed by ProtectedRoute
  const u = user!;

  const onLogout = async () => {
    setLoggingOut(true);
    await logout();
    toast.info('Signed out', 'See you soon.');
    navigate('/login', { replace: true });
  };

  const onAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large', 'Please pick an image under 2 MB.');
      return;
    }
    try {
      const updated = await updateProfile({ profileImage: file });
      setUser(updated);
      toast.success('Photo updated');
    } catch (err) {
      toast.error('Upload failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      e.target.value = ''; // allow re-selecting the same file
    }
  };

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#070c1a]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/app" aria-label="Back to dashboard">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/app">
              <Button variant="ghost" size="sm">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={onLogout} loading={loggingOut}>
              {!loggingOut && <LogOut className="h-4 w-4" />} Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <ProfileHeader user={u} onPickPhoto={() => fileRef.current?.click()} />
        <input ref={fileRef} type="file" accept="image/*" onChange={onAvatar} className="hidden" />

        <KycBanner status={u.kycStatus} />


        {/* Tabs */}
        <div className="mt-8 flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {(
            [
              { id: 'profile', label: 'Profile', icon: UserIcon },
              { id: 'security', label: 'Security', icon: ShieldCheck },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition"
            >
              {tab === t.id && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand-500/80 to-brand-700/80 shadow"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <t.icon className="h-4 w-4" /> {t.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            {tab === 'profile' ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <ProfileTab />
              </motion.div>
            ) : (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <SecurityTab onSignOut={onLogout} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

/* ----------------------------------- kyc ----------------------------------- */

function KycBanner({ status }: { status?: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    NOT_SUBMITTED: { label: 'Not started', classes: 'bg-white/10 text-slate-300 ring-white/15' },
    PENDING: { label: 'Pending review', classes: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
    UNDER_REVIEW: { label: 'Under review', classes: 'bg-sky-500/15 text-sky-300 ring-sky-500/30' },
    APPROVED: { label: 'Verified', classes: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
    REJECTED: { label: 'Rejected', classes: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
  };
  const s = map[status ?? 'NOT_SUBMITTED'] ?? map.NOT_SUBMITTED;
  const done = status === 'APPROVED';
  const cta = status === 'REJECTED' ? 'Resubmit' : done ? 'View' : 'Verify now';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="glass-card mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">Identity verification (KYC)</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.classes}`}>
              {s.label}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-400">
            {done
              ? 'Your identity is verified.'
              : 'Verify your identity to unlock full access to the platform.'}
          </p>
        </div>
      </div>
      <Link to="/kyc" className="shrink-0">
        <Button variant={done ? 'secondary' : 'primary'} size="sm">
          {cta}
        </Button>
      </Link>
    </motion.div>
  );
}

/* ---------------------------------- header --------------------------------- */

function ProfileHeader({
  user,
  onPickPhoto,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  onPickPhoto: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8"
    >
      <div className="relative">
        <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 text-2xl font-bold text-white shadow-lg shadow-brand-900/40 ring-1 ring-white/20">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            initials(user.name)
          )}
        </div>
        <button
          onClick={onPickPhoto}
          className="absolute -bottom-1.5 -right-1.5 grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-[#15101f] text-slate-200 shadow-lg transition hover:bg-brand-600 hover:text-white"
          aria-label="Change photo"
        >
          <Camera className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 text-center sm:text-left">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          {user.emailVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-400 sm:justify-start">
          <Mail className="h-3.5 w-3.5" /> {user.email}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-200 ring-1 ring-brand-500/30">
            {user.role.replace('_', ' ')}
          </span>
          {user.createdAt && (
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400 ring-1 ring-white/10">
              Member since{' '}
              {new Date(user.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* --------------------------------- profile --------------------------------- */

function ProfileTab() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const u = user!;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      phone: u.phone ?? '',
    },
  });

  const onSubmit = async (values: ProfileValues) => {
    try {
      const updated = await updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone ?? '',
      });
      setUser(updated);
      toast.success('Profile saved');
    } catch (err) {
      toast.error('Save failed', err instanceof ApiError ? err.message : undefined);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="glass-card space-y-5 p-6 sm:p-8" noValidate>
      <h2 className="text-lg font-semibold text-white">Personal information</h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="First name"
          icon={<UserIcon />}
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <Input
          label="Last name"
          icon={<UserIcon />}
          error={errors.lastName?.message}
          {...register('lastName')}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Phone"
          icon={<Phone />}
          placeholder="+91 90000 00000"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      {/* Read-only account fields */}
      <div className="grid gap-5 sm:grid-cols-2">
        <ReadOnlyField label="Email" value={u.email} icon={<Mail className="h-[18px] w-[18px]" />} />
        <ReadOnlyField
          label="Role"
          value={u.role.replace('_', ' ')}
          icon={<ShieldCheck className="h-[18px] w-[18px]" />}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          {!isSubmitting && <Save className="h-4 w-4" />} Save changes
        </Button>
      </div>
    </form>
  );
}

function ReadOnlyField({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
        <span className="text-slate-500">{icon}</span>
        <span className="capitalize">{value}</span>
        <Lock className="ml-auto h-3.5 w-3.5 text-slate-600" />
      </div>
    </div>
  );
}

/* --------------------------------- security -------------------------------- */

function SecurityTab({ onSignOut }: { onSignOut: () => void }) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const newPassword = watch('newPassword');

  const onSubmit = async (values: ChangePasswordValues) => {
    try {
      const message = await changePassword(values.currentPassword, values.newPassword);
      toast.success('Password changed', message || 'Use your new password next time you sign in.');
      reset();
    } catch (err) {
      toast.error('Could not change password', err instanceof ApiError ? err.message : undefined);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="glass-card space-y-5 p-6 sm:p-8" noValidate>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-brand-300" />
          <h2 className="text-lg font-semibold text-white">Change password</h2>
        </div>
        <Input
          label="Current password"
          password
          autoComplete="current-password"
          icon={<Lock />}
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Input
              label="New password"
              password
              autoComplete="new-password"
              icon={<Lock />}
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <PasswordStrength value={newPassword} />
          </div>
          <Input
            label="Confirm new password"
            password
            autoComplete="new-password"
            icon={<Lock />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting}>
            Update password
          </Button>
        </div>
      </form>

      <div className="glass-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h3 className="font-semibold text-white">Sessions</h3>
          <p className="mt-1 text-sm text-slate-400">
            Sign out of this device, or revoke every active session at once.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={onSignOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              onSignOut();
              toast.info('All sessions revoked', 'You have been signed out everywhere.');
            }}
          >
            Log out all devices
          </Button>
        </div>
      </div>
    </div>
  );
}
