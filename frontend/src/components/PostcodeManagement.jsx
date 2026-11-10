import React from 'react';
import PostcodePanel from './operations/PostcodePanel';
import PostcodeDossierModal from './operations/PostcodeDossierModal';
import PostcodeRegisterModal from './operations/PostcodeRegisterModal';
import usePostcodeDirectory from './operations/usePostcodeDirectory';

export default function PostcodeManagement() {
  const directory = usePostcodeDirectory();

  return (
    <>
      <PostcodePanel
        actionNotice={directory.actionNotice}
        activeTab={directory.activeTab}
        copiedKey={directory.copiedKey}
        counts={directory.counts}
        currentPage={directory.currentPage}
        error={directory.error}
        exportToCsv={directory.exportToCsv}
        fetchDirectory={directory.fetchDirectory}
        handleCopy={directory.handleCopy}
        loading={directory.loading}
        lookupError={directory.lookupError}
        lookupLoading={directory.lookupLoading}
        lookupResult={directory.lookupResult}
        openPostcodeDossier={directory.openPostcodeDossier}
        pageSize={directory.pageSize}
        paginatedPostcodes={directory.paginatedPostcodes}
        postcodes={directory.postcodes}
        refreshing={directory.refreshing}
        runLookup={directory.runLookup}
        searchQuery={directory.searchQuery}
        selectedState={directory.selectedState}
        setActionNotice={directory.setActionNotice}
        setActiveTab={directory.setActiveTab}
        setCurrentPage={directory.setCurrentPage}
        setSearchQuery={directory.setSearchQuery}
        setSelectedState={directory.setSelectedState}
        setTestCode={directory.setTestCode}
        states={directory.states}
        testCode={directory.testCode}
        totalPages={directory.totalPages}
        totalRecords={directory.totalRecords}
      />

      <PostcodeDossierModal
        isDossierOpen={directory.isDossierOpen}
        catchmentData={directory.catchmentData}
        loadingCatchment={directory.loadingCatchment}
        selectedPostcode={directory.selectedPostcode}
        setIsDossierOpen={directory.setIsDossierOpen}
      />

      <PostcodeRegisterModal
        isRegisterOpen={directory.isRegisterOpen}
        postcodes={directory.postcodes}
        setIsRegisterOpen={directory.setIsRegisterOpen}
      />
    </>
  );
}
