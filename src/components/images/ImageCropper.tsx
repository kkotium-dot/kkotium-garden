'use client';

import { useState } from 'react';

interface ImageCropperProps {
  imageUrl: string;
  onCropComplete: (croppedUrl: string) => void;
  onClose: () => void;
}

export default function ImageCropper({ imageUrl, onCropComplete, onClose }: ImageCropperProps) {
  const [cropping, setCropping] = useState(false);

  const handleCrop = async () => {
    setCropping(true);

    // TODO: 실제 크롭 로직 구현
    // react-image-crop 또는 cropperjs 라이브러리 사용

    try {
      // Mock: 원본 이미지 그대로 반환
      onCropComplete(imageUrl);
      onClose();
    } catch (error) {
      console.error('크롭 실패:', error);
      alert('이미지 크롭 중 오류가 발생했습니다.');
    } finally {
      setCropping(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
        <h3 className="text-xl font-bold mb-4">✂️ 이미지 크롭</h3>

        <div className="mb-6">
          <img src={imageUrl} alt="크롭할 이미지" className="max-w-full" />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={cropping}
          >
            취소
          </button>
          <button
            onClick={handleCrop}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            disabled={cropping}
          >
            {cropping ? '크롭 중...' : '크롭 완료'}
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-500 text-center">
          💡 향후 react-image-crop 라이브러리로 실제 크롭 기능 추가 예정
        </p>
      </div>
    </div>
  );
}
