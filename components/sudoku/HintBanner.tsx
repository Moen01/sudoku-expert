'use client';

import type { Hint } from '@/lib/game/hints';
import { HintIcon } from './icons';

interface HintBannerProps {
  hint: Hint | null;
}

/** Fixed-height slot so showing/hiding a hint doesn't shift the board. */
export function HintBanner({ hint }: HintBannerProps) {
  return (
    <div className="min-h-[2.75rem] w-full">
      {hint && (
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2 text-sm"
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--text)',
            border: '1px solid var(--accent)',
          }}
          role="status"
        >
          <span style={{ color: 'var(--accent)', marginTop: 1 }}>
            <HintIcon width={18} height={18} />
          </span>
          <span>{hint.message}</span>
        </div>
      )}
    </div>
  );
}
