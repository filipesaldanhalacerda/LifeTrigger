using BCrypt.Net;

var tenantAlphaId = "A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A1A1";
var tenantBetaId  = "B2B2B2B2-B2B2-B2B2-B2B2-B2B2B2B2B2B2";

var h1 = BCrypt.Net.BCrypt.HashPassword("Super@123!");
var h2 = BCrypt.Net.BCrypt.HashPassword("Alpha@123!");
var h3 = BCrypt.Net.BCrypt.HashPassword("Alpha@123!");
var h4 = BCrypt.Net.BCrypt.HashPassword("Beta@123!");
var h5 = BCrypt.Net.BCrypt.HashPassword("Beta@123!");

var now = "2026-02-26 12:00:00.000000+00";

Console.WriteLine($@"-- LifeTrigger Auth API — Demo Seed Data

INSERT INTO tenants (""Id"", ""Name"", ""Slug"", ""IsActive"", ""CreatedAt"") VALUES
  ('{tenantAlphaId}', 'DEMO_CORRETORA_ALPHA', 'demo-alpha', true, '{now}'),
  ('{tenantBetaId}',  'DEMO_EMPRESA_BETA',    'demo-beta',  true, '{now}')
ON CONFLICT DO NOTHING;

INSERT INTO users (""Id"", ""Email"", ""PasswordHash"", ""Role"", ""TenantId"", ""IsActive"", ""CreatedAt"") VALUES
  ('11111111-1111-1111-1111-111111111111', 'superadmin@lifetrigger.io', '{h1}', 'SuperAdmin',  NULL,             true, '{now}'),
  ('22222222-2222-2222-2222-222222222222', 'admin@alpha.demo',          '{h2}', 'TenantAdmin', '{tenantAlphaId}', true, '{now}'),
  ('33333333-3333-3333-3333-333333333333', 'partner@alpha.demo',        '{h3}', 'Partner',     '{tenantAlphaId}', true, '{now}'),
  ('44444444-4444-4444-4444-444444444444', 'admin@beta.demo',           '{h4}', 'TenantAdmin', '{tenantBetaId}',  true, '{now}'),
  ('55555555-5555-5555-5555-555555555555', 'partner@beta.demo',         '{h5}', 'Partner',     '{tenantBetaId}',  true, '{now}')
ON CONFLICT DO NOTHING;");
