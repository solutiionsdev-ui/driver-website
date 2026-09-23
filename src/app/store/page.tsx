import { ComingSoonView, comingSoonMetadata } from "@/views/coming-soon";

export const metadata = comingSoonMetadata("store");

export default function StorePage() {
  return <ComingSoonView page="store" />;
}
