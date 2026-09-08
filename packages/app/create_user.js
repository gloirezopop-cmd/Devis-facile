import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nrzreoumwmnhvzglffjt.supabase.co';
const supabaseKey = 'sb_publishable_L9lKMYjTQ9AkjomHMy2fdA_FdeWFlND';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createAccount() {
  const { data, error } = await supabase.auth.signUp({
    email: 'raphaelzopop1@gmail.com',
    password: 'password123',
  });
  console.log('Result:', { data, error });
}

createAccount();
