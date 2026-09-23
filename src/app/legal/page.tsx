import { ComingSoonView, comingSoonMetadata } from "@/views/coming-soon";

export const metadata = comingSoonMetadata("legal");

export default function LegalPage() {
  return <ComingSoonView page="legal" />;
}
