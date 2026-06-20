import { BidDetailView } from "./BidDetailView";

export default async function BidDetailPage({
  params,
}: {
  params: Promise<{ id: string; bidId: string }>;
}) {
  const { id, bidId } = await params;
  return <BidDetailView workOrderId={id} bidId={bidId} />;
}
