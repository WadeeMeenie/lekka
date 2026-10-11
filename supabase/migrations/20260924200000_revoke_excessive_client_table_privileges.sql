do $block$
declare r record;
begin
  for r in
    select format('%I.%I', n.nspname, c.relname) as fqtn
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname <> 'spatial_ref_sys'
  loop
    execute 'revoke truncate, references, trigger on table ' || r.fqtn || ' from anon, authenticated';
  end loop;
end;
$block$;
