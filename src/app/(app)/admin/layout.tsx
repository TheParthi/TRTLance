import { requireAdmin } from '@/lib/auth';

/** Platform administration. Every page below requires a platform admin. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin('/admin');
  return children;
}
