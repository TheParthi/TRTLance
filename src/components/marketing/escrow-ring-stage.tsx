'use client';

import { EscrowRing } from './escrow-ring';

/** The example-contract ring on an ink ground (sign-in, sign-up). Decorative. */
export function EscrowRingStage({ className }: { className?: string }) {
  return <EscrowRing demo onDark className={className} />;
}
