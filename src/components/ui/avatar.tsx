/* eslint-disable @next/next/no-img-element */
import { cn, initials } from '@/lib/utils';
import { avatarUrl } from '@/lib/storage';

const sizes = { xs: 'size-6 text-2xs', sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-base', xl: 'size-20 text-xl' };

export function Avatar({ name, path, size = 'md', className }: {
  name: string;
  path?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const src = avatarUrl(path);
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft font-semibold text-brand-strong ring-1 ring-line', sizes[size], className)}
      aria-hidden={src ? undefined : true}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  );
}
