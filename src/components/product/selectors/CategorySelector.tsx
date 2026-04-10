'use client';

import CategorySearch from '@/components/CategorySearch';

type Props = {
  valueCode: string;
  valuePath: string;
  onChange: (next: { code: string; fullPath: string }) => void;
  className?: string;
};

export default function CategorySelector({ valueCode, valuePath, onChange, className }: Props) {
  return (
    <div className={className || ''}>
      <CategorySearch
        value={
          valueCode && valuePath
            ? { id: '', code: valueCode, fullPath: valuePath }
            : null
        }
        onChange={(cat) => {
          if (!cat) {
            onChange({ code: '', fullPath: '' });
            return;
          }
          onChange({ code: cat.code, fullPath: cat.fullPath });
        }}
      />
    </div>
  );
}
