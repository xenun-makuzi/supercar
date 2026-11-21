-- Run after schema.sql and 002. Stores cart order data on requests (safe to re-run).
alter table requests
  add column if not exists items jsonb,
  add column if not exists total numeric(12,2),
  add column if not exists payment_method text;
