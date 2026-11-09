const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
// ==========================================
// ENTERPRISE BILLING, INVOICES & RECONCILIATION
// ==========================================

// GET /api/v1/enterprise/invoices (List all periodic invoices from PostgreSQL)
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const accRes = await db.query('SELECT id FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }
    const accountId = accRes.rows[0].id;

    const invoicesRes = await db.query(`
      SELECT 
        id, invoice_number, billing_period, period_start, period_end,
        parcel_count, subtotal_ngn, tax_vat_ngn, total_amount_ngn, amount_paid_ngn,
        status, due_date, payment_terms, payment_reference, paid_at, created_at
      FROM enterprise_invoices
      WHERE enterprise_account_id = $1
      ORDER BY period_start DESC
    `, [accountId]);

    res.json({ invoices: invoicesRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enterprise invoices: ' + err.message });
  }
});

// GET /api/v1/enterprise/billing/summary (Credit line, outstanding receivables, remittance info)
router.get('/billing/summary', authenticate, async (req, res) => {
  try {
    const accRes = await db.query(
      'SELECT id, company_name, billing_tier, monthly_credit_limit_ngn FROM enterprise_accounts WHERE user_id = $1',
      [req.user.id]
    );
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }
    const account = accRes.rows[0];

    const invSummary = await db.query(`
      SELECT 
        COUNT(*)::int as total_invoices,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int as pending_count,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN total_amount_ngn - amount_paid_ngn ELSE 0 END), 0)::numeric as outstanding_ngn,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount_paid_ngn ELSE 0 END), 0)::numeric as lifetime_paid_ngn,
        COALESCE(SUM(parcel_count), 0)::int as total_parcels_billed
      FROM enterprise_invoices
      WHERE enterprise_account_id = $1
    `, [account.id]);

    const summaryRow = invSummary.rows[0];
    const creditLimit = parseFloat(account.monthly_credit_limit_ngn) || 500000;
    const outstanding = parseFloat(summaryRow.outstanding_ngn) || 0;
    const lifetimePaid = parseFloat(summaryRow.lifetime_paid_ngn) || 0;
    const availableCredit = Math.max(0, creditLimit - (outstanding > creditLimit ? creditLimit : outstanding));

    res.json({
      summary: {
        companyName: account.company_name,
        billingTier: account.billing_tier || 'POSTPAID_NET30',
        creditLimitNgn: creditLimit,
        creditLimitFormatted: `₦${creditLimit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
        outstandingNgn: outstanding,
        outstandingFormatted: `₦${outstanding.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
        availableCreditNgn: availableCredit,
        availableCreditFormatted: `₦${availableCredit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
        lifetimePaidNgn: lifetimePaid,
        lifetimePaidFormatted: `₦${lifetimePaid.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
        totalInvoices: summaryRow.total_invoices,
        pendingCount: summaryRow.pending_count,
        totalParcelsBilled: summaryRow.total_parcels_billed,
        paymentTerms: 'Net-30 Days from statement issuance',
        remittanceBank: {
          bankName: 'Providus Bank / NIPOST Central Escrow',
          accountName: 'Hotbox Logistics Enterprise Remittance',
          accountNumber: '1099248812',
          sortCode: '101-092'
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch billing summary: ' + err.message });
  }
});

// GET /api/v1/enterprise/invoices/:id (Detailed statement line items)
router.get('/invoices/:id', authenticate, async (req, res) => {
  try {
    const accRes = await db.query('SELECT id, company_name FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }
    const account = accRes.rows[0];

    const invRes = await db.query(
      'SELECT * FROM enterprise_invoices WHERE id = $1 AND enterprise_account_id = $2',
      [req.params.id, account.id]
    );
    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or unauthorized.' });
    }
    const invoice = invRes.rows[0];

    const hubBreakdown = await db.query(`
      SELECT 
        COALESCE(h.business_name, 'Regional Delivery Network') as hub_name,
        COUNT(s.id)::int as count,
        COALESCE(SUM(s.pricing_total_ngn), 0)::numeric as subtotal
      FROM shipments s
      LEFT JOIN hubs h ON h.id = s.destination_hub_id
      WHERE s.sender_id = $1
      GROUP BY h.business_name
      ORDER BY count DESC
      LIMIT 6
    `, [req.user.id]);

    res.json({
      invoice,
      accountName: account.company_name,
      lineItems: hubBreakdown.rows.map(h => ({
        description: `Express Delivery routing via ${h.hub_name}`,
        quantity: h.count,
        ratePerUnitNgn: 1300,
        totalNgn: parseFloat(h.subtotal)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice detail: ' + err.message });
  }
});

// GET /api/v1/enterprise/invoices/:id/export (Live CSV Reconciliation Statement)
router.get('/invoices/:id/export', authenticate, async (req, res) => {
  try {
    const accRes = await db.query('SELECT id, company_name FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }

    const invRes = await db.query(
      'SELECT * FROM enterprise_invoices WHERE id = $1 AND enterprise_account_id = $2',
      [req.params.id, accRes.rows[0].id]
    );
    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }
    const invoice = invRes.rows[0];

    const shipmentsRes = await db.query(`
      SELECT 
        s.tracking_code,
        s.service_type,
        s.recipient_name,
        s.recipient_postcode,
        h.business_name as destination_hub,
        s.status,
        s.pricing_total_ngn,
        s.created_at
      FROM shipments s
      LEFT JOIN hubs h ON h.id = s.destination_hub_id
      WHERE s.sender_id = $1
      ORDER BY s.created_at DESC
      LIMIT 2000
    `, [req.user.id]);

    const headers = ['Invoice Number', 'Billing Period', 'Tracking Code', 'Service Type', 'Recipient Name', 'Recipient Postcode', 'Destination Hub', 'Status', 'Rate NGN', 'Created At'];
    const rows = shipmentsRes.rows.map(s => [
      invoice.invoice_number,
      invoice.billing_period,
      s.tracking_code,
      s.service_type,
      `"${(s.recipient_name || '').replace(/"/g, '""')}"`,
      s.recipient_postcode,
      `"${(s.destination_hub || '').replace(/"/g, '""')}"`,
      s.status,
      s.pricing_total_ngn,
      new Date(s.created_at).toISOString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Reconciliation-${invoice.invoice_number}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export invoice reconciliation CSV: ' + err.message });
  }
});

// POST /api/v1/enterprise/invoices/:id/pay (Settle Invoice via Corporate Remittance)
router.post('/invoices/:id/pay', authenticate, async (req, res) => {
  try {
    const accRes = await db.query('SELECT id FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }

    const invRes = await db.query(
      'SELECT * FROM enterprise_invoices WHERE id = $1 AND enterprise_account_id = $2',
      [req.params.id, accRes.rows[0].id]
    );
    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }
    const invoice = invRes.rows[0];
    if (invoice.status === 'PAID') {
      return res.status(400).json({ error: 'Invoice has already been settled and paid in full.' });
    }

    const refCode = `NIBSS-EFT-${Date.now().toString().slice(-6)}-KGA`;
    const updateRes = await db.query(`
      UPDATE enterprise_invoices
      SET status = 'PAID',
          amount_paid_ngn = total_amount_ngn,
          paid_at = NOW(),
          payment_reference = $1
      WHERE id = $2
      RETURNING *
    `, [refCode, invoice.id]);

    res.json({
      message: `Invoice ${invoice.invoice_number} settled successfully via corporate remittance.`,
      invoice: updateRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process invoice payment: ' + err.message });
  }
});

module.exports = router;
