'use client';

import { useState } from 'react';

interface BulkTrackingInputProps {
  orderIds: string[];
  onSuccess: () => void;
  onClose: () => void;
}

export default function BulkTrackingInput({ orderIds, onSuccess, onClose }: BulkTrackingInputProps) {
  const [courierCompany, setCourierCompany] = useState('CJGLS');
  const [trackingList, setTrackingList] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleBulkUpload = async () => {
    const trackingNumbers = trackingList
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (trackingNumbers.length === 0) {
      alert('송장번호를 입력해주세요.');
      return;
    }

    if (trackingNumbers.length !== orderIds.length) {
      alert(`송장번호 개수(${trackingNumbers.length})와 선택한 주문 개수(${orderIds.length})가 일치하지 않습니다.`);
      return;
    }

    if (!confirm(`${orderIds.length}개 주문에 송장번호를 일괄 입력하시겠습니까?`)) {
      return;
    }

    setUploading(true);

    try {
      const res = await fetch('/api/orders/bulk-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds,
          courierCompany,
          trackingNumbers,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ ${data.updated}개 주문에 송장번호가 입력되었습니다.`);
        onSuccess();
        onClose();
      } else {
        alert(`❌ 업로드 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('일괄 송장 입력 실패:', error);
      alert('송장 입력 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h3 className="text-xl font-bold mb-4">📦 송장번호 일괄 입력</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">택배사 선택</label>
            <select
              value={courierCompany}
              onChange={(e) => setCourierCompany(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="CJGLS">CJ대한통운</option>
              <option value="HANJIN">한진택배</option>
              <option value="LOTTE">롯데택배</option>
              <option value="LOGEN">로젠택배</option>
              <option value="KDEXP">경동택배</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              송장번호 입력 (줄바꿈으로 구분, {orderIds.length}개 필요)
            </label>
            <textarea
              value={trackingList}
              onChange={(e) => setTrackingList(e.target.value)}
              placeholder="1234567890&#10;0987654321&#10;1122334455"
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              rows={10}
            />
            <div className="mt-1 text-sm text-gray-500">
              현재 입력: {trackingList.split('\n').filter(l => l.trim()).length}개
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <div className="font-medium text-blue-800 mb-1">💡 사용 방법</div>
            <ul className="text-blue-700 space-y-1 ml-4">
              <li>• 엑셀에서 송장번호 열을 복사하여 붙여넣기</li>
              <li>• 주문 순서와 송장번호 순서가 일치해야 합니다</li>
              <li>• 줄바꿈으로 각 송장번호를 구분합니다</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={uploading}
            >
              취소
            </button>
            <button
              onClick={handleBulkUpload}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? '업로드 중...' : '일괄 입력'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
