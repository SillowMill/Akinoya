import React from 'react';
import { PlanetDossierModal, PlanetDossierModalProps } from './PlanetDossierModal';

export type ContestDossierProps = PlanetDossierModalProps;

export const ContestDossier: React.FC<ContestDossierProps> = (props) => {
  return <PlanetDossierModal {...props} />;
};

export default ContestDossier;
