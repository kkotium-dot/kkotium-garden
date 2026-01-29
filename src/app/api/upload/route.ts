// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadMultipleImages } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: '파일이 없습니다' },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (각 10MB 이하)
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: '파일 크기는 10MB 이하여야 합니다' },
          { status: 400 }
        );
      }
    }

    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: '지원하지 않는 파일 형식입니다 (JPEG, PNG, WebP만 가능)' },
          { status: 400 }
        );
      }
    }

    console.log(`📤 ${files.length}개 이미지 업로드 시작...`);

    // Cloudinary 업로드
    const urls = await uploadMultipleImages(files);

    console.log('✅ 이미지 업로드 완료:', urls);

    return NextResponse.json({
      success: true,
      urls,
      message: `${urls.length}개 이미지 업로드 완료`,
    });
  } catch (error: any) {
    console.error('❌ 이미지 업로드 API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message || '이미지 업로드 실패' },
      { status: 500 }
    );
  }
}

// OPTIONS 메서드 (CORS)
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
