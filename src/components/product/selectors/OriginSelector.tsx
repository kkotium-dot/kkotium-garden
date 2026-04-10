'use client';

import OriginSearch from '@/components/OriginSearch';

// Thin wrapper: delegates to OriginSearch (518 real origin codes from DB)
// Props kept backward-compatible with ProductBasicForm

type Props = {
  value: string;
  importerName?: string;
  onChange: (code: string, name: string) => void;
  onImporterChange?: (importer: string) => void;
  className?: string;
};

export default function OriginSelector({
  value,
  importerName = '',
  onChange,
  onImporterChange,
  className,
}: Props) {
  return (
    <div className={className || ''}>
      <OriginSearch
        value={value ? { code: value, name: '' } : null}
        importerName={importerName}
        onChange={(origin) => {
          if (!origin) {
            onChange('', '');
            return;
          }
          onChange(origin.code, origin.name);
        }}
        onImporterChange={onImporterChange}
      />
    </div>
  );
}

