#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(filePath) {
  console.log(`Running migration: ${path.basename(filePath)}`);

  const sql = fs.readFileSync(filePath, 'utf8');

  try {
    // Execute the entire SQL file as one query
    const { error } = await supabase.from('_').select('*').limit(0);
    
    // Use the REST API to execute SQL directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      // If exec doesn't exist, try direct SQL execution via PostgREST
      const directResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sql',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Accept': 'application/json'
        },
        body: sql
      });

      if (!directResponse.ok) {
        console.error(`HTTP Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Response:', errorText);
        return false;
      }
    }

    console.log(`✓ ${path.basename(filePath)} completed`);
    return true;
  } catch (error) {
    console.error(`Error executing migration:`, error);
    return false;
  }
}

async function setupDatabase() {
  console.log('Setting up Pharmo database...\n');
  
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  for (const file of migrationFiles) {
    const success = await runMigration(path.join(migrationsDir, file));
    if (!success) {
      console.error('\nDatabase setup failed!');
      process.exit(1);
    }
  }
  
  console.log('\n✅ Database setup completed successfully!');
  console.log('\nYou can now:');
  console.log('1. Start the dev server: cd apps/web && npm run dev');
  console.log('2. Visit http://localhost:3000/dashboard');
  console.log('3. Check /suppliers to see the sample data');
}

setupDatabase().catch(console.error);
