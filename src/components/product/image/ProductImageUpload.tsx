'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ProductImageUploadProps {
  existingImages: string[];
  onUploadSuccess: (images: string[]) => void;
  onDeleteSuccess: (images: string[]) => void;
}

export default function ProductImageUpload({
  existingImages,
  onUploadSuccess,
  onDeleteSuccess,
}: ProductImageUploadProps) {
  const [images, setImages] = useState<string[]>(existingImages);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 최대 10개 제한
    if (images.length + files.length > 10) {
      toast.error('이미지는 최대 10개까지 업로드 가능합니다.');
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // 파일 검증
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name}은(는) 이미지 파일이 아닙니다.`);
        }

        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name}의 크기가 5MB를 초과합니다.`);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('isMain', (images.length === 0).toString());

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || '업로드 실패');
        }

        const data = await response.json();
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const newImages = [...images, ...uploadedUrls];

      setImages(newImages);
      onUploadSuccess(newImages);

      toast.success(`이미지 ${uploadedUrls.length}개 업로드 완료!`);
    } catch (error: any) {
      console.error('업로드 오류:', error);
      toast.error(error.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      // input 초기화
      e.target.value = '';
    }
  };

  const handleDelete = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onDeleteSuccess(newImages);

    // 메인 이미지 인덱스 조정
    if (index === mainImageIndex) {
      setMainImageIndex(0);
    } else if (index < mainImageIndex) {
      setMainImageIndex(mainImageIndex - 1);
    }

    toast.success('이미지가 삭제되었습니다.');
  };

  // ✅ 메인 이미지 변경 (메시지 오류 수정)
  const handleSetMain = (index: number) => {
    setMainImageIndex(index);

    // 이미지 순서 변경 (메인을 맨 앞으로)
    const newImages = [...images];
    const [mainImage] = newImages.splice(index, 1);
    newImages.unshift(mainImage);

    setImages(newImages);
    setMainImageIndex(0);
    onUploadSuccess(newImages);

    // ✅ 정확한 메시지
    toast.success('메인 이미지로 설정되었습니다.');
  };

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-2xl border-2 border-pink-200">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          이미지 (3개) ✅ 최적화됨
        </h3>
        <p className="text-sm text-gray-600">
          • 네이버 스토어 기준: 600×600 이상, 최대 10개
          <br />
          • 첫 번째 이미지가 메인 이미지로 등록됩니다
          <br />
          • 이미지를 클릭하면 메인 이미지로 변경됩니다
        </p>
      </div>

      {/* 업로드 버튼 */}
      <div>
        <label className="flex items-center justify-center w-full h-32 px-4 border-2 border-dashed border-pink-300 rounded-2xl cursor-pointer hover:border-pink-500 hover:bg-pink-50 transition-all">
          <div className="text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-pink-500" />
            <p className="text-sm font-bold text-gray-700">
              {uploading ? '업로드 중...' : '이미지 선택 (최대 10개)'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG (최대 5MB)
            </p>
          </div>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading || images.length >= 10}
            className="hidden"
          />
        </label>
      </div>

      {/* 이미지 목록 */}
      {images.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-3">
            업로드된 이미지 ({images.length}/10)
          </h4>
          <div className="grid grid-cols-3 gap-4">
            {images.map((url, index) => (
              <div
                key={index}
                className={`relative group rounded-xl overflow-hidden border-4 transition-all cursor-pointer ${
                  index === mainImageIndex
                    ? 'border-pink-500 shadow-lg'
                    : 'border-gray-200 hover:border-pink-300'
                }`}
                onClick={() => handleSetMain(index)}
              >
                {/* 메인 배지 */}
                {index === mainImageIndex && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      메인
                    </span>
                  </div>
                )}

                {/* 이미지 */}
                <img
                  src={url}
                  alt={`상품 이미지 ${index + 1}`}
                  className="w-full aspect-square object-cover"
                />

                {/* 삭제 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(index);
                  }}
                  className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* 호버 오버레이 */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                  {index !== mainImageIndex && (
                    <p className="text-white text-sm font-bold opacity-0 group-hover:opacity-100">
                      클릭하여 메인 설정
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 이미지 없음 */}
      {images.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
          <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">
            아직 업로드된 이미지가 없습니다
          </p>
          <p className="text-sm text-gray-500 mt-2">
            위 버튼을 클릭하여 이미지를 업로드해주세요
          </p>
        </div>
      )}
    </div>
  );
}
