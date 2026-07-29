/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Trace the bundled Pretendard OTF into the serverless functions that
  // rasterize SVG text via Sharp/librsvg, so fontconfig can find Korean glyphs
  // at runtime (otherwise Korean renders as tofu on Vercel Linux). Keyed by the
  // app-router route paths that composite text overlays.
  //
  // 2026-07-30 — tesseract.js worker-script fix (검수게이트 무한로딩 원인,
  // docs/handoff/CURRENT.md 2026-07-30(2)). p-filter-watermark.ts의 getWorker()
  // 가 new Worker(workerPath)를 **런타임에 조립한 경로 문자열**로 호출한다
  // (tesseract.js worker/node/defaultOptions.js: path.join(__dirname,'..','..',
  // 'worker-script','node','index.js')) — Next의 파일 트레이서는 정적
  // require/import만 따라가므로 이 경로를 못 보고 서버리스 번들에서
  // worker-script 디렉터리를 통째로 빠뜨린다. 그 결과 프로덕션에서 매 호출마다
  // `Cannot find module '.../worker-script/node/index.js'`로 워커가 죽고,
  // p-filter-watermark.ts의 안전장치(WORKER_INIT_TIMEOUT_MS=8000, fail-open)가
  // 매번 8초를 꽉 채운 뒤에야 응답 — "발행 전 검수" 화면이 매번 8~9초 이상
  // 걸리는 근본원인. OCR을 쓰는(ocrFullFrame/image-gate-warnings 경유) 전
  // 라우트에 워커 스크립트 자체를 명시 포함해 크래시-후-fail-open이 아니라
  // 워커가 실제로 뜨게 한다(정상 시 수백ms, Sprint 8-PF 주석 근거).
  //
  // 2026-07-30 (추가수정) — outputFileTracingIncludes만으로는 부족했다(prod
  // 재실측: 배포 후에도 동일 크래시). 진짜 원인은 webpack이 tesseract.js를
  // 서버 번들에 **인라인**하면서 defaultOptions.js의 `__dirname`을 번들 청크의
  // 위치로 치환해버리는 것 — path.join(__dirname,'..','..','worker-script',...)
  // 결과가 실제 node_modules 경로가 아니라 `.next/worker-script/...`라는
  // 존재한 적 없는 경로가 된다(트레이싱 문제가 아니라 __dirname 치환 문제).
  // serverComponentsExternalPackages로 tesseract.js를 번들링 대상에서 빼면
  // 런타임에 진짜 require()로 로드돼 __dirname이 실제 node_modules 위치를
  // 가리킨다 — outputFileTracingIncludes(파일 존재 보장)와 함께 있어야 완결.
  experimental: {
    serverComponentsExternalPackages: ['tesseract.js'],
    outputFileTracingIncludes: {
      '/api/thumbnail/[sku]': ['./fonts/**/*'],
      '/api/products/[id]/generate-detail': ['./fonts/**/*'],
      '/api/products/[id]/publish-preview': ['./node_modules/tesseract.js/src/worker-script/**/*'],
      '/api/products/[id]/review-approve': ['./node_modules/tesseract.js/src/worker-script/**/*'],
      '/api/products/[id]/apply-composite': ['./node_modules/tesseract.js/src/worker-script/**/*'],
      '/api/products/[id]/finish-image': ['./node_modules/tesseract.js/src/worker-script/**/*'],
      '/api/products/[id]/seo-guard': ['./node_modules/tesseract.js/src/worker-script/**/*'],
      '/api/products/[id]/white-bg': ['./node_modules/tesseract.js/src/worker-script/**/*'],
      '/api/products/[id]/apply-cutout': ['./node_modules/tesseract.js/src/worker-script/**/*'],
      '/api/products/[id]/thumb-crop': ['./node_modules/tesseract.js/src/worker-script/**/*'],
      '/api/products/[id]/main-image-policy': ['./node_modules/tesseract.js/src/worker-script/**/*'],
      '/api/naver/products/register': ['./node_modules/tesseract.js/src/worker-script/**/*'],
      '/api/naver/products': ['./node_modules/tesseract.js/src/worker-script/**/*'],
      '/api/naver/register': ['./node_modules/tesseract.js/src/worker-script/**/*'],
      '/api/products/batch-register': ['./node_modules/tesseract.js/src/worker-script/**/*'],
    },
  },

  images: {
    unoptimized: true,
    domains: ['localhost', 'kkotium.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },

  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: '/.well-known/:path*', destination: '/404' },
      ],
      fallback: [],
    };
  },

  async redirects() {
    return [
      // Sprint 8-IA Phase 1: /automation demoted to /admin/automation (admin only).
      // Per #46 (false-label ban) — registry shows real-cron only.
      { source: '/automation', destination: '/admin/automation', permanent: true },
    ];
  },
};

module.exports = nextConfig;
