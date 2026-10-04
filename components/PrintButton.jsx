'use client';
export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="no-print rounded-xl bg-asphalt-900 px-5 py-2.5 text-sm font-bold text-white">
      چاپ / ذخیره PDF
    </button>
  );
}
