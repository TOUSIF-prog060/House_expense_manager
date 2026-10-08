const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if present
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch (e) {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🚀 STARTING BACKEND & UPLOADS API TEST RUNNER');
  console.log('====================================================\n');

  // Step 1: Authentication & Session setup
  console.log('👉 [1/6] Authenticating test session...');
  const adminClient = createClient(SUPABASE_URL, SECRET_KEY);
  const pubClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY);

  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'tousifshiekh1033@gmail.com',
  });
  if (linkErr) throw new Error('Generate link failed: ' + linkErr.message);

  const { data: sessionData, error: sessionErr } = await pubClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  if (sessionErr) throw new Error('Verify OTP failed: ' + sessionErr.message);

  const cookieJar = [];
  const serverHelper = createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieJar,
      setAll: (cookies) => cookieJar.push(...cookies),
    },
  });

  await serverHelper.auth.setSession({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  });

  const cookieHeader = cookieJar.map((c) => `${c.name}=${c.value}`).join('; ');
  console.log('✅ Authentication successful. Session active.\n');

  const headers = {
    cookie: cookieHeader,
  };

  const results = [];
  function record(name, pass, details) {
    results.push({ name, pass, details });
    console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: ${name}`);
    if (details) console.log(`   └─ ${details}`);
  }

  // Get Household ID
  const { data: members } = await adminClient
    .from('household_members')
    .select('household_id, user_id')
    .eq('user_id', sessionData.user.id)
    .single();

  const householdId = members.household_id;
  const userId = sessionData.user.id;
  console.log(`ℹ️ Household ID: ${householdId}, User ID: ${userId}\n`);

  // Step 2: Meal slots
  console.log('👉 [2/6] Testing Household & Meal Slots API...');
  try {
    const slotName = 'Midnight Snack ' + Math.floor(Math.random() * 1000);
    const res = await fetch(`${BASE_URL}/api/backend/households/${householdId}/meal-slots`, {
      method: 'POST',
      credentials: 'include',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ name: slotName }),
    });
    const json = await res.json();
    record('POST /api/backend/households/[id]/meal-slots', res.status === 201, `Status: ${res.status}, Slot created: ${json.data?.name ?? 'N/A'}`);
    if (json.data?.id) {
      await adminClient.from('meal_slots').delete().eq('id', json.data.id);
    }
  } catch (err) {
    record('POST /api/backend/households/[id]/meal-slots', false, err.message);
  }

  // Step 3: Create Expense API
  console.log('\n👉 [3/6] Testing Expense Creation API...');
  let createdExpenseId = null;
  try {
    const payload = {
      householdId,
      title: 'Postman Integration Test Expense',
      amount: '250.00',
      category: '1200560e-aee4-4147-8f06-fb2f80ee2fee',
      expenseDate: new Date().toISOString().split('T')[0],
      paidBy: userId,
      participants: [{ userId, value: '250.00' }],
      splitMethod: 'equal',
      notes: 'Automated Postman test run',
    };

    const res = await fetch(`${BASE_URL}/api/backend/expenses`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (res.status === 201 && json.data?.id) {
      createdExpenseId = json.data.id;
      record('POST /api/backend/expenses (Create Expense)', true, `Created Expense ID: ${createdExpenseId}`);
    } else {
      record('POST /api/backend/expenses (Create Expense)', false, `Status ${res.status}: ${JSON.stringify(json)}`);
    }
  } catch (err) {
    record('POST /api/backend/expenses (Create Expense)', false, err.message);
  }

  // Step 4: Uploads Test (Receipts)
  console.log('\n👉 [4/6] Testing File Upload (Receipts API)...');
  let uploadedAttachmentId = null;
  if (createdExpenseId) {
    try {
      // Create a dummy PNG file buffer (1x1 pixel PNG)
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const postDataParts = [
        `--${boundary}\r\n`,
        `Content-Disposition: form-data; name="file"; filename="sample_receipt.png"\r\n`,
        `Content-Type: image/png\r\n\r\n`,
      ];
      const part1 = Buffer.from(postDataParts.join(''), 'utf8');
      const part2 = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
      const multipartBody = Buffer.concat([part1, pngBuffer, part2]);

      const uploadRes = await fetch(`${BASE_URL}/api/backend/expenses/${createdExpenseId}/receipt`, {
        method: 'POST',
        headers: {
          ...headers,
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      const uploadJson = await uploadRes.json();
      if (uploadRes.status === 201 && uploadJson.data?.id) {
        uploadedAttachmentId = uploadJson.data.id;
        record('POST /api/backend/expenses/[id]/receipt (File Upload)', true, `Attachment ID: ${uploadedAttachmentId}, Path: ${uploadJson.data.object_path}`);

        // Verify that file is in Supabase storage and create signed url
        const { data: signed, error: signErr } = await adminClient.storage
          .from('receipts')
          .createSignedUrl(uploadJson.data.object_path, 60);

        if (signed?.signedUrl && !signErr) {
          const downloadRes = await fetch(signed.signedUrl);
          const buf = await downloadRes.arrayBuffer();
          record('Verify Upload Storage Integrity & Download', buf.byteLength === pngBuffer.length, `Uploaded: ${pngBuffer.length} bytes, Downloaded: ${buf.byteLength} bytes`);
        } else {
          record('Verify Upload Storage Integrity & Download', false, signErr?.message ?? 'Failed to sign URL');
        }
      } else {
        record('POST /api/backend/expenses/[id]/receipt (File Upload)', false, `Status ${uploadRes.status}: ${JSON.stringify(uploadJson)}`);
      }
    } catch (err) {
      record('POST /api/backend/expenses/[id]/receipt (File Upload)', false, err.message);
    }
  } else {
    record('POST /api/backend/expenses/[id]/receipt (File Upload)', false, 'Skipped due to expense creation failure');
  }

  // Step 5: Cat Care API
  console.log('\n👉 [5/6] Testing Cat Care API...');
  try {
    const res = await fetch(`${BASE_URL}/api/backend/cat/extra`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        householdId,
        note: 'Postman test treat',
      }),
    });
    const json = await res.json();
    record('POST /api/backend/cat/extra (Record Extra Feeding)', res.status === 201, `Status: ${res.status}, Feeding ID: ${json.data?.id ?? 'N/A'}`);
    if (json.data?.id) {
      await adminClient.from('cat_feedings').delete().eq('id', json.data.id);
    }
  } catch (err) {
    record('POST /api/backend/cat/extra (Record Extra Feeding)', false, err.message);
  }

  // Step 6: Expense Update & Clean Up
  console.log('\n👉 [6/6] Testing Expense Update & Clean Up...');
  if (createdExpenseId) {
    try {
      const updateRes = await fetch(`${BASE_URL}/api/backend/expenses/${createdExpenseId}`, {
        method: 'PUT',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({
          title: 'Postman Integration Test Expense (Updated)',
          amount: '260.00',
          expenseDate: new Date().toISOString().split('T')[0],
          notes: 'Updated by test runner',
          shares: [{ user_id: userId, share_amount: '260.00' }],
        }),
      });
      const updateJson = await updateRes.json();
      record('PUT /api/backend/expenses/[id] (Update Expense)', updateRes.status === 200, `Status: ${updateRes.status}`);

      // Clean up test expense & attachment
      if (uploadedAttachmentId) {
        const { data: att } = await adminClient.from('expense_attachments').select('object_path').eq('id', uploadedAttachmentId).single();
        if (att?.object_path) {
          await adminClient.storage.from('receipts').remove([att.object_path]);
        }
        await adminClient.from('expense_attachments').delete().eq('id', uploadedAttachmentId);
      }
      await adminClient.from('expense_shares').delete().eq('expense_id', createdExpenseId);
      await adminClient.from('activity_events').delete().eq('entity_id', createdExpenseId);
      await adminClient.from('expenses').delete().eq('id', createdExpenseId);
      console.log('🧹 Cleaned up temporary test expense, shares, and uploaded receipt.');
    } catch (err) {
      record('PUT /api/backend/expenses/[id] (Update Expense)', false, err.message);
    }
  }

  console.log('\n====================================================');
  console.log('📊 TEST SUMMARY');
  console.log('====================================================');
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log(`Total Tests : ${total}`);
  console.log(`Passed      : ${passed}`);
  console.log(`Failed      : ${total - passed}`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%\n`);
}

runTestSuite().catch(console.error);
