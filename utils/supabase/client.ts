import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info.tsx';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);
