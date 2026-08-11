-- Usuario demo:
-- email: admin@example.com
-- password: Admin12345
--
-- En produccion cambia esta contrasena.

insert into users (name, email, password_hash, role)
values (
  'Administrador',
  'admin@example.com',
  crypt('Admin12345', gen_salt('bf')),
  'admin'
)
on conflict (email) do nothing;
