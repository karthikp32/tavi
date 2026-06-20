import { WorkOrderReviewView } from "./WorkOrderReviewView";

export default async function WorkOrderReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkOrderReviewView workOrderId={id} />;
}
