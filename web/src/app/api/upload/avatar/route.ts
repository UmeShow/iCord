import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as unknown as { id?: string })?.id;

  if (!userId) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        detail: "No active session. Please sign in again and retry.",
      },
      { status: 401 }
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error: "Server misconfigured",
        detail: "BLOB_READ_WRITE_TOKEN is missing.",
        hint: "On Vercel: Storage → Blob → Create/Connect, then set BLOB_READ_WRITE_TOKEN in Project Environment Variables and redeploy.",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Vercel Serverless Functions have request body limits; keep it conservative.
    // Discord avatars max is 8MB, but uploading via our API should be smaller to avoid 413.
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 4MB)" }, { status: 400 });
    }

    const safeName = sanitizeFilename(file.name || "avatar.png");
    const pathname = `avatars/${userId}/${Date.now()}-${safeName}`;

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Avatar upload failed:", message);
    return NextResponse.json(
      {
        error: "Upload failed",
        detail: message,
        hint: "If deploying to Vercel Blob, ensure BLOB_READ_WRITE_TOKEN is set in environment variables.",
      },
      { status: 500 }
    );
  }
}
