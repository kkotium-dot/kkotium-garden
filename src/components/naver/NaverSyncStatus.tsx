'use client';

import { useEffect, useState } from 'react';

interface SyncStatus {
  lastSync: string | null;
  totalProducts: number;
  syncedProducts: number;
  failedProducts: number;
  syncing: boolean;
}

export default function NaverSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    lastSync: null,
    totalProducts: 0,
    syncedProducts: 0,
    failedProducts: 0,
    syncing: false,
  });

  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/naver/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error('상태 조회 실패:', error);
    }
  };

  const handleSync = async () => {
    if (status.syncing) return;

    setStatus(prev => ({ ...prev, syncing: true }));

    try {
      const res = await fetch('/api/naver/sync', {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ 동기화 완료!\n성공: ${data.synced}개 / 실패: ${data.failed}개`);
        fetchStatus();
      } else {
        alert(`❌ 동기화 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('동기화 실패:', error);
      alert('동기화 중 오류가 발생했습니다.');
    } finally {
      setStatus(prev => ({ ...prev, syncing: false }));
    }
  };

  const syncPercentage = status.totalProducts > 0
    ? (status.syncedProducts / status.totalProducts) * 100
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          💚 네이버 쇼핑 동기화
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          {showDetails ? '접기 ▲' : '펼치기 ▼'}
        </button>
      </div>

      {/* 요약 정보 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-sm text-gray-600 mb-1">전체 상품</div>
          <div className="text-2xl font-bold text-blue-600">{status.totalProducts}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-sm text-gray-600 mb-1">동기화 완료</div>
          <div className="text-2xl font-bold text-green-600">{status.syncedProducts}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <div className="text-sm text-gray-600 mb-1">동기화 실패</div>
          <div className="text-2xl font-bold text-red-600">{status.failedProducts}</div>
        </div>
      </div>

      {/* 진행률 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">동기화 진행률</span>
          <span className="font-medium">{syncPercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${syncPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* 마지막 동기화 시간 */}
      {status.lastSync && (
        <div className="text-sm text-gray-600 mb-4">
          마지막 동기화: {new Date(status.lastSync).toLocaleString('ko-KR')}
        </div>
      )}

      {/* 동기화 버튼 */}
      <button
        onClick={handleSync}
        disabled={status.syncing}
        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {status.syncing ? (
          <>
            <span className="animate-spin">⏳</span>
            동기화 중...
          </>
        ) : (
          <>
            🔄 재고/가격 동기화
          </>
        )}
      </button>

      {/* 상세 정보 */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-medium mb-2">💡 동기화 정보</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 네이버 쇼핑에 등록된 상품의 재고와 가격을 업데이트합니다.</li>
            <li>• 자동 동기화는 매일 오전 6시에 실행됩니다.</li>
            <li>• 수동 동기화는 언제든지 실행 가능합니다.</li>
            <li>• 동기화 실패 상품은 로그에서 확인할 수 있습니다.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
