import { Suspense } from "react";
import { MeetingsList } from "@/components/meeting/MeetingsList";

export default function MeetingsPage() {
  return (
    <Suspense>
      <MeetingsList />
    </Suspense>
  );
}
