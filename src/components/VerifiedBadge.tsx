/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'sm',
  className = '',
}) => {
  const sizeMap = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 cursor-default align-middle group relative ${className}`}
      title="Verified Account"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeMap[size]} text-blue-500 fill-current drop-shadow-xs transition-transform group-hover:scale-110`}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.6 2.5a2 2 0 0 1 2.8 0l1.1 1.1a1 1 0 0 0 .7.3h1.5a2 2 0 0 1 2 2v1.5a1 1 0 0 0 .3.7l1.1 1.1a2 2 0 0 1 0 2.8l-1.1 1.1a1 1 0 0 0-.3.7v1.5a2 2 0 0 1-2 2h-1.5a1 1 0 0 0-.7.3l-1.1 1.1a2 2 0 0 1-2.8 0l-1.1-1.1a1 1 0 0 0-.7-.3H6.8a2 2 0 0 1-2-2v-1.5a1 1 0 0 0-.3-.7L3.4 13.9a2 2 0 0 1 0-2.8l1.1-1.1a1 1 0 0 0 .3-.7V7.8a2 2 0 0 1 2-2h1.5a1 1 0 0 0 .7-.3L8.6 2.5Z"
        />
        <path
          d="m9.5 12 1.8 1.8 4.2-4.2"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
};
