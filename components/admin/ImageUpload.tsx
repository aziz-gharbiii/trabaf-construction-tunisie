'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { Remote, remoteEnabled } from '@/lib/remote';

/** Réduit une photo trop grande avant l'envoi (max 2400 px, WebP) → site plus rapide, stockage économisé. */
async function compress(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 400 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const max = 2400;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}

/** Bouton d'envoi d'image(s) vers Supabase Storage. Renvoie les URLs publiques. */
export function ImageUpload({
  onUploaded,
  multiple = false,
  label = 'Envoyer une photo'
}: {
  onUploaded: (urls: string[]) => void;
  multiple?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!remoteEnabled) {
    return <p className="text-[11px] text-amber-300">Envoi de photos disponible une fois Supabase configuré.</p>;
  }

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await Remote.uploadImage(await compress(f)));
      onUploaded(urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple={multiple} onChange={onChange} className="hidden" />
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="inline-flex items-center gap-2 rounded-lg border border-[#F5B800]/50 bg-[#0E2E5C] px-3 py-2 text-xs font-bold text-white hover:bg-[#18437E] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 text-[#F5B800]" />}
        {busy ? 'Envoi…' : label}
      </button>
      {error && <p className="mt-1 text-[11px] text-rose-400">{error}</p>}
    </div>
  );
}
