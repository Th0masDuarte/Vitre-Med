alter table public.profiles add column if not exists sobrenome text not null default '';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, sobrenome, telefone, cep)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1)),
    coalesce(new.raw_user_meta_data ->> 'sobrenome', ''),
    coalesce(new.raw_user_meta_data ->> 'telefone', ''),
    coalesce(new.raw_user_meta_data ->> 'cep', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated, public;