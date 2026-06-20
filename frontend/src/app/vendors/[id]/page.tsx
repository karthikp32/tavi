import { VendorProfileView } from "./VendorProfileView";

export default async function VendorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VendorProfileView vendorId={id} />;
}
