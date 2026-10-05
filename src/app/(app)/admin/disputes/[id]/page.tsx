import { notFound, redirect } from 'next/navigation';

type Params = { params: Promise<{ id: string }> };

/** Admin notifications link here; the case room is where admins review and decide. */
export default async function AdminDisputeRedirect({ params }: Params) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  redirect(`/arbitration/cases/${id}`);
}
