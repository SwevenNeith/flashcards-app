import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://frdokmjekqfeqzbrlleq.supabase.co'       // ton Project URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZG9rbWpla3FmZXF6YnJsbGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTk4NzcsImV4cCI6MjA4ODc5NTg3N30.2fK_ml6I-E642_sNJzoAs07vFnbwtnuyNt8EE-YSgvk'                // ta clé publique

export const supabase = createClient(supabaseUrl, supabaseKey)