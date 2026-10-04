import { notFound } from 'next/navigation';
import { connectDB, plain } from '@/lib/db';
import { Car } from '@/lib/models';
import CarForm from '@/components/CarForm';
import { PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function EditCarPage({ params }) {
  await connectDB();
  const car = plain(await Car.findById(params.id).lean().catch(() => null));
  if (!car) notFound();
  return (
    <>
      <PageHeader title="ویرایش پرونده خودرو" subtitle={`${car.brand} ${car.model}`} />
      <CarForm initial={car} />
    </>
  );
}
