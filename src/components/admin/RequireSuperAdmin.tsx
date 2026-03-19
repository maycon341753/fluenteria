import { supabase } from "@/lib/supabaseClient";
import { PropsWithChildren, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const RequireSuperAdmin = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate();
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!supabase) {
        if (!mounted) return;
        navigate("/");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const userId = data.session?.user.id;
      if (!userId) {
        navigate("/");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "super_admin")
        .maybeSingle();

      if (!mounted) return;

      if (!roleData) {
        navigate("/");
        return;
      }

      setIsAllowed(true);
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (isAllowed === null) return null;
  return <>{children}</>;
};

export default RequireSuperAdmin;
