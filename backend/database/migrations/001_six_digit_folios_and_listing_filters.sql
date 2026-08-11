begin;

create table if not exists vehicle_folio_sequence (
  id integer generated always as identity primary key,
  created_at timestamptz not null default now(),
  check (id between 1 and 999999)
);

alter table vehicles drop constraint if exists vehicles_folio_check;
alter table vehicles alter column folio type char(6) using lpad(trim(folio), 6, '0');
alter table vehicles add constraint vehicles_folio_check check (folio ~ '^[0-9]{6}$');

alter table vehicles drop constraint if exists vehicles_model_year_check;
alter table vehicles add constraint vehicles_model_year_check check (model_year between 1000 and 9999);

alter table vehicles alter column serial_number type varchar(17) using left(serial_number, 17);

do $$
declare
  max_folio integer;
begin
  select coalesce(max(trim(folio)::integer), 0) into max_folio from vehicles;

  perform setval(
    pg_get_serial_sequence('vehicle_folio_sequence', 'id'),
    greatest(max_folio, 1),
    max_folio > 0
  );
end $$;

commit;
