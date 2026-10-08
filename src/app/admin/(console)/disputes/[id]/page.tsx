import { notFound, redirect } from 'next/navigation';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Admin notifications link here. The case room is where a dispute is actually read and decided —
 * it holds the evidence, the statements and the AI summary — so there is nothing to duplicate in
 * the console and this just forwards.
 */
export default async function ConsoleDisputeRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  redirect(`/arbitration/cases/${id}`);
}
