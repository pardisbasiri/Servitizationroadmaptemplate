import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info.tsx';

const supabaseUrl = `https://${projectId}.supabase.co`;

console.log('🔧 =============================================');
console.log('🔧 Initializing Supabase Client');
console.log('🔧 =============================================');
console.log('🔧 Project ID:', projectId);
console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Has Anon Key:', !!publicAnonKey);
console.log('🔧 Anon Key (first 20):', publicAnonKey.substring(0, 20) + '...');
console.log('🔧 Realtime enabled: true');
console.log('🔧 =============================================');

export const supabase = createClient(supabaseUrl, publicAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

console.log('✅ Supabase client created');
console.log('✅ Realtime available:', !!supabase.realtime);
console.log('✅ Channel method available:', typeof supabase.channel === 'function');
console.log('✅ =============================================');
