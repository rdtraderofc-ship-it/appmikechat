const { createClient } = require('@supabase/supabase-js');

// Use SERVICE_ROLE_KEY for backend operations to bypass RLS and ensure security
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ CRITICAL: Supabase Backend Credentials Missing!");
  console.error("Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Netlify Environment Variables.");
}

// Initialize only if keys are present to avoid immediate crash
const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabase) {
  console.warn("⚠️ Supabase client not initialized due to missing keys.");
}

module.exports = supabase;
