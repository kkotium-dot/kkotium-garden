'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  maxSize?: number; // MB
}

export default function ImageUploader({
  images,
  onChange,
  maxImages = 10,
  maxSize = 10,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError('');

    // 최대 이미지 수 체크
    if (images.length + acceptedFiles.length > maxImages) {
      setError(`최대 ${maxImages}개까지 업로드 가능합니다`);
      return;
    }

    // 파일 크기 체크
    for (const file of acceptedFiles) {
      if (file.size > maxSize * 1024 * 1024) {
        setError(`파일 크기는 ${maxSize}MB 이하여야 합니다`);
        return;
      }
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      acceptedFiles.forEach(file => {
        formData.append('files', file);
      });

      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      const data = await res.json();

      if (data.success) {
        setProgress(100);
        onChange([...images, ...data.urls]);

        // 성공 후 초기화
        setTimeout(() => {
          setProgress(0);
        }, 1000);
      } else {
        setError(data.error || '업로드 실패');
      }
    } catch (error) {
      setError('업로드 중 오류가 발생했습니다');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  }, [images, onChange, maxImages, maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    multiple: true,
    disabled: uploading || images.length >= maxImages,
  });

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* 드롭존 */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
          ${isDragActive ? 'border-pink-500 bg-pink-50' : 'border-gray-300 hover:border-pink-400'}
          ${uploading || images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center">
            <Upload className="w-8 h-8 text-pink-600" />
          </div>

          <div>
            <p className="text-lg font-semibold text-gray-700">
              {isDragActive ? '여기에 놓으세요' : '이미지를 드래그하거나 클릭하세요'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              JPEG, PNG, WebP (최대 {maxSize}MB, {maxImages}개)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {images.length}/{maxImages}개 업로드됨
            </p>
          </div>
        </div>
      </div>

      {/* 진행률 */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">업로드 중...</span>
            <span className="font-semibold text-pink-600">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 이미지 미리보기 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-pink-400 transition"
            >
              <img
                src={image}
                alt={`상품 이미지 ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* 삭제 버튼 */}
              <button
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>

              {/* 메인 이미지 표시 */}
              {index === 0 && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-pink-500 text-white text-xs font-semibold rounded">
                  메인
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 안내 */}
      {images.length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          <ImageIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">이미지 업로드 팁</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• 첫 번째 이미지가 메인 이미지로 설정됩니다</li>
              <li>• 정사각형 비율 권장 (1:1)</li>
              <li>• 고해상도 이미지 권장 (최소 800x800px)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
