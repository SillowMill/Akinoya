'use client';

export { ComingSoonGate } from '../src/components/ComingSoonGate';
export default function ComingSoonGateWrapper(props: any) {
  const { ComingSoonGate } = require('../src/components/ComingSoonGate');
  return <ComingSoonGate {...props} />;
}
