-- Execute uma vez no SQL Editor do projeto AZA.
-- As tabelas existentes continuam sendo usadas para preservar galerias, ordem e políticas RLS.

alter table public.properties_images
  add column if not exists media_type text not null default 'image';

alter table public.works_images
  add column if not exists media_type text not null default 'image';

update public.properties_images
set media_type = 'video'
where lower(image_url) ~ '\.(mp4|webm|mov|m4v)$';

update public.works_images
set media_type = 'video'
where lower(image_url) ~ '\.(mp4|webm|mov|m4v)$';

update public.properties_images
set is_cover = false
where media_type = 'video'
  and is_cover = true;

update public.works_images
set is_cover = false
where media_type = 'video'
  and is_cover = true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'properties_images_media_type_check'
      and conrelid = 'public.properties_images'::regclass
  ) then
    alter table public.properties_images
      add constraint properties_images_media_type_check
      check (media_type in ('image', 'video'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'works_images_media_type_check'
      and conrelid = 'public.works_images'::regclass
  ) then
    alter table public.works_images
      add constraint works_images_media_type_check
      check (media_type in ('image', 'video'));
  end if;
end $$;

-- Se o bucket restringe MIME types, habilita os formatos de vídeo mais comuns.
update storage.buckets
set allowed_mime_types = (
  select array_agg(distinct mime_type)
  from unnest(allowed_mime_types || array[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v'
  ]) as allowed(mime_type)
)
where id = 'aza-media'
  and allowed_mime_types is not null;

comment on column public.properties_images.media_type is 'Tipo do arquivo da galeria: image ou video.';
comment on column public.works_images.media_type is 'Tipo do arquivo da galeria: image ou video.';
