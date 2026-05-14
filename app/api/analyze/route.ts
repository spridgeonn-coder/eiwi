import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Analyze API called");

    const { repoFullName, mode = 'normal' } = await request.json();
    console.log("Repo:", repoFullName, "Mode:", mode);

    // Basic response to test if API works
    return NextResponse.json({
      success: true,
      repo: repoFullName,
      analysis: `✅ API is working!\n\nThis is a test response for ${repoFullName}.\n\nIf you see this, the route is not crashing.\n\nTry again with full version after we confirm this works.`,
      mode,
    });

  } catch (error: any) {
    console.error("❌ Analyze API Error:", error);
    return NextResponse.json({ 
      error: "Server error: " + error.message 
    }, { status: 500 });
  }
}