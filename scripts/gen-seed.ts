// Génère le SQL des données de départ à partir de lib/mock-data.ts
import { initialCompanySettings, initialProjects, initialServices } from '../lib/mock-data';

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return `array[${v.map(q).join(', ')}]::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const out: string[] = [];
out.push(`insert into public.company_settings (id, data) values (1, ${q(JSON.stringify(initialCompanySettings))}::jsonb)\n  on conflict (id) do nothing;`);
for (const s of initialServices) {
  out.push(
    `insert into public.services (id, title, slug, description, icon_name, image_url, display_order, is_active) values (${[s.id, s.title, s.slug, s.description, s.icon_name, s.image_url ?? null, s.display_order, s.is_active].map(q).join(', ')})\n  on conflict (id) do nothing;`
  );
}
for (const p of initialProjects) {
  const cols = ['id','title','slug','short_desc','full_desc','category','client','location_name','city','country','lat','lng','year','duration','surface_area','status','main_image_url','gallery_urls','is_featured','is_published','display_order'] as const;
  out.push(`insert into public.projects (${cols.join(', ')}) values (${cols.map((c) => q((p as unknown as Record<string, unknown>)[c])).join(', ')})\n  on conflict (id) do nothing;`);
}
console.log(out.join('\n'));
