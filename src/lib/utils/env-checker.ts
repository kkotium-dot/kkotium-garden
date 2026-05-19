// 환경 변수 확인 유틸리티
// AI provider chain (Sprint 7-PC-D 2026-05-19):
//   Primary: Groq llama-3.3-70b-versatile (3 keys round-robin)
//   Last-resort: Anthropic Claude Sonnet

interface EnvCheckResult {
  DATABASE_URL: boolean;
  GROQ_API_KEY: boolean;
  GROQ_KEYS_COUNT: number;
  ANTHROPIC_API_KEY: boolean;
  allValid: boolean;
}

export function checkEnvironment(): EnvCheckResult {
  const groqKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean);

  const checks: EnvCheckResult = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    GROQ_API_KEY: groqKeys.length > 0,
    GROQ_KEYS_COUNT: groqKeys.length,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    allValid: false,
  };

  // allValid: DB + at least one AI provider (Groq primary OR Anthropic last-resort)
  checks.allValid = checks.DATABASE_URL && (checks.GROQ_API_KEY || checks.ANTHROPIC_API_KEY);

  if (typeof window === 'undefined') {
    // Server-side log only
    console.log('\n=== 환경 변수 체크 ===');
    console.log('DATABASE_URL:', checks.DATABASE_URL ? '✅ 설정됨' : '❌ 없음');
    console.log(`GROQ_API_KEY: ${checks.GROQ_API_KEY ? `✅ ${checks.GROQ_KEYS_COUNT}개 키` : '❌ 없음'}`);
    console.log('ANTHROPIC_API_KEY:', checks.ANTHROPIC_API_KEY ? '✅ 설정됨 (last-resort)' : '⚠️ 없음 (Groq fallback 불가)');
    console.log('전체 상태:', checks.allValid ? '✅ 모두 정상' : '❌ 문제 있음');

    if (!checks.GROQ_API_KEY) {
      console.error('\n⚠️ GROQ_API_KEY가 설정되지 않았습니다 (무료 14,400회/일).');
      console.log('해결 방법:');
      console.log('1. .env.local 파일 열기');
      console.log('2. GROQ_API_KEY="gsk_..." 추가 (최대 _2, _3까지 3개)');
      console.log('3. 서버 재시작 (npm run dev)\n');
    }

    if (!checks.DATABASE_URL) {
      console.error('\n⚠️ DATABASE_URL이 설정되지 않았습니다!');
      console.log('Supabase URL을 .env.local 파일에 추가하세요.\n');
    }
  }

  return checks;
}

export function getEnvStatus(): string {
  const checks = checkEnvironment();

  if (checks.allValid) {
    return '모든 환경 변수가 정상적으로 설정되었습니다.';
  }

  const errors: string[] = [];
  if (!checks.DATABASE_URL) errors.push('DATABASE_URL 누락');
  if (!checks.GROQ_API_KEY && !checks.ANTHROPIC_API_KEY) {
    errors.push('AI API 키 누락 (GROQ_API_KEY 또는 ANTHROPIC_API_KEY 필요)');
  }

  return `환경 변수 오류: ${errors.join(', ')}`;
}
