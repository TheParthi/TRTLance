import { publicEnv } from '@/lib/env';

export const BUCKETS = {
  avatars: 'avatars',
  projectFiles: 'project-files',
  contractFiles: 'contract-files',
  conversationFiles: 'conversation-files',
  disputeEvidence: 'dispute-evidence',
} as const;

export const MAX_UPLOAD_BYTES = {
  avatars: 2 * 1024 * 1024,
  'project-files': 25 * 1024 * 1024,
  'contract-files': 50 * 1024 * 1024,
  'conversation-files': 25 * 1024 * 1024,
  'dispute-evidence': 50 * 1024 * 1024,
} as const;

export function avatarUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${BUCKETS.avatars}/${path}`;
}

/** Storage object name: "<owner record id>/<random>-<sanitised file name>". */
export function objectPath(ownerId: string, fileName: string) {
  const safe = fileName.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(-120) || 'file';
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : `${Date.now()}`;
  return `${ownerId}/${rand}-${safe}`;
}
