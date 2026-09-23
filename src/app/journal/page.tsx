import { ComingSoonView, comingSoonMetadata } from "@/views/coming-soon";

export const metadata = comingSoonMetadata("journal");

export default function JournalPage() {
  return <ComingSoonView page="journal" />;
}
