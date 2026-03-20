import { supabase } from "@/lib/supabaseClient";

export const resolvePostLoginRedirect = async (userId: string) => {
  if (!supabase) return "/";

  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "super_admin").maybeSingle();
  if (roleData) return "/admin";
  return "/modulos";
};
