// One-off admin script: upgrade test user to Pro so AI meal-plan generation
// is unblocked (the paywall blocks generation once the free monthly quota is
// exhausted). Uses the SERVICE ROLE key — admin only, never ship to client.
// Idempotent: safe to re-run.
/* eslint-disable no-console */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_USER_ID = '4cc39bd9-0632-49d7-91e9-035245e10195';
const PRO_PLAN_ID = process.env.RAZORPAY_PLAN_ID_PRO_MONTHLY; // plan_SItKQah1PkXP2R
// current_period_end = ~1 year out (Unix seconds)
const PERIOD_END = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

(async () => {
  // 1. Show current profile + subscription
  const { data: profileBefore } = await supabase
    .from('profiles')
    .select('id, email, full_name, plan')
    .eq('id', TEST_USER_ID)
    .single();
  console.log('Profile before:', JSON.stringify(profileBefore));

  const { data: subsBefore } = await supabase
    .from('subscriptions')
    .select('razorpay_subscription_id, tier, status, razorpay_plan_id, current_period_end')
    .eq('user_id', TEST_USER_ID);
  console.log('Subscriptions before:', JSON.stringify(subsBefore));

  // 2. Upsert an active PRO subscription. The subscriptionGate middleware
  //    grants access when a row exists with status in
  //    ['active','authenticated','pending'] and tier='pro' resolves to the
  //    pro plan row (unlimited_ai=true).
  const SUB_ID = `sub_test_admin_pro_${TEST_USER_ID.slice(0, 8)}`;
  const { data: upserted, error: upsertErr } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: TEST_USER_ID,
        razorpay_subscription_id: SUB_ID,
        razorpay_plan_id: PRO_PLAN_ID,
        tier: 'pro',
        status: 'active',
        current_period_end: PERIOD_END,
        // columns below may or may not exist depending on migration state;
        // supabase-js ignores unknown columns only if not in schema — guard by
        // only sending the core columns confirmed in the migration.
      },
      { onConflict: 'razorpay_subscription_id' },
    )
    .select();
  if (upsertErr) {
    console.error('Subscription upsert FAILED:', JSON.stringify(upsertErr));
    process.exit(1);
  }
  console.log('Subscription upserted:', JSON.stringify(upserted));

  // 3. Set profiles.plan = 'pro' if the column exists (best-effort).
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ plan: 'pro' })
    .eq('id', TEST_USER_ID);
  if (profileErr) {
    console.warn('profiles.plan update skipped (column may not exist):', JSON.stringify(profileErr));
  } else {
    console.log('profiles.plan set to pro');
  }

  // 4. Verify
  const { data: profileAfter } = await supabase
    .from('profiles')
    .select('id, email, plan')
    .eq('id', TEST_USER_ID)
    .single();
  console.log('Profile after:', JSON.stringify(profileAfter));

  const { data: subsAfter } = await supabase
    .from('subscriptions')
    .select('razorpay_subscription_id, tier, status, razorpay_plan_id, current_period_end')
    .eq('user_id', TEST_USER_ID);
  console.log('Subscriptions after:', JSON.stringify(subsAfter));

  console.log('\nDONE — test user upgraded to Pro. Generation should be unlimited now.');
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
