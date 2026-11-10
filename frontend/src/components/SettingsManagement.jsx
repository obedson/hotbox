import React from 'react';
import SettingsPanel from './operations/SettingsPanel';
import useSettings from './operations/useSettings';

export default function SettingsManagement() {
  const directory = useSettings();

  return (
    <>
      <SettingsPanel directory={directory} />
    </>
  );
}
