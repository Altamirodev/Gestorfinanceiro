import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

// Usuário logado + espaço atual. Hoje: o primeiro espaço do usuário (o pessoal).
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  const ws = membership?.workspaces as unknown as { id: string; name: string } | null;
  if (!membership || !ws) throw new Error("Nenhum espaço encontrado para este usuário.");

  return {
    supabase,
    user: auth.user,
    workspace: { id: ws.id, name: ws.name, role: membership.role as Role },
  };
});

export function canEdit(role: Role) {
  return role === "owner" || role === "editor";
}
