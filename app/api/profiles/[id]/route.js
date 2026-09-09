import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

// PUT /api/profiles/:id — update a profile
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, settings } = body;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ name, settings })
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// DELETE /api/profiles/:id — delete a profile
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", params.id)
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
