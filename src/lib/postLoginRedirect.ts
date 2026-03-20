import { supabase } from "@/lib/supabaseClient";

type ModuleKey = "crianca" | "adolescente" | "adulto";

const getDashboardPathForModule = (module: ModuleKey) => {
  if (module === "crianca") return "/dashboard/crianca";
  if (module === "adolescente") return "/dashboard/adolescente";
  return "/dashboard/adulto";
};

export const resolvePostLoginRedirect = async (userId: string) => {
  if (!supabase) return "/";

  const [roleResult, moduleResult] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "super_admin").maybeSingle(),
    supabase.from("user_learning_path").select("module").eq("user_id", userId).maybeSingle(),
  ]);

  if (roleResult.data) return "/admin";

  const module = moduleResult.data?.module as ModuleKey | undefined;
  if (module) return getDashboardPathForModule(module);

  return "/modulos";
};
