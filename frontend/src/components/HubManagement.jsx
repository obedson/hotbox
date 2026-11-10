import React from 'react';
import HubPanel from './operations/HubPanel';
import HubDossierModal from './operations/HubDossierModal';
import useHubDirectory from './operations/useHubDirectory';

export default function HubManagement({ onSelectShipment }) {
  const directory = useHubDirectory();

  return (
    <>
      <HubPanel directory={directory} />

      <HubDossierModal
        isDossierOpen={directory.isDossierOpen}
        selectedHub={directory.selectedHub}
        hubDetails={directory.hubDetails}
        loadingDetails={directory.loadingDetails}
        setIsDossierOpen={directory.setIsDossierOpen}
        handleToggleIntake={directory.handleToggleIntake}
        handleToggleStatus={directory.handleToggleStatus}
        onSelectShipment={onSelectShipment}
      />
    </>
  );
}
