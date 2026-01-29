'use client';

import { useState, useEffect } from 'react';

interface NaverSettings {
  clientId: string;
  clientSecret: string;
  channelId: string;
  enabled: boolean;
}

export default function NaverSettingsPanel() {
  const [settings, setSettings] = useState<NaverSettings>({
    clientId: '',
    clientSecret: '',
    channelId: '',
    enabled: false,
  });

  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/naver/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('설정 조회 실패:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await fetch('/api/naver/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (data.success) {
        alert('✅ 네이버 쇼핑 설정이 저장되었습니다!');
      } else {
        alert(`❌ 저장 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('설정 저장 실패:', error);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      const res = await fetch('/api/naver/test', {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        alert('✅ 네이버 쇼핑 API 연결 성공!');
      } else {
        alert(`❌ 연결 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('API 테스트 실패:', error);
      alert('API 테스트 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        ⚙️ 네이버 쇼핑 API 설정
      </h3>

      <div className="space-y-4">
        {/* 활성화 토글 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium">네이버 쇼핑 연동</div>
            <div className="text-sm text-gray-600">API를 활성화하여 자동 등록을 시작합니다</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>

        {/* Client ID */}
        <div>
          <label className="block text-sm font-medium mb-1">Client ID</label>
          <input
            type="text"
            value={settings.clientId}
            onChange={(e) => setSettings({ ...settings, clientId: e.target.value })}
            placeholder="네이버 커머스 API Client ID"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Client Secret */}
        <div>
          <label className="block text-sm font-medium mb-1">Client Secret</label>
          <div className="relative">
            <input
              type={showSecrets ? 'text' : 'password'}
              value={settings.clientSecret}
              onChange={(e) => setSettings({ ...settings, clientSecret: e.target.value })}
              placeholder="네이버 커머스 API Client Secret"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
            <button
              type="button"
              onClick={() => setShowSecrets(!showSecrets)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showSecrets ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Channel ID */}
        <div>
          <label className="block text-sm font-medium mb-1">Channel ID</label>
          <input
            type="text"
            value={settings.channelId}
            onChange={(e) => setSettings({ ...settings, channelId: e.target.value })}
            placeholder="네이버 쇼핑 채널 ID"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* 안내 메시지 */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <div className="font-medium text-blue-800 mb-2">📌 API 키 발급 방법</div>
          <ol className="text-blue-700 space-y-1 ml-4">
            <li>1. <a href="https://commerce.naver.com" target="_blank" rel="noopener noreferrer" className="underline">네이버 커머스 센터</a> 접속</li>
            <li>2. 판매자 등록 및 승인 완료</li>
            <li>3. API 설정에서 Client ID/Secret 발급</li>
            <li>4. 위 정보를 입력 후 저장</li>
          </ol>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleTest}
            className="flex-1 px-4 py-2 border border-green-500 text-green-600 rounded-lg hover:bg-green-50"
            disabled={!settings.clientId || !settings.clientSecret}
          >
            🧪 연결 테스트
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '💾 설정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
