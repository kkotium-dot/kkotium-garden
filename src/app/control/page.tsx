'use client';
// src/app/control/page.tsx
// Control tower dedicated page (권위 DASHBOARD_DECLUTTER_IA_REAUDIT_2026-07-09 §2).
// Hosts PublishControlTower + ControlTowerMatrix so the dashboard only carries
// a compact summary card (개입 대기 N건 / 발행 준비 N건) that deep-links here.

import PublishControlTowerWidget from '@/components/dashboard/PublishControlTowerWidget';
import ControlTowerMatrixWidget from '@/components/dashboard/ControlTowerMatrixWidget';
import { Workflow } from 'lucide-react';

export default function ControlPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '24px', paddingBottom: 56 }} className="space-y-4">
      {/* Page header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: '#FEF0F3' }}>
            <Workflow size={22} strokeWidth={2.2} style={{ color: '#F63B28' }} />
          </div>
          <div>
            <h1 className="kk-pop-title" style={{ fontSize: 24, fontWeight: 400, color: '#1A1A1A', margin: 0 }}>
              관제탑
            </h1>
            <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
              발행 준비 신호등 · 상품 x 트랙 개입 매트릭스
            </p>
          </div>
        </div>
        <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, margin: '10px 0 6px' }} />
      </div>

      <PublishControlTowerWidget />
      <ControlTowerMatrixWidget />
    </div>
  );
}
