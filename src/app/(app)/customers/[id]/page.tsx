import { redirect } from 'next/navigation';

export function generateStaticParams() {
  return [{ id: 'default' }];
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // We don't even need to resolve params if we're redirecting anyway
  redirect('/customers');
  return null;
}
