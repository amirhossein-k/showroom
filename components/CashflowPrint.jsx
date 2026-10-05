import { formatDate, formatNumber, toFa } from '@/lib/persian';
import { TX_CATEGORIES, TX_METHODS } from '@/lib/constants';

export default function CashflowPrint({ rows, receipt, tab, cheques = [] }) {
  const incoming = rows.filter((r) => r.direction === 'in').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const outgoing = rows.filter((r) => r.direction === 'out').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  return (
    <article className="cashflow-print" dir="rtl">
      <header>
        <h1>{receipt ? 'رسید تراکنش' : 'گزارش نقدینگی و تسویه'}</h1>
        <p>اتودار · مبالغ به تومان · {receipt ? 'یک تراکنش' : `فیلتر: ${{ all: 'همه', in: 'ورودی', out: 'خروجی' }[tab]}`} · تعداد: {toFa(rows.length)}</p>
        {receipt && <p>شناسهٔ رسید: <bdi>{rows[0]?._id}</bdi></p>}
      </header>
      <div className="print-totals">
        <p>جمع ورودی: <b>{formatNumber(incoming)}</b></p>
        <p>جمع خروجی: <b>{formatNumber(outgoing)}</b></p>
        <p>خالص: <b>{formatNumber(incoming - outgoing)}</b></p>
      </div>
      <table>
        <caption>{receipt ? 'جزئیات رسید' : 'تراکنش‌های فیلتر انتخاب‌شده'}</caption>
        <thead><tr>{['ردیف', 'تاریخ', 'نوع / بابت', 'طرف حساب / خودرو', 'روش', 'مبلغ (تومان)', 'شرح'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((t, i) => <tr key={t._id}>
          <td>{toFa(i + 1)}</td><td>{formatDate(t.date)}</td>
          <td>{t.direction === 'in' ? 'ورودی' : 'خروجی'}<br />{TX_CATEGORIES[t.category] || t.category}</td>
          <td>{t.party || 'بدون طرف حساب'}{t.car && <><br />{t.car.brand} {t.car.model} {toFa(t.car.year || '')}</>}</td>
          <td>{TX_METHODS[t.method] || t.method}</td>
          <td className="print-money">{formatNumber(t.amount)}</td>
          <td className="print-note">{t.note || 'ـ'}</td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <p>تراکنشی در این فیلتر ثبت نشده است.</p>}
      {!receipt && cheques.length > 0 && <>
        <h2>چک‌های باز (مستقل از فیلتر تراکنش‌ها)</h2>
        <table>
          <thead><tr>{['طرف حساب', 'نوع', 'سررسید', 'مبلغ (تومان)'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>{cheques.map((q) => <tr key={q._id}><td>{q.party || 'بدون طرف حساب'}</td><td>{q.direction === 'received' ? 'دریافتی' : 'پرداختی'}</td><td>{formatDate(q.dueDate)}</td><td className="print-money">{formatNumber(q.amount)}</td></tr>)}</tbody>
        </table>
      </>}
      <footer>این گزارش ثبت حسابداری است و به‌تنهایی تأییدیهٔ بانکی پرداخت نیست.</footer>
    </article>
  );
}
