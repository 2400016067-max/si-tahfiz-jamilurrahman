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

async function testSetoranType() {
  console.log('Testing setoran insert with tipe = "murajaah"...');
  const { data, error } = await supabase.from('setoran').insert({
    santri_id: '30000000-0000-0000-0000-000000000001',
    tanggal: '2026-06-07',
    tipe: 'murajaah',
    surah: 'Al-Baqarah',
    halaman_mulai: 1,
    halaman_selesai: 2,
    jumlah_baris: 15,
    jumlah_kesalahan: 1,
    status: 'lulus'
  }).select('*');

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert success! Result:', data);
    
    // Cleanup
    if (data && data.length > 0) {
      console.log('Cleaning up...');
      const { error: dErr } = await supabase.from('setoran').delete().eq('id', data[0].id);
      if (dErr) console.error('Cleanup error:', dErr);
      else console.log('Cleanup success.');
    }
  }
}

testSetoranType();
