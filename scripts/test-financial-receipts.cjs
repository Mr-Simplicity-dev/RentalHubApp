const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// 1. Verify mobile paymentService exposes canonical document endpoints
const ps = fs.readFileSync(path.join(root, 'src/services/paymentService.js'), 'utf8');
for (const fn of [
  'getDocumentReceipt',
  'downloadDocumentPdf',
  'getLandlordRentReceipts',
  'getWalletTransactions',
  'getTenantRefundRequests',
  'getLandlordRefundRequests',
]) {
  assert.ok(ps.includes(`${fn}:`), `Missing ${fn} in mobile paymentService.js`);
}
assert.ok(ps.includes('/payments/receipts/'), 'Must call canonical /payments/receipts/:kind/:id');

// 2. Verify native FinancialReceiptModal uses AppText, Expo File/Sharing, and Amana branding
const modal = fs.readFileSync(path.join(root, 'src/components/payments/FinancialReceiptModal.js'), 'utf8');
assert.ok(modal.includes("from '../common/AppText'"), 'Modal must use AppText');
assert.ok(modal.includes('expo-file-system'), 'Modal must save PDF natively');
assert.ok(modal.includes('expo-sharing'), 'Modal must share PDF natively');
assert.ok(modal.includes('Amana RentalHub NG'), 'Modal must display Amana branding');
assert.ok(!modal.includes('Linking.openURL'), 'Modal must NOT open external browser');

// 3. Verify mobile screens wire FinancialReceiptModal and mask bank accounts
const screens = [
  'src/screens/dashboard/PaymentHistoryScreen.js',
  'src/screens/agent/AgentWithdrawalsScreen.js',
  'src/screens/financial-admin/FinancialTransactionsScreen.js',
  'src/screens/financial-admin/FinancialWithdrawalsScreen.js',
  'src/screens/transportation/TransportationBookingDetailScreen.js',
  'src/screens/fumigation/FumigationCleaningBookingDetailScreen.js',
  'src/screens/rent-savings/SavingsGoalDetailScreen.js',
];
for (const rel of screens) {
  const content = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(content.includes('FinancialReceiptModal'), `${rel} must mount FinancialReceiptModal`);
}
const fw = fs.readFileSync(path.join(root, 'src/screens/financial-admin/FinancialWithdrawalsScreen.js'), 'utf8');
assert.ok(fw.includes('maskAccount(item.account_number)'), 'FinancialWithdrawalsScreen must mask bank account numbers');

console.log('Mobile financial receipt checks passed (10/10 assertions)');
