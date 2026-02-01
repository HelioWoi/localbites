// Script to add is_featured column to menu_items table
// Run this once to update your Supabase database

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://quybuvapflnzcaedjbkl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjE3MzIsImV4cCI6MjA4NTIzNzczMn0.irgBRg6jSADNCNxsbcFE3zOaAEWrXSfTJmER5rUBjxA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addIsFeaturedColumn() {
  console.log('Adding is_featured column to menu_items table...');
  
  // This SQL will be executed via Supabase RPC or you need to run it manually in SQL Editor
  const sql = `
    ALTER TABLE menu_items 
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
    
    CREATE INDEX IF NOT EXISTS idx_menu_items_is_featured 
    ON menu_items(partner_id, is_featured) 
    WHERE is_featured = TRUE;
  `;
  
  console.log('\n⚠️  IMPORTANT: You need to run this SQL in your Supabase SQL Editor:\n');
  console.log(sql);
  console.log('\nSteps:');
  console.log('1. Go to https://supabase.com/dashboard/project/quybuvapflnzcaedjbkl/sql');
  console.log('2. Paste the SQL above');
  console.log('3. Click "Run"');
  console.log('\nAfter running the SQL, the feature will work correctly!');
}

addIsFeaturedColumn();
