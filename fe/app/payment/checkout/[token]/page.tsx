import PaymentCheckout from '@/views/PaymentCheckout';

export default async function PaymentCheckoutPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PaymentCheckout token={token} />;
}
