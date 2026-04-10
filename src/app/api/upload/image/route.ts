// src/app/api/upload/image/route.ts
// 네이버 스마트스토어 2026 이미지 업로드 API (Sharp 통합)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// 환경 변수 체크

export const dynamic = 'force-dynamic';
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('⚠️ Supabase 환경 변수가 설정되지 않았습니다.');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 네이버 스마트스토어 2026 이미지 규격
const NAVER_IMAGE_CONFIG = {
  minWidth: 500,
  minHeight: 500,
  recommendedWidth: 1000,
  recommendedHeight: 1000,
  maxSizeMB: 10,
  maxImages: 10,
  validTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  validMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};

/**
 * 이미지 메타데이터 추출 (Sharp)
 */
async function getImageMetadata(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: metadata.size || 0,
    };
  } catch (error) {
    console.error('❌ 메타데이터 추출 실패:', error);
    return null;
  }
}

/**
 * 네이버 규격 검증
 */
function validateNaverSpec(width: number, height: number) {
  if (width < NAVER_IMAGE_CONFIG.minWidth || height < NAVER_IMAGE_CONFIG.minHeight) {
    return {
      valid: false,
      error: `이미지 크기는 최소 ${NAVER_IMAGE_CONFIG.minWidth}x${NAVER_IMAGE_CONFIG.minHeight}px 이상이어야 합니다. (현재: ${width}x${height}px)`,
    };
  }
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;
    const isMain = formData.get('isMain') === 'true';
    const altText = formData.get('altText') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 없습니다.' },
        { status: 400 }
      );
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 네이버 이미지 업로드 시작 (2026 규격 + Sharp)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('파일명:', file.name);
    console.log('크기:', (file.size / 1024).toFixed(2), 'KB');
    console.log('타입:', file.type);
    console.log('메인 이미지:', isMain);

    // 1. 파일 크기 검증 (10MB)
    if (file.size > NAVER_IMAGE_CONFIG.maxSizeMB * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: `파일 크기는 ${NAVER_IMAGE_CONFIG.maxSizeMB}MB 이하여야 합니다.` },
        { status: 400 }
      );
    }

    // 2. 파일 형식 검증
    if (!NAVER_IMAGE_CONFIG.validMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'JPG, PNG, GIF, WebP 형식만 지원됩니다.' },
        { status: 400 }
      );
    }

    // 3. Buffer 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ⭐ 4. Sharp로 이미지 메타데이터 추출
    const metadata = await getImageMetadata(buffer);
    if (!metadata) {
      return NextResponse.json(
        { success: false, error: '이미지 파일이 손상되었거나 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    console.log('📏 이미지 정보:', `${metadata.width}x${metadata.height}px`, metadata.format);

    // ⭐ 5. 네이버 규격 검증 (최소 크기)
    const validation = validateNaverSpec(metadata.width, metadata.height);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // 6. 파일명 생성 (타임스탬프 + 랜덤)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop();
    const fileName = `${timestamp}-${random}.${ext}`;
    const filePath = productId ? `products/${productId}/${fileName}` : `temp/${fileName}`;

    // 7. Supabase Storage 업로드
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('❌ Supabase 업로드 실패:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 8. Public URL 생성
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    console.log('✅ 업로드 완료!');
    console.log('   URL:', urlData.publicUrl);
    console.log('   크기:', `${metadata.width}x${metadata.height}px`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      isMain,
      altText: altText || file.name.replace(/\.[^/.]+$/, ''),
      metadata: {
        size: file.size,
        type: file.type,
        name: file.name,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      },
    });
  } catch (error) {
    console.error('❌ 업로드 에러:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 에러',
      },
      { status: 500 }
    );
  }
}

// 이미지 삭제 API
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { success: false, error: '파일 경로가 필요합니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabase.storage
      .from('product-images')
      .remove([path]);

    if (error) {
      console.error('❌ 삭제 실패:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ 이미지 삭제 완료:', path);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ 삭제 에러:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 에러',
      },
      { status: 500 }
    );
  }
}
