import { DashboardView } from "@/components/dashboard-view";
import { getOverview } from "@/lib/queries";
import { canEdit, getSession } from "@/lib/session";

export default async function DashboardPage() {
  const [{ overview, categories }, { workspace }] = await Promise.all([getOverview(), getSession()]);
  return <DashboardView overview={overview} hasCategories={categories.length > 0} editable={canEdit(workspace.role)} />;
}
