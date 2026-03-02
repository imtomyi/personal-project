import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export async function GET() {
  // 사자 로고 이미지를 base64로 읽기
  const lionBuffer = await readFile(join(process.cwd(), "public", "lion-logo.png"));
  const lionBase64 = `data:image/png;base64,${lionBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f9fafb 0%, #e8e5f5 50%, #f0eeff 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          {/* 사자 + KHUDO 로고 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lionBase64}
              alt=""
              width={80}
              height={80}
              style={{ objectFit: "contain" }}
            />
            <div style={{ display: "flex", fontSize: "72px", fontWeight: 800, letterSpacing: "-0.03em" }}>
              <span style={{ color: "#C41230" }}>KHU</span>
              <span style={{ color: "#5856D6" }}>DO</span>
            </div>
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 500,
              color: "#6b7280",
              letterSpacing: "-0.01em",
            }}
          >
            시간표 · 루틴 · 가계부를 한 곳에서
          </div>
          <div
            style={{
              marginTop: "24px",
              display: "flex",
              gap: "12px",
            }}
          >
            {["📋 협업 투두", "📅 스마트 시간표", "✅ 루틴 트래커", "💰 가계부"].map(
              (label) => (
                <div
                  key={label}
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "10px 20px",
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "#374151",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}
                >
                  {label}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
