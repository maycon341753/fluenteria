import { supabase } from "@/lib/supabaseClient";

type ModuleKey = "crianca" | "adolescente" | "adulto";

const getDashboardPathForModule = (module: ModuleKey) => {
  if (module === "crianca") return "/dashboard/crianca";
  if (module === "adolescente") return "/dashboard/adolescente";
  return "/dashboard/adulto";
};

export const resolvePostLoginRedirect = async (userId: string) => {
  if (!supabase) return "/";

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();

  if (roleData) return "/admin";

  const { data: moduleData } = await supabase
    .from("user_learning_path")
    .select("module")
    .eq("user_id", userId)
    .maybeSingle();

  const module = moduleData?.module as ModuleKey | undefined;
  if (module) return getDashboardPathForModule(module);

  return "/modulos";
};

