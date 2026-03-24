import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bupkyppvtkrmzmluzjmf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1cGt5cHB2dGtybXptbHV6am1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzcwOTcsImV4cCI6MjA4OTcxMzA5N30.X2zOBhyzESM_fC-O8Tsy17UtW9UUaXsYfZCNN3UowXQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);