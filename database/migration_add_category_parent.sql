-- Migration: Add parent_id column to categories table
-- Run this in XAMPP phpMyAdmin or MySQL CLI

USE auction_db;

-- Add parent_id column if it doesn't exist
ALTER TABLE categories 
    ADD COLUMN IF NOT EXISTS parent_id INT DEFAULT NULL,
    ADD FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;
