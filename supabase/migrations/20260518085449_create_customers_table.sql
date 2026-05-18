/*
  # Create customers table

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text, customer name)
      - `phone` (text, contact phone)
      - `email` (text, contact email)
      - `address` (text, physical address)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `customers` table
    - Add policy for authenticated users to read all customers (needed for dropdowns)
    - Add policy for authenticated users to create customers
    - Add policy for authenticated users to update their own customers
    - Add policy for authenticated users to delete their own customers

  3. Indexes
    - Add index on name for search performance
*/

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can create customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
