const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://srjfkjxnpyslfwseybic.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_3onYD9e-Z1Ra3HtxfAOzXw_3V07_kCE';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = {
  supabase,
  createClient: () => createClient(supabaseUrl, supabaseKey)
};

