import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
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
          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              color: "#5856D6",
              letterSpacing: "-0.03em",
            }}
          >
            KHUDO
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
