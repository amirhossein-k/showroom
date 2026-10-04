import { toJalali, jalaliToDate } from './jalali';
import { addDays } from './persian';

export const PERIODS = {
  month: 'ماه جاری',
  quarter: '۳ ماه اخیر',
  year: 'سال جاری',
  all: 'همه',
};

export function getPeriod(key = 'month') {
  const now = new Date();
  if (key === 'quarter') return { key, from: addDays(now, -90), to: now, label: PERIODS.quarter };
  if (key === 'year') {
    const { jy } = toJalali(now);
    const from = jalaliToDate(jy, 1, 1);
    from.setHours(0, 0, 0, 0);
    return { key, from, to: now, label: PERIODS.year };
  }
  if (key === 'all') return { key, from: new Date(2000, 0, 1), to: now, label: PERIODS.all };
  const { jy, jm } = toJalali(now);
  const from = jalaliToDate(jy, jm, 1);
  from.setHours(0, 0, 0, 0);
  return { key: 'month', from, to: now, label: PERIODS.month };
}
