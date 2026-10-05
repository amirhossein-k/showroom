// نمایش اطلاعات تکمیلی در نسخه چاپی قولنامه (کامپوننت سرور)
import { formatDate, toFa } from '@/lib/persian';
import { lastInquiry } from '@/lib/contractDocs';

export function PartyIdentityPrint({ p }) {
  if (!p?.birthCertNo && !p?.birthDate && !p?.issuePlace) return null;
  return (
    <div className="text-sm">
      {p.birthCertNo && <>ش.ش: {toFa(p.birthCertNo)} </>}
      {p.issuePlace && <>· صادره از {p.issuePlace} </>}
      {p.birthDate && <>· متولد {formatDate(p.birthDate)}</>}
    </div>
  );
}

export function ContractExtraPrint({ c }) {
  const d = c.carDocs || {};
  const fines = lastInquiry(c, 'fines');
  const seizure = lastInquiry(c, 'seizure');
  const any = d.cardNo || d.documentNo || d.insurancePolicyNo || fines || seizure;
  if (!any) return null;
  return (
    <div className="avoid-break mt-4">
      <h3 className="mb-1 font-black">مدارک خودرو و استعلام‌ها</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {d.cardNo && <div>شماره کارت خودرو: {toFa(d.cardNo)}</div>}
        {d.documentNo && <div>شماره سند: {toFa(d.documentNo)}</div>}
        {d.insurancePolicyNo && (
          <div>
            بیمه‌نامه ثالث: {d.insurer || ''} ش {toFa(d.insurancePolicyNo)}
            {d.insuranceExpiry ? ` · اعتبار تا ${formatDate(d.insuranceExpiry)}` : ''}
          </div>
        )}
        {d.insuranceDiscountYears > 0 && <div>تخفیف بیمه: {toFa(d.insuranceDiscountYears)} سال</div>}
        {fines && <div>استعلام خلافی ({formatDate(fines.at)}): {fines.summary}</div>}
        {seizure && <div>استعلام توقیف ({formatDate(seizure.at)}): {seizure.summary}</div>}
      </div>
    </div>
  );
}
