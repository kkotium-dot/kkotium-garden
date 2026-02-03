// lib/supabase-storage.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Supabase Storage에 여러 이미지 업로드
 * @param files - File[] 배열
 * @returns 업로드된 이미지 URL 배열
 */
export async function uploadMultipleImages(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  const bucketName = 'products'; // Supabase bucket 이름

  for (const file of files) {
    try {
      // 파일명 생성 (타임스탬프 + 랜덤)
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split('.').pop();
      const filename = `${timestamp}_${randomStr}.${ext}`;
      const filePath = `uploads/${filename}`;

      // Supabase Storage 업로드
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('❌ Supabase 업로드 실패:', error);
        throw new Error(error.message);
      }

      // Public URL 생성
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      urls.push(urlData.publicUrl);
      console.log('✅ Supabase 업로드 완료:', filename);
    } catch (error) {
      console.error('❌ 이미지 업로드 실패:', error);
      throw error;
    }
  }

  return urls;
}

/**
 * Supabase Storage에서 이미지 삭제
 * @param url - 삭제할 이미지 URL
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    const bucketName = 'products';
    // URL에서 파일 경로 추출
    const filePath = url.split(`/${bucketName}/`)[1];

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('❌ Supabase 삭제 실패:', error);
      throw new Error(error.message);
    }

    console.log('✅ Supabase 삭제 완료:', filePath);
  } catch (error) {
    console.error('❌ 이미지 삭제 실패:', error);
    throw error;
  }
}
