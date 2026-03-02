/**
 * Runtime Backend Switch
 * DATA_BACKEND=sheets (default) | supabase
 */
export const useSupabase = process.env.DATA_BACKEND === 'supabase';
