'use client';

import { use } from 'react';
import Link from 'next/link';
import DetailAppV2 from '@/components/webgl/DetailAppV2';
import '@/styles/globals.scss';
import '@/styles/detail.scss';

export default function DetailV2Page() {
  return (
    <>
      <div className="frame">
        <Link className="frame__back" href="/">
          ← Back to Gallery
        </Link>
      </div>
      <DetailAppV2 />
    </>
  );
}
