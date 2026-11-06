/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TwoColumnPricingSection, TwoColumnPricingSectionProps } from './TwoColumnPricingSection';

export type PricingSectionProps = TwoColumnPricingSectionProps;

export const PricingSection: React.FC<PricingSectionProps> = (props) => {
  return <TwoColumnPricingSection {...props} />;
};

export default PricingSection;
