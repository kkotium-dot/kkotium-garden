'use client';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
}

export default function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  productName,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">🗑️ 상품 삭제</h3>
        <p className="text-gray-700 mb-6">
          정말로 <strong>&quot;{productName}&quot;</strong> 상품을 삭제하시겠습니까?
          <br />
          <span className="text-red-600 text-sm">이 작업은 되돌릴 수 없습니다.</span>
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
