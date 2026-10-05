import type { Metadata } from 'next';
import { PageHeader } from '@/components/common/page-header';
import { SettingsNav } from './settings-nav';

export const metadata: Metadata = { title: { template: '%s · Settings', default: 'Settings' } };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Settings" description="Your public profile, credentials, account security and notifications." />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-10">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
