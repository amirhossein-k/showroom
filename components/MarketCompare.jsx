import { priceShort, formatNumber, toFa } from '@/lib/persian';
import { Badge, Empty } from './ui';
import { ApplyPriceButton } from './CarSections';

export default function MarketCompare({ car, analysis }) {
  if (!analysis?.available) return <Empty>برای این مدل هنوز دادهٔ قابل مقایسه در فایل بازار نداریم.</Empty>;
  const max = Math.max(...(analysis.samples || []).map((x) => x.price), car.askingPrice || 0, analysis.suggested.max);
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-plate-soft p-4"><div className="text-sm font-bold text-plate">میانه آگهی‌ها</div><div className="num mt-1 text-xl font-black text-plate">{priceShort(analysis.adMedian)} <span className="text-xs">تومان</span></div></div>
        <div className="rounded-2xl bg-cash-soft p-4"><div className="text-sm font-bold text-cash">میانه معامله واقعی</div><div className="num mt-1 text-xl font-black text-cash">{analysis.dealMedian ? priceShort(analysis.dealMedian) : 'داده نداریم'}</div></div>
        <div className="rounded-2xl bg-road-soft p-4"><div className="text-sm font-bold text-asphalt-900">بازه پیشنهادی فروش</div><div className="num mt-1 text-xl font-black text-asphalt-900">{priceShort(analysis.suggested.min)} تا {priceShort(analysis.suggested.max)}</div></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
        <div className="text-[15px]">
          قیمت آگهی فعلی: <b className="num">{priceShort(car.askingPrice)} تومان</b>
          {analysis.diffPct !== null && <span className={`mr-2 font-bold ${analysis.diffPct > 0 ? 'text-alarm' : 'text-cash'}`}>({analysis.diffPct > 0 ? '+' : ''}{toFa(Math.round(analysis.diffPct))}٪ نسبت به میانه)</span>}
        </div>
        <ApplyPriceButton carId={car._id} price={analysis.suggested.target} />
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-sm text-ink-mute">
          <span>{toFa(analysis.count)} نمونه · {toFa(analysis.adsCount)} آگهی · {toFa(analysis.dealsCount)} معامله</span>
          {analysis.widened && <span>با بازهٔ سال ±۱</span>}
        </div>
        <div className="space-y-2">
          {(analysis.samples || []).map((x, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-16 shrink-0 text-sm font-bold text-ink-mute">{x.source === 'deal' ? 'معامله' : x.source === 'divar' ? 'دیوار' : 'باما'}</div>
              <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-paper">
                <div className={`h-full rounded-lg ${x.type === 'deal' ? 'bg-cash/80' : 'bg-plate/70'}`} style={{ width: `${Math.max(7, (x.price / max) * 100)}%` }} />
                <div className="absolute inset-y-0 right-3 flex items-center gap-2 text-sm font-extrabold">{priceShort(x.price)} <span className="font-medium text-ink-mute">· {toFa(x.year)} · {formatNumber(x.mileage)} km</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-ink-mute">قیمت‌های این صفحه فعلاً از فایل دادهٔ آزمایشی پروژه خوانده می‌شوند. معامله واقعی داخل اتودار در محاسبهٔ میانه، وزن بیشتری از آگهی می‌گیرد.</p>
    </div>
  );
}
