import { motion } from 'framer-motion';
import { passwordStrength } from '@/lib/utils';

const COLORS = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500'];
const TEXT = ['text-rose-400', 'text-rose-400', 'text-amber-400', 'text-yellow-300', 'text-emerald-400'];

export function PasswordStrength({ value }: { value: string }) {
  const { score, label } = passwordStrength(value);
  if (!value) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={false}
              animate={{ scaleX: i < score ? 1 : 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ originX: 0 }}
              className={`h-full w-full ${COLORS[score]}`}
            />
          </div>
        ))}
      </div>
      <p className={`text-xs font-medium ${TEXT[score]}`}>Password strength: {label}</p>
    </div>
  );
}
