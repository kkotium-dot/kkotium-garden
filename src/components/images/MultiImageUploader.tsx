'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageFile {
  id: string;
  file?: File;
  url: string;
  isMain: boolean;
  uploading?: boolean;
}

interface MultiImageUploaderProps {
  initialImages?: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export default function MultiImageUploader({ 
  initialImages = [], 
  onChange,
  maxImages = 10 
}: MultiImageUploaderProps) {
  const [images, setImages] = useState<ImageFile[]>(
    initialImages.map((url, idx) => ({
      id: `existing-${idx}`,
      url,
      isMain: idx === 0,
    }))
  );

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const remainingSlots = maxImages - images.length;
    const filesToUpload = acceptedFiles.slice(0, remainingSlots);

    const newImages: ImageFile[] = filesToUpload.map((file, idx) => ({
      id: `new-${Date.now()}-${idx}`,
      file,
      url: URL.createObjectURL(file),
      isMain: images.length === 0 && idx === 0,
      uploading: true,
    }));

    setImages(prev => [...prev, ...newImages]);

    // 업로드 시작
    for (const img of newImages) {
      if (img.file) {
        await uploadImage(img.id, img.file);
      }
    }
  }, [images.length, maxImages]);

  const uploadImage = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setImages(prev => prev.map(img => 
          img.id === id 
            ? { ...img, url: data.url, uploading: false }
            : img
        ));

        // onChange 호출
        updateParent();
      } else {
        console.error('업로드 실패:', data.error);
        // 실패한 이미지 제거
        setImages(prev => prev.filter(img => img.id !== id));
        alert('이미지 업로드 실패: ' + data.error);
      }
    } catch (error) {
      console.error('업로드 오류:', error);
      setImages(prev => prev.filter(img => img.id !== id));
      alert('이미지 업로드 중 오류가 발생했습니다.');
    }
  };

  const updateParent = () => {
    const uploadedImages = images
      .filter(img => !img.uploading)
      .map(img => img.url);
    onChange(uploadedImages);
  };

  const handleSetMain = (id: string) => {
    setImages(prev => {
      const updated = prev.map(img => ({
        ...img,
        isMain: img.id === id,
      }));

      // 메인 이미지를 맨 앞으로 이동
      const mainImg = updated.find(img => img.id === id);
      const others = updated.filter(img => img.id !== id);

      return mainImg ? [mainImg, ...others] : updated;
    });

    setTimeout(updateParent, 0);
  };

  const handleDelete = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);

      // 메인 이미지를 삭제한 경우, 첫 번째 이미지를 메인으로
      if (filtered.length > 0 && !filtered.some(img => img.isMain)) {
        filtered[0].isMain = true;
      }

      return filtered;
    });

    setTimeout(updateParent, 0);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: images.length >= maxImages,
  });

  return (
    <div className="space-y-4">
      {/* 업로드 영역 */}
      {images.length < maxImages && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors \${
            isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <div className="text-4xl">📸</div>
            {isDragActive ? (
              <p className="text-blue-600">이미지를 여기에 놓으세요</p>
            ) : (
              <>
                <p className="text-gray-700">
                  이미지를 드래그하거나 클릭하여 업로드
                </p>
                <p className="text-sm text-gray-500">
                  최대 {maxImages}장 • JPG, PNG, WEBP • 5MB 이하
                </p>
                <p className="text-xs text-gray-400">
                  {images.length}/{maxImages} 장 업로드됨
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* 이미지 그리드 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img) => (
            <div 
              key={img.id} 
              className={`relative group rounded-lg overflow-hidden border-2 \${
                img.isMain ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              <div className="aspect-square">
                <img
                  src={img.url}
                  alt="상품 이미지"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 업로딩 중 오버레이 */}
              {img.uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-sm">업로드 중...</div>
                </div>
              )}

              {/* 호버 액션 버튼 */}
              {!img.uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {!img.isMain && (
                    <button
                      onClick={() => handleSetMain(img.id)}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                      메인
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    삭제
                  </button>
                </div>
              )}

              {/* 메인 이미지 배지 */}
              {img.isMain && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                  메인
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
