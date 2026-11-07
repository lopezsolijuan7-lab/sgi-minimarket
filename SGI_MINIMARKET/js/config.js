
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mevhfubeuniterkifcsa.supabase.co";

const SUPABASE_KEY = "sb_publishable_sLveFZwGceRA-zX8gliYbw_gDflxZCM";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
