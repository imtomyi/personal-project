import type { NextConfig } from "next";

// 서버사이드 타임존을 KST로 설정
process.env.TZ = "Asia/Seoul";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
