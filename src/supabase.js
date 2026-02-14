import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ylxyvfoqvlvfybtfrrgj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlseHl2Zm9xdmx2ZnlidGZycmdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NTMxNTAsImV4cCI6MjA4NjUyOTE1MH0.cQ3bdyybPx4dhWwGWNnTsrxPsh0GKkt8iBBk0k5BsL0'

export const supabase = createClient(supabaseUrl, supabaseKey)