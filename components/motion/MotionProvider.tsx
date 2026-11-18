'use client';

import React from 'react';
import { MotionConfig } from 'framer-motion';

/** Animations Framer Motion actives pour tous (elles sont douces et liées au scroll). */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="never">{children}</MotionConfig>;
}
