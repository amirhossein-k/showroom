'use client';
import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import Icon from './Icon';

export default function ImageUploader({ images = [], onChange }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const upload = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    setErr('');
    try {
      const fd = new FormData();
      [...files].forEach((f) => fd.append('files', f));
      const { urls } = await api('/api/upload', 'POST', fd);
      onChange([...images, ...urls]);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {images.map((src, i) => (
          <div key={src} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-paper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="chip absolute bottom-1.5 right-1.5 bg-road text-asphalt-950">کاور</span>}
            <div className="absolute left-1.5 top-1.5 flex gap-1">
              {i > 0 && (
                <button type="button" title="کاور شود" onClick={() => onChange([src, ...images.filter((x) => x !== src)])} className="grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-ink shadow">
                  <Icon name="image" size={16} />
                </button>
              )}
              <button type="button" title="حذف" onClick={() => onChange(images.filter((x) => x !== src))} className="grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-alarm shadow">
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-line text-ink-mute transition hover:border-plate hover:text-plate"
        >
          <span className="flex flex-col items-center gap-1 text-sm font-semibold">
            <Icon name={busy ? 'clock' : 'plus'} size={24} />
            {busy ? 'در حال آپلود' : 'افزودن عکس'}
          </span>
        </button>
      </div>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      {err && <p className="mt-2 text-sm text-alarm">{err}</p>}
    </div>
  );
}
