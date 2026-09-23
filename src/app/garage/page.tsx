import { ComingSoonView, comingSoonMetadata } from "@/views/coming-soon";

export const metadata = comingSoonMetadata("garage");

export default function GaragePage() {
  return <ComingSoonView page="garage" />;
}
