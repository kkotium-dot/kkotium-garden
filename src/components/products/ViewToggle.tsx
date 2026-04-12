'use client';

interface ViewToggleProps {
  view: 'grid' | 'table';
  onViewChange: (view: 'grid' | 'table') => void;
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 p-1">
      <button
        onClick={() => onViewChange('grid')}
        className={`px-4 py-2 text-sm rounded-md transition-colors ${
          view === 'grid'
            ? 'bg-pink-500 text-white'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        
        카드
      </button>
      <button
        onClick={() => onViewChange('table')}
        className={`px-4 py-2 text-sm rounded-md transition-colors ${
          view === 'table'
            ? 'bg-pink-500 text-white'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        
        테이블
      </button>
    </div>
  );
}
