'use client';
// [settlement] تسویه خودرو با مالک امانی، شرکا و کمیسیون‌بگیرها
import { useState } from 'react';
import { formatNumber, priceShort, toFa } from '@/lib/persian';
import { Modal } from './inputs';
import { TxForm } from './forms';

const money = (n) => `${formatNumber(n)} تومان`;
const KIND = { owner: 'مالک امانی', partner: 'شریک', commission: 'کمیسیون' };

export default function SettlementPanel({ car, st }) {
  const [pay, setPay] = useState(null);
  const title = `${car.brand} ${car.model} ${car.year || ''}`.trim();
  return (
    <div className="space-y-4">
      {st.projected && <p className="rounded-xl bg-amberx-soft px-3 py-2 text-sm font-bold text-amberx">پیش‌بینی با قیمت آگهی ({priceShort(st.price)})؛ بعد از فروش با قیمت واقعی حساب می‌شود.</p>}

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-paper p-3">
          <div className="text-sm text-ink-mute">{st.projected ? 'قیمت آگهی' : 'پول خریدار (کل)'}</div>
          <div className="num mt-1 text-lg font-extrabold" title={money(st.price)}>{priceShort(st.price)}</div>
          {!st.projected && <div className="mt-1 text-sm text-ink-mute">وصول {st.usesVerified ? 'تأییدشده' : 'ثبت‌شده'}: <b className="num text-cash">{priceShort(st.collected)}</b></div>}
        </div>
        <div className="rounded-xl bg-paper p-3">
          <div className="text-sm text-ink-mute">سهم دیگران</div>
          <div className="num mt-1 text-lg font-extrabold text-amberx" title={money(st.othersDue)}>{priceShort(st.othersDue)}</div>
          <div className="mt-1 text-sm text-ink-mute">پرداخت‌شده {priceShort(st.paidToOthers)} · مانده <b className={st.owedToOthers ? 'text-alarm' : 'text-cash'}>{priceShort(st.owedToOthers)}</b></div>
        </div>
        <div className="rounded-xl bg-asphalt-900 p-3 text-white">
          <div className="text-sm text-white/70">برای نمایشگاه می‌ماند</div>
          <div className={`num mt-1 text-lg font-extrabold ${st.showroom.share < 0 ? 'text-red-300' : 'text-road'}`} title={money(st.showroom.share)}>{priceShort(st.showroom.share)}</div>
          <div className="mt-1 text-sm text-white/70">آورده {priceShort(st.showroom.capital)} + سود {priceShort(st.showroom.profit)}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-[15px]">
          <thead>
            <tr className="text-right text-sm text-ink-mute">
              <th className="py-2 font-semibold">طرف حساب</th>
              <th className="py-2 font-semibold">مبنا</th>
              <th className="py-2 font-semibold">سهم</th>
              <th className="py-2 font-semibold">پرداخت‌شده</th>
              <th className="py-2 font-semibold">باید بدهی</th>
              <th className="py-2"><span className="sr-only">اقدام</span></th>
            </tr>
          </thead>
          <tbody>
            {st.parties.map((p) => (
              <tr key={p.key} className="border-t border-line align-top">
                <td className="py-2.5"><div className="font-bold">{p.name}</div><div className="text-sm text-ink-mute">{KIND[p.kind]}{p.phone ? ` · ${toFa(p.phone)}` : ''}</div></td>
                <td className="py-2.5 text-sm text-ink-soft">{toFa(p.basis)}</td>
                <td className="num py-2.5" title={money(p.due)}>{priceShort(p.due)}</td>
                <td className="num py-2.5 text-cash">{priceShort(p.paid)}</td>
                <td className={`num py-2.5 font-extrabold ${p.remaining > 0 ? 'text-alarm' : p.remaining < 0 ? 'text-amberx' : 'text-cash'}`}>
                  {p.remaining > 0 ? priceShort(p.remaining) : p.remaining < 0 ? `اضافه ${priceShort(-p.remaining)}` : 'تسویه'}
                </td>
                <td className="py-2.5 text-left">
                  {p.remaining > 0 && !st.projected && p.kind !== 'commission' && (
                    <button type="button" className="btn-ghost px-3 text-sm" onClick={() => setPay(p)}>ثبت پرداخت</button>
                  )}
                  {p.remaining > 0 && p.kind === 'commission' && <span className="text-sm text-ink-mute">در بخش کمیسیون تیک بزن</span>}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-asphalt-900 font-extrabold">
              <td className="py-2.5">نمایشگاه</td>
              <td className="py-2.5 text-sm font-normal text-ink-soft">{toFa(st.showroom.percent)}٪ · باقی‌مانده پس از دیگران</td>
              <td className="num py-2.5" title={money(st.showroom.share)}>{priceShort(st.showroom.share)}</td>
              <td colSpan={3} />
            </tr>
          </tbody>
        </table>
        {!st.parties.length && <p className="mt-2 text-sm text-ink-mute">این خودرو مالک امانی، شریک یا کمیسیون ندارد؛ کل مبلغ برای نمایشگاه است.</p>}
      </div>

      {!st.projected && st.owedToOthers > 0 && (
        <div className="rounded-xl border border-line p-3 text-sm leading-7">
          <b>با پول واقعاً رسیده:</b> از {st.usesVerified ? 'وصول تأییدشده' : 'دریافت ثبت‌شده'} بعد از پرداخت‌های قبلی، <b className="num">{money(Math.max(0, st.cashLeft))}</b> در دست داری؛
          {st.payableNow >= st.owedToOthers
            ? <> می‌توانی همه بدهی‌ها (<b className="num">{priceShort(st.owedToOthers)}</b>) را بپردازی و <b className="num text-cash">{priceShort(st.showroomInHand)}</b> برای نمایشگاه می‌ماند.</>
            : <> فقط <b className="num">{priceShort(st.payableNow)}</b> از <b className="num">{priceShort(st.owedToOthers)}</b> بدهی قابل پرداخت است. بقیه را تا وصول از خریدار از جیب نمایشگاه نده.</>}
        </div>
      )}

      {st.warnings.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-alarm-soft p-3 text-sm font-bold text-alarm">
          {st.warnings.map((w) => <li key={w}>• {w}</li>)}
        </ul>
      )}
      <p className="text-sm leading-7 text-ink-mute">
        سهم شرکا = آورده سرمایه + درصد سهم × سود اسمی. هزینه خواب سرمایه نقدی نیست و در تقسیم پول لحاظ نمی‌شود. پرداخت به مالک امانی با بابت «پرداخت به فروشنده/مالک» و به شریک با بابت «شریک» و نام همان شریک ثبت شود تا اینجا خوانده شود.
      </p>

      <Modal open={!!pay} onClose={() => setPay(null)} title={pay ? `پرداخت به ${pay.name}` : ''}>
        {pay && (
          <TxForm
            key={pay.key}
            fixedCar={car._id}
            defaults={{ ...pay.payDefaults, method: 'transfer', amount: Math.max(0, Math.min(pay.remaining, st.payableNow || pay.remaining)), note: `تسویه ${KIND[pay.kind]} · ${title}` }}
            onDone={() => setPay(null)}
          />
        )}
      </Modal>
    </div>
  );
}
