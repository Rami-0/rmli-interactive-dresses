'use client';

import { use } from 'react';
import Link from 'next/link';
import DetailApp from '@/components/webgl/DetailApp';
import '@/styles/globals.scss';
import '@/styles/detail.scss';

interface DetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function DetailPage({ params }: DetailPageProps) {
  const { id } = use(params);
  
  return (
    <>
      <div className="frame">
        <Link className="frame__back" href="/">
          ← Back to Gallery
        </Link>
      </div>
      <DetailApp itemId={id} />
    </>
  );
}

