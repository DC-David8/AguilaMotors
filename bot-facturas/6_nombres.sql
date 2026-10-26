-- Aguila Motors · Solo el Jefe Aguila cambia nombres de empleados (por ejemplo, tras un CK)
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.

create or replace function public.proteger_nombres()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.name is distinct from old.name or new.surname is distinct from old.surname)
     and not coalesce((select public.es_jefe_aguila()), false) then
    raise exception 'Solo el Jefe Aguila puede cambiar el nombre de un empleado';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_nombres on public.employees;
create trigger proteger_nombres
  before update on public.employees
  for each row execute function public.proteger_nombres();
