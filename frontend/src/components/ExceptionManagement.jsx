import React from 'react';
import ExceptionPanel from './operations/ExceptionPanel';
import ExceptionResolutionModal from './operations/ExceptionResolutionModal';
import useExceptionManagement from './operations/useExceptionManagement';

export default function ExceptionManagement() {
  const directory = useExceptionManagement();

  return (
    <>
      <ExceptionPanel directory={directory} />

      <ExceptionResolutionModal
        activeActionTab={directory.activeActionTab}
        claimDecision={directory.claimDecision}
        dossierData={directory.dossierData}
        formatIncidentType={directory.formatIncidentType}
        handleAuthorizeRTS={directory.handleAuthorizeRTS}
        handleReassignCourier={directory.handleReassignCourier}
        handleResolveClaim={directory.handleResolveClaim}
        loadingDetails={directory.loadingDetails}
        reassignReason={directory.reassignReason}
        resolutionNotes={directory.resolutionNotes}
        rtsReason={directory.rtsReason}
        selectedException={directory.selectedException}
        selectedRiderId={directory.selectedRiderId}
        setActiveActionTab={directory.setActiveActionTab}
        setClaimDecision={directory.setClaimDecision}
        setIsDossierOpen={directory.setIsDossierOpen}
        setReassignReason={directory.setReassignReason}
        setResolutionNotes={directory.setResolutionNotes}
        setRtsReason={directory.setRtsReason}
        setSelectedRiderId={directory.setSelectedRiderId}
        setSettlementAmount={directory.setSettlementAmount}
        settlementAmount={directory.settlementAmount}
        submittingAction={directory.submittingAction}
        isDossierOpen={directory.isDossierOpen}
      />
    </>
  );
}
