const { createClient } = require('@supabase/supabase-js');

// Use SERVICE_ROLE_KEY for backend operations to bypass RLS and ensure security
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ CRITICAL: Supabase Backend Credentials Missing!");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
