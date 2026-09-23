import { ComingSoonView, comingSoonMetadata } from "@/views/coming-soon";

export const metadata = comingSoonMetadata("trailer");

export default function TrailerPage() {
  return <ComingSoonView page="trailer" />;
}
