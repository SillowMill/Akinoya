/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ClaimYourWorldModal, ClaimYourWorldModalProps } from './ClaimYourWorldModal';

export type CreateWorldModalProps = ClaimYourWorldModalProps;

export const CreateWorldModal: React.FC<CreateWorldModalProps> = (props) => {
  return <ClaimYourWorldModal {...props} />;
};

export default CreateWorldModal;
