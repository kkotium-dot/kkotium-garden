// lib/cloudinary.ts
/**
 * Cloudinary 설정
 * 
 * 환경변수 필요 (.env):
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
 * CLOUDINARY_API_KEY=your_api_key
 * CLOUDINARY_API_SECRET=your_api_secret
 */

import { v2 as cloudinary } from 'cloudinary';

// Cloudinary 초기화
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * 이미지 업로드
 */
export async function uploadImage(file: File): Promise<string> {
  try {
    // File을 base64로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    // Cloudinary 업로드
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'kkotium-products',
      resource_type: 'auto',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });

    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary 업로드 실패:', error);
    throw new Error('이미지 업로드 실패');
  }
}

/**
 * 다중 이미지 업로드
 */
export async function uploadMultipleImages(files: File[]): Promise<string[]> {
  try {
    const uploadPromises = files.map(file => uploadImage(file));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('다중 이미지 업로드 실패:', error);
    throw new Error('다중 이미지 업로드 실패');
  }
}

/**
 * 이미지 삭제
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('이미지 삭제 실패:', error);
    throw new Error('이미지 삭제 실패');
  }
}

export default cloudinary;
