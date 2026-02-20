import { NextResponse } from "next/server";

// Canvas LMS (LearningX) API 프록시
// 경희대 Canvas: https://khcanvas.khu.ac.kr
const CANVAS_BASE = "https://khcanvas.khu.ac.kr/api/v1";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const endpoint = searchParams.get("endpoint"); // courses, assignments 등

  if (!token) {
    return NextResponse.json(
      { error: "Canvas API 토큰이 필요합니다." },
      { status: 400 },
    );
  }

  if (!endpoint) {
    return NextResponse.json(
      { error: "endpoint 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    // 허용된 엔드포인트만 허용 (보안)
    const allowedPrefixes = ["courses", "users/self"];
    const isAllowed = allowedPrefixes.some((prefix) =>
      endpoint.startsWith(prefix),
    );
    if (!isAllowed) {
      return NextResponse.json(
        { error: "허용되지 않은 엔드포인트입니다." },
        { status: 403 },
      );
    }

    const url = `${CANVAS_BASE}/${endpoint}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: "토큰이 유효하지 않습니다. 다시 확인해주세요." },
          { status: 401 },
        );
      }
      throw new Error(`Canvas API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Canvas API error:", error);
    return NextResponse.json(
      { error: "Canvas API 요청에 실패했습니다." },
      { status: 500 },
    );
  }
}
