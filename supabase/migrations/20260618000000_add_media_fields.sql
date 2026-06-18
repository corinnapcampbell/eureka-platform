alter table ideas add column if not exists product_image_url text;
alter table ideas add column if not exists support_files jsonb default '[]'::jsonb;
