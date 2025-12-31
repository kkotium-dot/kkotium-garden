export async function safeApiCall<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      return {
        data: null,
        error: `HTTP ${res.status}: ${errorText || res.statusText}`,
      }
    }

    const data = await res.json()
    return { data, error: null }
  } catch (error) {
    console.error('API 호출 실패:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    }
  }
}

export function safeNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

export function safeString(value: any, defaultValue: string = ''): string {
  return value ? String(value) : defaultValue
}
