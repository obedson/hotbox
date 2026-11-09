-- 03_audit_triggers.sql
-- Database-level audit trail for sensitive tables. This complements the
-- application-level custody_ledger and audit_logs writes: even if an
-- application path forgets to record an audit entry, the trigger captures the
-- change. The actor is taken from the optional `app.current_user_id` session
-- GUC when the application sets it, otherwise it is recorded as NULL.

CREATE OR REPLACE FUNCTION audit_trigger_func() RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID;
BEGIN
  BEGIN
    v_actor := current_setting('app.current_user_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
    VALUES (v_actor, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
    VALUES (
      v_actor,
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
    VALUES (v_actor, 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shipments_audit ON shipments;
CREATE TRIGGER shipments_audit AFTER INSERT OR UPDATE OR DELETE ON shipments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS wallets_audit ON wallets;
CREATE TRIGGER wallets_audit AFTER INSERT OR UPDATE OR DELETE ON wallets
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS transactions_audit ON transactions;
CREATE TRIGGER transactions_audit AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS claims_audit ON claims;
CREATE TRIGGER claims_audit AFTER INSERT OR UPDATE OR DELETE ON claims
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS enterprise_accounts_audit ON enterprise_accounts;
CREATE TRIGGER enterprise_accounts_audit AFTER INSERT OR UPDATE OR DELETE ON enterprise_accounts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
