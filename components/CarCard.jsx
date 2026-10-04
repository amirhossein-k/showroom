import Link from 'next/link';
import { CarStatusBadge, Plate, StayMeter, Badge } from './ui';
import { formatNumber, priceShort, priceWords, toFa } from '@/lib/persian';
import { ACTIVE_STATUSES, OWNERSHIP } from '@/lib/constants';
import Icon from './Icon';

export function CarCover({ car, className = '' }) {
  if (car.images?.[0]) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={car.images[0]} alt={`${car.brand} ${car.model}`} className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`relative grid h-full w-full place-items-center bg-asphalt-800 text-white/25 ${className}`}>
      <Icon name="car" size={64} stroke={1.3} />
      <div className="lane absolute bottom-5 left-0 right-0 h-1 opacity-40" />
    </div>
  );
}

export default function CarCard({ car, settings }) {
  const active = ACTIVE_STATUSES.includes(car.status);
  const price = active ? car.askingPrice : car.salePrice || car.askingPrice;
  return (
    <Link href={`/cars/${car._id}`} className="card group flex animate-rise flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden">
        <CarCover car={car} className="transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute right-3 top-3 flex gap-1.5">
          <CarStatusBadge status={car.status} />
          {car.ownership === 'consignment' && <Badge cls="bg-white/90 text-asphalt-900">{OWNERSHIP.consignment}</Badge>}
        </div>
        {car.mk?.flag === 'over' && (
          <div className="absolute bottom-3 right-3">
            <Badge cls="bg-alarm text-white">{toFa(Math.round(car.mk.diffPct))}٪ بالاتر از بازار</Badge>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[17px] font-extrabold leading-snug">
              {toFa(`${car.brand} ${car.model}`)}
            </div>
            <div className="mt-0.5 text-sm text-ink-mute">
              مدل {toFa(car.year || '—')} · {car.color || '—'} · {formatNumber(car.mileage || 0)} کیلومتر
            </div>
          </div>
        </div>
        <Plate plate={car.plate} size="sm" />
        <div className="mt-auto">
          <div className="num text-2xl font-black tracking-tight">
            {price ? priceShort(price) : '—'} <span className="text-sm font-semibold text-ink-mute">تومان</span>
          </div>
          {price ? <div className="line-clamp-1 text-sm text-ink-mute">{priceWords(price)}</div> : null}
        </div>
        {active && car.fin && <StayMeter days={car.fin.days} threshold={settings.dormantDays} compact />}
      </div>
    </Link>
  );
}
