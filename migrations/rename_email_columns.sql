-- Renomeia coluna email_bounced de snake_case para camelCase
ALTER TABLE users RENAME COLUMN email_bounced TO "emailBounced";
