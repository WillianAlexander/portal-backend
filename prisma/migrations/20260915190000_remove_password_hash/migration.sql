-- Autenticación exclusivamente vía Azure AD.
-- El campo password_hash ya no tiene uso: POST /auth/login y el endpoint
-- de bootstrap set-password fueron eliminados en esta misma fase.
ALTER TABLE "tusuario" DROP COLUMN "password_hash";
