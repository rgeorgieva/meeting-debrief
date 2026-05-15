import { notFound } from "next/navigation";
import { n8nFetch, N8nError } from "@/lib/n8n";
import { getSessionToken } from "@/lib/session";
import { MeetingDetail } from "@/components/meeting/MeetingDetail";
import type { Meeting } from "@/lib/types";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await getSessionToken();
  if (!token) notFound();

  try {
    const res = await n8nFetch<{ meeting: Meeting }>("meetings.get", {
      id,
      sessionToken: token,
    });
    return <MeetingDetail meeting={res.meeting} />;
  } catch (err) {
    if (err instanceof N8nError && (err.status === 404 || err.status === 401)) {
      notFound();
    }
    throw err;
  }
}
