-- Ensure a gateway payment reference can only credit a wallet once.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_gateway_ref_unique
  ON transactions(gateway_reference)
  WHERE gateway_reference IS NOT NULL;
