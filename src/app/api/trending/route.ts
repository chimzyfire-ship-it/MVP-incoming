import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "discover";

  try {
    // Basic mapping: All categories fetch from the tools table in our DB for now.
    // In a full implementation, you'd filter by category tags.
    // The previous implementation hit the GitHub API directly.
    const { data: tools, error } = await supabase
      .from("tools")
      .select("*")
      .order("easy_to_run", { ascending: false })
      .order("stars", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const mapped = tools.map((tool) => ({
      id: tool.id, // usually an int or uuid
      title: tool.title || tool.full_name.split("/").pop(),
      fullName: tool.full_name,
      plainEnglishDescription: tool.description || "No description provided.",
      stars: tool.stars || 0,
      forks: tool.forks || 0,
      collaborators: 0,
      url: tool.url || `https://github.com/${tool.full_name}`,
      language: tool.language || "Unknown",
      owner: tool.full_name.split("/")[0] || "unknown",
      avatar: `https://github.com/${tool.full_name.split("/")[0]}.png`,
      coverImage: `https://opengraph.githubassets.com/1/${tool.full_name}`,
      topics: tool.topics || [],
      easyToRun: tool.easy_to_run,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error fetching trending:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending tools" },
      { status: 500 },
    );
  }
}
