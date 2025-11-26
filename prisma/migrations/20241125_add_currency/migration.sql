-- Add currency field to users table
ALTER TABLE "users" ADD COLUMN "currency" VARCHAR(3) DEFAULT 'BRL';
