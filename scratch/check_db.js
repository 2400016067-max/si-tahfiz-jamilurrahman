const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    env[m[1]] = m[2].replace(/(^['"]|['"]$)/g, '').trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function testWrite() {
  const testId = '99999999-9999-9999-9999-999999999999';
  
  console.log('Testing insert...');
  const { error: insError } = await supabase.from('tikrar').insert({
    id: testId,
    santri_id: '30000000-0000-0000-0000-000000000001',
    tanggal: '2026-06-07',
    surah: 'Test Surah',
    halaman: 1,
    jumlah_ulang: 10,
    selesai: false,
    lokasi: 'sekolah',
    parent_verified: false,
    status: 'wajib_sekolah'
  });

  if (insError) {
    console.error('Insert error:', insError);
  } else {
    console.log('Insert success.');
  }

  console.log('Testing update...');
  const { error: updError } = await supabase.from('tikrar').update({
    status: 'wajib_rumah'
  }).eq('id', testId);

  if (updError) {
    console.error('Update error:', updError);
  } else {
    console.log('Update query finished.');
  }

  console.log('Querying after update...');
  const { data: qData, error: qError } = await supabase.from('tikrar').select('*').eq('id', testId);
  if (qError) {
    console.error('Query error:', qError);
  } else {
    console.log('Query result:', qData);
  }

  console.log('Cleaning up...');
  const { error: delError } = await supabase.from('tikrar').delete().eq('id', testId);
  if (delError) {
    console.error('Delete error:', delError);
  } else {
    console.log('Cleanup success.');
  }
}

testWrite();
