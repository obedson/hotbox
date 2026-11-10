import React from 'react';
import ReportsPanel from './operations/ReportsPanel';
import useReports from './operations/useReports';

export default function ReportsManagement() {
  const directory = useReports();

  return (
    <>
      <ReportsPanel directory={directory} />
    </>
  );
}
