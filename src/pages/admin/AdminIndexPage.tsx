import RequireSuperAdmin from "@/components/admin/RequireSuperAdmin";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AdminIndexPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/admin/clientes", { replace: true });
  }, [navigate]);

  return null;
};

const AdminIndexPageProtected = () => (
  <RequireSuperAdmin>
    <AdminIndexPage />
  </RequireSuperAdmin>
);

export default AdminIndexPageProtected;
