const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../../src/config/db');
const paymentService = require('../../src/services/paymentService');

// walletService captures verifyPaystackReference at require time, so install a
// delegating stub before loading it and vary the behaviour per test.
let paymentBehavior = async () => { throw new Error('payment behavior not configured'); };
const originalVerify = paymentService.verifyPaystackReference;
paymentService.verifyPaystackReference = (reference) => paymentBehavior(reference);

const { creditWalletForPayment } = require('../../src/services/walletService');

const originalGetClient = db.getClient;

after(() => {
  db.getClient = originalGetClient;
  paymentService.verifyPaystackReference = originalVerify;
});

function createFakeClient({ existingTransactions = [], wallet = null, createdWallet = null } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK')) {
        return { rows: [] };
      }
      if (sql.includes('FROM transactions WHERE gateway_reference')) {
        return { rows: existingTransactions };
      }
      if (sql.includes('FROM wallets WHERE user_id')) {
        return { rows: wallet ? [wallet] : [] };
      }
      if (sql.startsWith('INSERT INTO wallets')) {
        return { rows: [createdWallet] };
      }
      if (sql.startsWith('UPDATE wallets')) {
        return { rows: [] };
      }
      if (sql.startsWith('INSERT INTO transactions')) {
        return { rows: [{ id: 'tx-1', reference: 'TOPUP-1' }] };
      }
      return { rows: [] };
    },
    release() {}
  };
}

test('creditWalletForPayment credits the wallet once and records the transaction', async () => {
  paymentBehavior = async () => ({
    reference: 'PAY-REF-1',
    amountNgn: 5000,
    currency: 'NGN',
    status: 'success'
  });
  const client = createFakeClient({
    wallet: { id: 'wallet-1', user_id: 'user-1', balance_ngn: '1000', ledger_balance_ngn: '1000' }
  });
  db.getClient = async () => client;

  const result = await creditWalletForPayment('user-1', 'PAY-REF-1');

  assert.equal(result.alreadyCredited, false);
  assert.equal(result.amount, 5000);
  assert.equal(result.balanceAfter, 6000);

  const update = client.calls.find(call => call.sql.startsWith('UPDATE wallets'));
  assert.ok(update, 'expected a wallet balance update');
  assert.deepEqual(update.params, [6000, 'wallet-1']);

  const insert = client.calls.find(call => call.sql.startsWith('INSERT INTO transactions'));
  assert.ok(insert, 'expected a transaction insert');
  assert.equal(insert.params[5], 'PAY-REF-1');
});

test('creditWalletForPayment does not double-credit a replayed gateway reference', async () => {
  paymentBehavior = async () => ({
    reference: 'PAY-REF-1',
    amountNgn: 5000,
    currency: 'NGN',
    status: 'success'
  });
  const client = createFakeClient({
    existingTransactions: [{ id: 'tx-existing' }],
    wallet: { id: 'wallet-1', user_id: 'user-1', balance_ngn: '1000', ledger_balance_ngn: '1000' }
  });
  db.getClient = async () => client;

  const result = await creditWalletForPayment('user-1', 'PAY-REF-1');

  assert.equal(result.alreadyCredited, true);
  assert.equal(result.amount, 5000);
  assert.equal(client.calls.some(call => call.sql.startsWith('UPDATE wallets')), false);
  assert.equal(client.calls.some(call => call.sql.startsWith('INSERT INTO transactions')), false);
});

test('creditWalletForPayment creates a wallet when none exists', async () => {
  paymentBehavior = async () => ({
    reference: 'PAY-REF-2',
    amountNgn: 2500,
    currency: 'NGN',
    status: 'success'
  });
  const createdWallet = { id: 'wallet-2', user_id: 'user-2', balance_ngn: '0', ledger_balance_ngn: '0' };
  const client = createFakeClient({ createdWallet });
  db.getClient = async () => client;

  const result = await creditWalletForPayment('user-2', 'PAY-REF-2');

  assert.equal(result.alreadyCredited, false);
  assert.equal(result.balanceAfter, 2500);
  assert.ok(client.calls.some(call => call.sql.startsWith('INSERT INTO wallets')));
});

test('creditWalletForPayment does not open a transaction when verification fails', async () => {
  paymentBehavior = async () => {
    throw new Error('Invalid payment reference.');
  };
  let getClientCalled = false;
  db.getClient = async () => {
    getClientCalled = true;
    return createFakeClient();
  };

  await assert.rejects(() => creditWalletForPayment('user-1', 'bad-ref'), /Invalid payment reference/);
  assert.equal(getClientCalled, false);
});
