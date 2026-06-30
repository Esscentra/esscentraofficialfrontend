import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Clock,
  FileCheck2,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import { CameraCapture } from '@/components/ui/CameraCapture';
import { AuroraBackground } from '@/components/AuroraBackground';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FullPageLoader } from '@/components/FullPageLoader';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { getMyKyc, submitKyc } from '@/lib/kycApi';
import { ApiError } from '@/lib/api';
import type { KycRecord, KycStatus } from '@/types';

const DOC_TYPES = [
  { value: 'AADHAR', label: 'Aadhaar card' },
  { value: 'PAN', label: 'PAN card' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving license' },
] as const;

const kycSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  documentType: z.enum(['AADHAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE']),
  documentNumber: z.string().min(4, 'Document number is required'),
});
type KycValues = z.infer<typeof kycSchema>;

const STATUS_UI: Record<
  KycStatus,
  { label: string; icon: typeof Clock; classes: string; note: string }
> = {
  NOT_SUBMITTED: {
    label: 'Not started',
    icon: Clock,
    classes: 'bg-white/10 text-slate-300 ring-white/15',
    note: 'You haven’t submitted your documents yet.',
  },
  PENDING: {
    label: 'Pending review',
    icon: Clock,
    classes: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    note: 'Your documents have been submitted and are awaiting review.',
  },
  UNDER_REVIEW: {
    label: 'Under review',
    icon: Clock,
    classes: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
    note: 'Our team is currently reviewing your documents.',
  },
  APPROVED: {
    label: 'Verified',
    icon: BadgeCheck,
    classes: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    note: 'Your identity has been verified. You’re all set.',
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
    classes: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    note: 'Your submission was rejected. Please review the reason and resubmit.',
  },
};

