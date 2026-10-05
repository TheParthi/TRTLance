import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SettingsSections } from '@/components/settings/settings-section';
import type { Certification, Education, PortfolioItem } from '@/lib/types';
import { CertificationManager } from './certification-manager';
import { EducationManager } from './education-manager';
import { PortfolioManager } from './portfolio-manager';

export const metadata: Metadata = { title: 'Portfolio & credentials' };

export default async function PortfolioSettingsPage() {
  const viewer = await requireViewer('/settings/portfolio');
  const supabase = await createClient();
  const [portfolio, education, certifications] = await Promise.all([
    supabase.from('portfolio_items').select('*').eq('user_id', viewer.id).order('created_at', { ascending: false }),
    supabase.from('education').select('*').eq('user_id', viewer.id).order('end_year', { ascending: false, nullsFirst: true }),
    supabase.from('certifications').select('*').eq('user_id', viewer.id).order('issued_on', { ascending: false, nullsFirst: false }),
  ]);
  // A failed query surfaces through the error boundary rather than looking like an empty profile.
  for (const r of [portfolio, education, certifications]) if (r.error) throw r.error;

  return (
    <SettingsSections>
      <PortfolioManager items={(portfolio.data ?? []) as PortfolioItem[]} />
      <EducationManager items={(education.data ?? []) as Education[]} />
      <CertificationManager items={(certifications.data ?? []) as Certification[]} />
    </SettingsSections>
  );
}
