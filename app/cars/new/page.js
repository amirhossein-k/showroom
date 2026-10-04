import CarForm from '@/components/CarForm';
import { PageHeader } from '@/components/ui';

export default function NewCarPage() {
  return (
    <>
      <PageHeader title="ثبت خودروی جدید" subtitle="پرونده کامل: مشخصات، پلاک، عکس و قیمت خرید" />
      <CarForm />
    </>
  );
}
