'use client';
// E-13A/E-13C: Reusable Kakao channel QR code generator
// Uses Google Charts API for QR generation (free, no auth, fully cacheable)
// Fallback to QRServer.com if Google Charts fails

import { useState } from 'react';
import { Download, ExternalLink, Loader2 } from 'lucide-react';

interface Props {
  channelId: string;
  channelUrl?: string;
  size?: number;
  showActions?: boolean;
  bgColor?: string;
  fgColor?: string;
}

export default function KakaoChannelQR({
  channelId,
  channelUrl,
  size = 180,
  showActions = true,
  bgColor = '#FFFFFF',
  fgColor = '#000000',
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Resolve target URL — prefer explicit channelUrl, fallback to PF format
  const targetUrl = channelUrl || `https://pf.kakao.com/${channelId}`;

  // Google Charts QR API — free, no auth
  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(targetUrl)}&chld=H|0`;

  // Fallback: QRServer.com (also free)
  const qrFallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(targetUrl)}&color=${fgColor.replace('#', '')}&bgcolor=${bgColor.replace('#', '')}`;

  const handleDownload = async () => {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kakao-channel-qr-${channelId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Silent fail — download is convenience only
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          background: bgColor,
          padding: 8,
          borderRadius: 12,
          border: '1px solid #FFE4EC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading && !error && (
          <Loader2 size={20} style={{ position: 'absolute', color: '#FF6B8A', animation: 'spin 1s linear infinite' }} />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={error ? qrFallbackUrl : qrUrl}
          alt={`Kakao channel QR for ${channelId}`}
          width={size - 16}
          height={size - 16}
          style={{ width: size - 16, height: size - 16, objectFit: 'contain', opacity: loading ? 0 : 1, transition: 'opacity 0.2s' }}
          onLoad={() => setLoading(false)}
          onError={() => {
            if (!error) {
              setError(true);
              setLoading(true);
            } else {
              setLoading(false);
            }
          }}
        />
      </div>

      {showActions && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={handleDownload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 500,
              color: '#993556',
              background: '#FFF0F5',
              border: '1px solid #FFB3CE',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <Download size={12} />
            <span>PNG 저장</span>
          </button>
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 500,
              color: '#993556',
              background: '#FFF0F5',
              border: '1px solid #FFB3CE',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={12} />
            <span>채널 열기</span>
          </a>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
