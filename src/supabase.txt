import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ylxyvfoqvlvfybtfrrgj.supabase.co'
const supabaseKey = 'sb_publishable_EJmM2H3glbU0ttRap-pLVA_zCot_sm_'

export const supabase = createClient(supabaseUrl, supabaseKey)