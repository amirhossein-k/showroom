#!/usr/bin/env node
// افزودن راهنمای درون‌برنامه‌ای به منو و همه صفحه‌ها
// اجرا از ریشه پروژه: node scripts/add-guide.mjs  (اجرای دوباره بی‌خطر است)
import fs from 'fs';
import path from 'path';

const MARK = '[guide]';
const file = path.join(process.cwd(), 'components/Shell.jsx');
if (!fs.existsSync(file)) {
  console.error('✗ components/Shell.jsx پیدا نشد');
  process.exit(1);
}
let src = fs.readFileSync(file, 'utf8');
if (src.includes(MARK)) {
  console.log('• Shell.jsx: قبلاً اعمال شده');
  process.exit(0);
}
const steps = [
  { desc: 'import PageGuide', re: /import Icon from '\.\/Icon';/, fn: (m) => `${m}\nimport PageGuide from './PageGuide'; // ${MARK}` },
  { desc: 'آیتم «راهنما» در منو بعد از تنظیمات', re: /\{\s*href:\s*'\/settings'[^}]*\},/, fn: (m) => `${m}\n  { href: '/guide', label: 'راهنما', icon: 'report' }, // ${MARK}` },
  { desc: 'نمایش PageGuide بالای محتوای هر صفحه', re: />\s*\{children\}\s*<\/main>/, fn: () => `><PageGuide />{children}</main>` },
];
for (const s of steps) {
  if (!s.re.test(src)) {
    console.error(`✗ لنگر پیدا نشد: ${s.desc}. این تغییر را دستی اعمال کن.`);
    process.exit(1);
  }
  src = src.replace(s.re, s.fn);
}
fs.writeFileSync(file + '.bak', fs.readFileSync(file));
fs.writeFileSync(file, src);
console.log('✓ components/Shell.jsx (نسخه قبلی: Shell.jsx.bak)\nتمام. npm run dev');
