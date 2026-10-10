import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function EditorLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const supabase = await createClient();

	const { data } = await supabase.auth.getClaims();

	if (!data?.claims?.sub) {
		redirect("/login");
	}

	return children;
}