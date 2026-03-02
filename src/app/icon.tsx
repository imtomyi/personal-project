import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  const lionBuffer = await readFile(join(process.cwd(), "public", "lion-logo.png"));
  const lionBase64 = `data:image/png;base64,${lionBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lionBase64} alt="" width={64} height={64} style={{ objectFit: "contain" }} />
      </div>
    ),
    { ...size },
  );
}
