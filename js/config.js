/**
 * Fan Tuan · Taiwanese Rice Roll (Miri) — App configuration
 *
 * Fill in your Supabase project credentials below.
 * 1. Create a project at https://supabase.com
 * 2. Run the SQL in supabase/migrations/0001_init.sql in the SQL editor
 * 3. Copy "Project URL" and the "anon public" API key from
 *    Project Settings → API and paste them here.
 *
 * The anon key is safe to expose in a static site: all access is guarded
 * by Row Level Security (RLS) policies defined in the migration.
 */
window.TRR_CONFIG = {
  SUPABASE_URL: 'https://mpooozwfvnsqyvfenzrt.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wb29vendmdm5zcXl2ZmVuenJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTA0NTcsImV4cCI6MjA5NjM4NjQ1N30.D1Rwqjk6hFC2Pz4b7NxPXhs-LA5ZPz55OzOKIOywY8s',

  // Shop defaults (can be overridden by the `settings` table in Supabase)
  SHOP_NAME: 'Taiwan Rice Roll 台湾紫米饭团',
  SHOP_TAGLINE: 'Authentic Taiwanese Purple Rice Rolls · Jalan Luak, Miri',
  CURRENCY: 'RM',
  WHATSAPP: '60123456789',     // shop WhatsApp for order notifications (no +)
  DELIVERY_FEE: 5.0,
  FREE_DELIVERY_OVER: 50.0,
};

/** True when real Supabase credentials have been provided. */
window.TRR_CONFIGURED =
  window.TRR_CONFIG.SUPABASE_URL &&
  !window.TRR_CONFIG.SUPABASE_URL.startsWith('YOUR_') &&
  window.TRR_CONFIG.SUPABASE_ANON_KEY &&
  !window.TRR_CONFIG.SUPABASE_ANON_KEY.startsWith('YOUR_');
