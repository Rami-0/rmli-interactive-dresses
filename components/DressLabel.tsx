'use client';

interface DressLabelProps {
  name: string;
}

export function DressLabel({ name }: DressLabelProps) {
  return (
    <div className="dress-label">
      {name}
    </div>
  );
}

