import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nrzreoumwmnhvzglffjt.supabase.co';
const supabaseKey = 'sb_publishable_L9lKMYjTQ9AkjomHMy2fdA_FdeWFlND';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'raphaelzopop1@gmail.com',
    password: 'password123',
  });
  console.log('Login Test Result:');
  console.log('Error:', error ? error.message : 'No error');
  console.log('Error status:', error ? error.status : 'N/A');
}

testLogin();