export default function Kyc() {
  const toast = useToast();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<KycRecord | null>(null);

  useEffect(() => {
    let active = true;
    getMyKyc()
      .then((r) => active && setRecord(r))
      .catch(() => active && setRecord(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Show the form when nothing is on file or the last attempt was rejected.
  const canSubmit = !record || record.status === 'REJECTED';

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />

      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#070c1a]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <Link to="/profile">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4" /> Back to profile
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Identity verification</h1>
            <p className="text-sm text-slate-400">Verify your identity to unlock full access.</p>
          </div>
        </div>

        {loading ? (
          <FullPageLoader />
        ) : (
          <>
            {record && <StatusCard record={record} />}
            {canSubmit && (
              <SubmitForm
                resubmitting={!!record}
                onDone={async (next) => {
                  setRecord(next);
                  toast.success('KYC submitted', 'We’ll notify you once it’s reviewed.');
                  await refresh().catch(() => undefined);
                  navigate('/profile');
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatusCard({ record }: { record: KycRecord }) {
  const ui = STATUS_UI[record.status];
  const Icon = ui.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card mb-6 p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-brand-300" />
          <h2 className="text-lg font-semibold text-white">Your submission</h2>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${ui.classes}`}
        >
          <Icon className="h-3.5 w-3.5" /> {ui.label}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-400">{ui.note}</p>

      {record.status === 'REJECTED' && record.rejectionReason && (
        <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <span className="font-semibold">Reason:</span> {record.rejectionReason}
        </p>
      )}

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <Detail label="Full name" value={record.fullName} />
        <Detail
          label="Document"
          value={`${DOC_TYPES.find((d) => d.value === record.documentType)?.label ?? record.documentType} • ${record.documentNumber}`}
        />
      </dl>
    </motion.div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-200">{value}</dd>
    </div>
  );
}

function SubmitForm({
  resubmitting,
  onDone,
}: {
  resubmitting: boolean;
  onDone: (record: KycRecord) => void | Promise<void>;
}) {
  const toast = useToast();
  const [files, setFiles] = useState<{ front?: File; back?: File; selfie?: File }>({});

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<KycValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: { fullName: '', dateOfBirth: '', documentType: 'AADHAR', documentNumber: '' },
  });

  const onSubmit = async (values: KycValues) => {
    if (!files.front || !files.selfie) {
      toast.error('Missing documents', 'Please upload the front image and a selfie.');
      return;
    }
    try {
      const record = await submitKyc({
        ...values,
        frontImage: files.front,
        backImage: files.back,
        selfieImage: files.selfie,
      });
      await onDone(record);
    } catch (err) {
      toast.error('Submission failed', err instanceof ApiError ? err.message : undefined);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit(onSubmit)}
      className="glass-card space-y-5 p-6 sm:p-8"
      noValidate
    >
      <h2 className="text-lg font-semibold text-white">
        {resubmitting ? 'Resubmit your documents' : 'Submit your documents'}
      </h2>

      <Input label="Full name (as on document)" error={errors.fullName?.message} {...register('fullName')} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
            Date of birth
          </label>
          <input
            type="date"
            className="glass-input !pl-4 [color-scheme:dark]"
            {...register('dateOfBirth')}
          />
          {errors.dateOfBirth && (
            <p className="text-xs text-rose-400">{errors.dateOfBirth.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
            Document type
          </label>
          <select className="glass-input !pl-4 [color-scheme:dark]" {...register('documentType')}>
            {DOC_TYPES.map((d) => (
              <option key={d.value} value={d.value} className="bg-[#0f1830]">
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Input
        label="Document number"
        error={errors.documentNumber?.message}
        {...register('documentNumber')}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FilePicker label="Front image" required capture="environment" onPick={(f) => setFiles((s) => ({ ...s, front: f }))} />
        <FilePicker label="Back image" capture="environment" onPick={(f) => setFiles((s) => ({ ...s, back: f }))} />
        <FilePicker label="Selfie" required capture="user" camera="user" onPick={(f) => setFiles((s) => ({ ...s, selfie: f }))} />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" size="lg" loading={isSubmitting}>
          {!isSubmitting && <ShieldCheck className="h-4 w-4" />} Submit for verification
        </Button>
      </div>
    </motion.form>
  );
}

function FilePicker({
  label,
  required,
  capture,
  camera,
  onPick,
}: {
  label: string;
  required?: boolean;
  /** On mobile, open the camera directly: "user" = front (selfie), "environment" = rear. */
  capture?: 'user' | 'environment';
  /** When set, the tile opens the webcam (works on laptops too) instead of the file dialog. */
  camera?: 'user' | 'environment';
  onPick: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [camOpen, setCamOpen] = useState(false);

  const accept = (file: File) => {
    setName(file.name);
    onPick(file);
  };

  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) accept(file);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => (camera ? setCamOpen(true) : ref.current?.click())}
        onKeyDown={(e) =>
          (e.key === 'Enter' || e.key === ' ') &&
          (e.preventDefault(), camera ? setCamOpen(true) : ref.current?.click())
        }
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-5 text-center text-xs transition ${
          name
            ? 'border-brand-400/50 bg-brand-500/10 text-brand-100'
            : 'border-white/15 bg-white/[0.02] text-slate-400 hover:border-brand-400/40 hover:text-brand-200'
        }`}
      >
        {camera ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
        <span className="font-medium">
          {label}
          {required && <span className="text-rose-400"> *</span>}
        </span>
        <span className="max-w-[10rem] truncate text-[11px] text-slate-500">
          {name ?? (camera ? 'Take a photo' : 'PNG / JPG')}
        </span>
        {camera && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              ref.current?.click();
            }}
            className="text-[11px] text-brand-300 underline-offset-2 hover:underline"
          >
            or upload a file
          </button>
        )}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          capture={capture}
          onChange={handle}
          className="hidden"
        />
      </div>

      {camera && (
        <CameraCapture
          open={camOpen}
          onClose={() => setCamOpen(false)}
          onCapture={accept}
          facingMode={camera}
          fileName={`${label.toLowerCase().replace(/\s+/g, '-')}.jpg`}
        />
      )}
    </>
  );
}
