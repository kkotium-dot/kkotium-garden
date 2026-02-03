// src/components/products/ImageUploader.tsx
// 네이버 스마트스토어 2026 이미지 업로더 (Supabase Storage 통합)

'use client';

import { useState, useRef } from 'react';
import { Upload, X, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  existingImages?: Array<{ url: string; isMain: boolean; altText: string }>;  // ⭐ optional로 변경
  onUploadSuccess: (imageData: { url: string; isMain: boolean; altText: string }) => void;
  onDeleteSuccess: (url: string) => void;
  maxImages?: number;
}

export default function ImageUploader({
  existingImages = [],  // ⭐ 기본값 빈 배열
  onUploadSuccess,
  onDeleteSuccess,
  maxImages = 10,
}: ImageUploaderProps) {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mainImageIndex, setMainImageIndex] = useState<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError(null);

    // 최대 개수 체크
    if (existingImages.length + imageFiles.length + files.length > maxImages) {
      setError(`최대 ${maxImages}개까지 업로드할 수 있습니다.`);
      return;
    }

    // 파일 크기 체크 (10MB)
    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      setError('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    // 파일 형식 체크
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const invalidTypes = files.filter(file => !validTypes.includes(file.type));
    if (invalidTypes.length > 0) {
      setError('JPG, PNG, GIF, WebP 형식만 지원됩니다.');
      return;
    }

    // 미리보기 생성
    const newPreviews: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === files.length) {
          setPreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setImageFiles(prev => [...prev, ...files]);

    // 첫 번째 이미지를 자동으로 메인으로 설정
    if (existingImages.length === 0 && imageFiles.length === 0 && mainImageIndex === -1) {
      setMainImageIndex(0);
    }
  };

  // 미리보기 삭제
  const handleRemovePreview = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));

    if (mainImageIndex === index) {
      setMainImageIndex(-1);
    } else if (mainImageIndex > index) {
      setMainImageIndex(mainImageIndex - 1);
    }
  };

  // 업로드된 이미지 삭제
  const handleDeleteImage = async (url: string) => {
    try {
      // Supabase Storage에서 삭제
      const path = url.split('/product-images/')[1];
      const res = await fetch(`/api/upload/image?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        onDeleteSuccess(url);
      } else {
        setError(data.error || '삭제 실패');
      }
    } catch (error) {
      console.error('삭제 에러:', error);
      setError('삭제 중 오류가 발생했습니다.');
    }
  };

  // 업로드 실행
  const handleUpload = async () => {
    if (imageFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const isMain = i === mainImageIndex;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('isMain', isMain.toString());
        formData.append('altText', file.name.replace(/\.[^/.]+$/, ''));

        const res = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || '업로드 실패');
        }

        // 성공 콜백
        onUploadSuccess({
          url: data.url,
          isMain: data.isMain,
          altText: data.altText,
        });

        console.log('✅ 업로드 성공:', data.url);
      }

      // 초기화
      setImageFiles([]);
      setPreviews([]);
      setMainImageIndex(-1);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      alert('✅ 이미지가 업로드되었습니다!');
    } catch (error) {
      console.error('❌ 업로드 에러:', error);
      setError(error instanceof Error ? error.message : '업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const totalImages = existingImages.length + imageFiles.length;
  const canUpload = imageFiles.length > 0 && !uploading;

  return (
    <div className="space-y-4">
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* 파일 선택 */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition ${
            totalImages >= maxImages
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
              : 'border-pink-300 bg-pink-50 hover:bg-pink-100'
          }`}
        >
          <Upload className="w-5 h-5 text-pink-600" />
          <span className="text-sm font-medium text-gray-700">
            {totalImages >= maxImages
              ? `최대 ${maxImages}개 도달`
              : `이미지 선택 (${totalImages}/${maxImages})`}
          </span>
        </label>
      </div>

      {/* 업로드 대기 중인 이미지 미리보기 */}
      {previews.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">📤 업로드 대기 중 ({imageFiles.length}개)</h4>
          <div className="grid grid-cols-4 gap-3">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-gray-200"
                />

                {/* 메인 이미지 배지 */}
                {mainImageIndex === index && (
                  <div className="absolute top-1 left-1 bg-pink-500 text-white text-xs px-2 py-0.5 rounded">
                    메인
                  </div>
                )}

                {/* 메인으로 설정 버튼 */}
                <button
                  onClick={() => setMainImageIndex(index)}
                  className={`absolute bottom-1 left-1 text-xs px-2 py-0.5 rounded ${
                    mainImageIndex === index
                      ? 'bg-pink-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-pink-100'
                  }`}
                >
                  {mainImageIndex === index ? <Check className="w-3 h-3" /> : '메인'}
                </button>

                {/* 삭제 버튼 */}
                <button
                  onClick={() => handleRemovePreview(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* 파일 정보 */}
                <div className="text-xs text-gray-500 mt-1 truncate">
                  {imageFiles[index]?.name}
                </div>
              </div>
            ))}
          </div>

          {/* 업로드 버튼 */}
          <button
            onClick={handleUpload}
            disabled={!canUpload}
            className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {imageFiles.length}개 업로드
              </>
            )}
          </button>
        </div>
      )}

      {/* 업로드된 이미지 목록 */}
      {existingImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            ✅ 업로드 완료 ({existingImages.length}개)
          </h4>
          <div className="grid grid-cols-4 gap-3">
            {existingImages.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image.url}
                  alt={image.altText}
                  className="w-full h-24 object-cover rounded-lg border border-gray-200"
                />

                {/* 메인 이미지 배지 */}
                {image.isMain && (
                  <div className="absolute top-1 left-1 bg-purple-500 text-white text-xs px-2 py-0.5 rounded">
                    메인
                  </div>
                )}

                {/* 삭제 버튼 */}
                <button
                  onClick={() => handleDeleteImage(image.url)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Alt 텍스트 */}
                <div className="text-xs text-gray-500 mt-1 truncate">
                  {image.altText}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 안내 메시지 */}
      {existingImages.length === 0 && imageFiles.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-2" />
          <p className="text-sm">이미지를 업로드하세요</p>
          <p className="text-xs mt-1">최대 {maxImages}개, 각 10MB 이하</p>
        </div>
      )}
    </div>
  );
}
