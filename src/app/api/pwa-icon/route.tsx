import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sizeParam = parseInt(searchParams.get("size") || "192", 10);
  const maskable = searchParams.get("maskable") === "true";

  const lionBuffer = await readFile(join(process.cwd(), "public", "lion-logo.png"));
  const lionBase64 = `data:image/png;base64,${lionBuffer.toString("base64")}`;

  const iconSize = maskable ? sizeParam * 0.6 : sizeParam * 0.75;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          borderRadius: maskable ? "0" : `${sizeParam * 0.2}px`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lionBase64} alt="" width={iconSize} height={iconSize} style={{ objectFit: "contain" }} />
      </div>
    ),
    { width: sizeParam, height: sizeParam },
  );
}
