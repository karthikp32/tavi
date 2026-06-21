import { VendorProfileView } from "./VendorProfileView";

export default async function VendorProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ work_order_id?: string }>;
}) {
  const { id } = await params;
  const { work_order_id } = await searchParams;
  return <VendorProfileView vendorId={id} initialWorkOrderId={work_order_id} />;
}
