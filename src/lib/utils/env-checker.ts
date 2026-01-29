// 환경 변수 확인 유틸리티

interface EnvCheckResult {
  DATABASE_URL: boolean;
  PERPLEXITY_API_KEY: boolean;
  PERPLEXITY_API_KEY_FORMAT: boolean;
  allValid: boolean;
}

export function checkEnvironment(): EnvCheckResult {
  const checks = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    PERPLEXITY_API_KEY: !!process.env.PERPLEXITY_API_KEY,
    PERPLEXITY_API_KEY_FORMAT: process.env.PERPLEXITY_API_KEY?.startsWith('pplx-') || false,
    allValid: false,
  };

  checks.allValid = checks.DATABASE_URL && checks.PERPLEXITY_API_KEY && checks.PERPLEXITY_API_KEY_FORMAT;

  if (typeof window === 'undefined') {
    // 서버 사이드에서만 로그 출력
    console.log('\n=== 환경 변수 체크 ===');
    console.log('DATABASE_URL:', checks.DATABASE_URL ? '✅ 설정됨' : '❌ 없음');
    console.log('PERPLEXITY_API_KEY:', checks.PERPLEXITY_API_KEY ? '✅ 설정됨' : '❌ 없음');
    console.log('API 키 형식:', checks.PERPLEXITY_API_KEY_FORMAT ? '✅ 올바름 (pplx-)' : '❌ 잘못됨');
    console.log('전체 상태:', checks.allValid ? '✅ 모두 정상' : '❌ 문제 있음');

    if (!checks.PERPLEXITY_API_KEY) {
      console.error('\n⚠️ PERPLEXITY_API_KEY가 설정되지 않았습니다!');
      console.log('해결 방법:');
      console.log('1. .env.local 파일 열기');
      console.log('2. PERPLEXITY_API_KEY="pplx-여기에API키" 추가');
      console.log('3. 서버 재시작 (npm run dev)\n');
    }

    if (!checks.PERPLEXITY_API_KEY_FORMAT && checks.PERPLEXITY_API_KEY) {
      console.error('\n⚠️ API 키 형식이 올바르지 않습니다!');
      console.log('올바른 형식: pplx-xxxxxxxxxxxxxxxxxxxx');
      console.log('현재 값:', process.env.PERPLEXITY_API_KEY?.substring(0, 10) + '...\n');
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
  if (!checks.PERPLEXITY_API_KEY) errors.push('PERPLEXITY_API_KEY 누락');
  if (checks.PERPLEXITY_API_KEY && !checks.PERPLEXITY_API_KEY_FORMAT) {
    errors.push('PERPLEXITY_API_KEY 형식 오류');
  }

  return `환경 변수 오류: ${errors.join(', ')}`;
}
