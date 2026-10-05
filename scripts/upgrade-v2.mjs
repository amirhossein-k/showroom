#!/usr/bin/env node
// اعمال تغییرات کوچک روی فایل‌های موجود (models.js، ContractForm.jsx، صفحه چاپ، package.json)
// اجرا از ریشه پروژه:  node scripts/upgrade-v2.mjs
// امن است: اگر قبلاً اجرا شده باشد کاری نمی‌کند؛ اگر لنگری پیدا نشود، فایل را دست نمی‌زند و خطا می‌دهد.
import fs from 'fs';
import path from 'path';

const MARK = '[upgrade-v2]';
const root = process.cwd();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fuzzy = (anchor) => new RegExp(esc(anchor).replace(/\s+/g, '\\s*'));
let failed = false;

function patch(file, steps) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) {
    console.error(`✗ ${file} پیدا نشد`);
    failed = true;
    return;
  }
  let src = fs.readFileSync(p, 'utf8');
  if (src.includes(MARK)) return console.log(`• ${file}: قبلاً اعمال شده`);
  for (const s of steps) {
    const re = fuzzy(s.anchor);
    const m = src.match(re);
    if (!m) {
      console.error(`✗ ${file}: لنگر پیدا نشد → ${s.anchor}\n  این تغییر را دستی اعمال کن: ${s.desc}`);
      failed = true;
      return;
    }
    const at = m.index;
    const end = at + m[0].length;
    if (s.mode === 'replace') src = src.slice(0, at) + s.text + src.slice(end);
    else if (s.mode === 'before') src = src.slice(0, at) + s.text + src.slice(at);
    else src = src.slice(0, end) + s.text + src.slice(end);
  }
  fs.writeFileSync(p + '.bak', fs.readFileSync(p));
  fs.writeFileSync(p, src);
  console.log(`✓ ${file} (نسخه قبلی: ${file}.bak)`);
}

// ───── lib/models.js ─────
patch('lib/models.js', [
  {
    desc: 'فیلدهای شناسنامه/تاریخ تولد/محل صدور به partySchema',
    anchor: '{ name: String, fatherName: String, nationalId: String, phone: String, address: String },',
    mode: 'replace',
    text: `{ name: String, fatherName: String, nationalId: String, phone: String, address: String, birthCertNo: String, birthDate: Date, issuePlace: String }, // ${MARK}`,
  },
  {
    desc: 'تعریف اسکیمای مدارک/استعلام قبل از contractSchema',
    anchor: 'const contractSchema = new Schema(',
    mode: 'before',
    text: `// ${MARK} مدارک خودرو، فایل‌های بارگذاری‌شده، استعلام‌ها
const carDocsSchema = new Schema(
  { cardNo: String, documentNo: String, insurer: String, insurancePolicyNo: String, insuranceExpiry: Date, insuranceDiscountYears: Number },
  { _id: false }
);
const contractDocSchema = new Schema({
  type: { type: String, default: 'other' },
  title: String,
  key: String, // کلید فایل در فضای خصوصی — هرگز به کلاینت فرستاده نمی‌شود
  name: String,
  mime: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now },
});
const inquirySchema = new Schema({
  kind: { type: String, enum: ['fines', 'seizure'] },
  at: { type: Date, default: Date.now },
  ok: Boolean,
  provider: String,
  amount: Number,
  seized: Boolean,
  trackingCode: String,
  summary: String,
  note: String,
  raw: Schema.Types.Mixed,
});

`,
  },
  {
    desc: 'افزودن carDocs/documents/inquiries به contractSchema بعد از history',
    anchor: 'history: [historySchema],',
    mode: 'after',
    text: `
    carDocs: { type: carDocsSchema, default: () => ({}) },
    documents: [contractDocSchema],
    inquiries: [inquirySchema],`,
  },
]);

// ───── components/ContractForm.jsx ─────
patch('components/ContractForm.jsx', [
  {
    desc: "import { PartyIdentityExtra, ContractCarDocs } from './ContractExtraFields'",
    anchor: "from '@/lib/contractDefaults';",
    mode: 'after',
    text: `\nimport { PartyIdentityExtra, ContractCarDocs } from './ContractExtraFields'; // ${MARK}`,
  },
  {
    desc: 'درون PartyFields، قبل از {withAddress && (  →  <PartyIdentityExtra value={v} onChange={onChange} />',
    anchor: '{withAddress && (',
    mode: 'before',
    text: '<PartyIdentityExtra value={v} onChange={onChange} />\n        ',
  },
  {
    desc: 'state مدارک خودرو بعد از state یادداشت',
    anchor: "const [notes, setNotes] = useState(contract?.notes || '');",
    mode: 'after',
    text: '\n  const [carDocs, setCarDocs] = useState(contract?.carDocs || { insuranceExpiry: car.insuranceExpiry });',
  },
  {
    desc: 'افزودن carDocs به payload بعد از witnesses',
    anchor: 'witnesses: witnesses.filter((w) => w.name),',
    mode: 'after',
    text: '\n      carDocs,',
  },
  {
    desc: 'قبل از {err && …}  →  <ContractCarDocs value={carDocs} onChange={setCarDocs} />',
    anchor: '{err && ',
    mode: 'before',
    text: '<ContractCarDocs value={carDocs} onChange={setCarDocs} />\n\n      ',
  },
]);

// ───── app/contracts/[id]/print/page.js ─────
patch('app/contracts/[id]/print/page.js', [
  {
    desc: "import { PartyIdentityPrint, ContractExtraPrint } from '@/components/ContractExtraPrint'",
    anchor: "import PrintButton from '@/components/PrintButton';",
    mode: 'after',
    text: `\nimport { PartyIdentityPrint, ContractExtraPrint } from '@/components/ContractExtraPrint'; // ${MARK}`,
  },
  { desc: 'در Party قبل از {p?.address && …}', anchor: '{p?.address && ', mode: 'before', text: '<PartyIdentityPrint p={p} />\n      ' },
  { desc: 'قبل از بخش شهود {w.length > 0 && (', anchor: '{w.length > 0 && (', mode: 'before', text: '<ContractExtraPrint c={c} />\n\n        ' },
]);

// ───── package.json ─────
{
  const p = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!pkg.dependencies.exceljs) {
    pkg.dependencies.exceljs = '^4.4.0';
    fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
    console.log('✓ package.json: exceljs اضافه شد → حالا npm install بزن');
  }
}

if (failed) {
  console.error('\nبعضی تغییرات اعمال نشد؛ پیام‌های بالا را ببین.');
  process.exit(1);
}
console.log('\nتمام. npm install و بعد npm run dev');
