import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfileSettingsPage() {
  const viewer = await requireViewer('/settings');
  return <ProfileForm userId={viewer.id} profile={viewer.profile} />;
}
