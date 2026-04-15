-- Add PENDING to products.status for moderation workflow (createProduct uses PENDING before admin approval).
-- Run once against existing DBs created from an older schema.

USE auction_db;

ALTER TABLE products
  MODIFY COLUMN status ENUM(
    'DRAFT',
    'PENDING',
    'ACTIVE',
    'ENDED_WAITING_PAYMENT',
    'COMPLETED',
    'UNSOLD',
    'CANCELLED'
  ) DEFAULT 'DRAFT';
