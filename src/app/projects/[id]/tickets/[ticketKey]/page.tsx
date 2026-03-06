import { redirect } from "next/navigation";

export default async function ProjectTicketRedirectPage({
  params,
}: {
  params: Promise<{ id: string; ticketKey: string }>;
}) {
  const { ticketKey } = await params;
  redirect(`/tickets/${encodeURIComponent(ticketKey)}`);
}
