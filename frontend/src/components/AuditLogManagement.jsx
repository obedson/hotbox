import React from 'react';
import AuditLogPanel from './operations/AuditLogPanel';
import AuditInspectionModal from './operations/AuditInspectionModal';
import useAuditLog from './operations/useAuditLog';

export default function AuditLogManagement({ onSelectShipment }) {
  const directory = useAuditLog();

  return (
    <>
      <AuditLogPanel directory={directory} onSelectShipment={onSelectShipment} />

      <AuditInspectionModal
        formatDateTime={directory.formatDateTime}
        inspectModal={directory.inspectModal}
        setInspectModal={directory.setInspectModal}
        onSelectShipment={onSelectShipment}
      />
    </>
  );
}
