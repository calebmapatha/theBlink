// Standalone sanity check for the PayFast signing/verification logic in
// index.js. No test framework — functions/ has none, and this is small
// enough that a plain assert script is the proportionate choice.
//
// Run with: node functions/test-payfast-signing.mjs
//
// This exists because payment-signature code is exactly where a single
// wrong character (space vs +, field order, an omitted passphrase check)
// silently breaks every real transaction. It proves: (1) the PHP-urlencode
// shim matches PHP's actual encoding on every character PayFast integrations
// are documented to trip over, (2) the outgoing checkout signature and the
// incoming ITN verifier agree on the same bytes (an ITN we "send ourselves"
// in this test round-trips), (3) a tampered ITN is rejected, and (4) the
// two published PayFast IP ranges are matched/rejected at their boundaries.

import assert from 'node:assert/strict'
import { phpUrlEncode, payfastSignature, verifyItnSignature, isPayfastIp } from './index.js'

let passed = 0
const check = async (name, fn) => {
  await fn()
  passed++
  console.log(`  ok - ${name}`)
}

console.log('phpUrlEncode — characters PHP\'s urlencode() treats differently from JS')
await check('space becomes +', () => assert.equal(phpUrlEncode('a b'), 'a+b'))
await check('! is escaped (JS leaves it bare)', () => assert.equal(phpUrlEncode('a!b'), 'a%21b'))
await check("' is escaped", () => assert.equal(phpUrlEncode("a'b"), 'a%27b'))
await check('( and ) are escaped', () => assert.equal(phpUrlEncode('a(b)c'), 'a%28b%29c'))
await check('* is escaped', () => assert.equal(phpUrlEncode('a*b'), 'a%2Ab'))
await check('~ is escaped', () => assert.equal(phpUrlEncode('a~b'), 'a%7Eb'))
await check('alphanumerics pass through untouched', () => assert.equal(phpUrlEncode('MentisFlow123'), 'MentisFlow123'))

console.log('payfastSignature — outgoing checkout fields')
await check('omits passphrase entirely when unset (PAYFAST_PASSPHRASE is blank in this run)', async () => {
  const { createHash } = await import('node:crypto')
  const sig = payfastSignature([['merchant_id', '10000100'], ['amount', '495.00']])
  const expected = createHash('md5').update('merchant_id=10000100&amount=495.00').digest('hex')
  assert.equal(sig, expected, 'with no passphrase configured, the signature must match a plain md5 of the fields alone')
})
await check('blank fields are excluded from the signed string', () => {
  const withBlank = payfastSignature([['merchant_id', '10000100'], ['cell_number', '']])
  const withoutField = payfastSignature([['merchant_id', '10000100']])
  assert.equal(withBlank, withoutField, 'an empty-string field must not change the signature')
})
await check('field order changes the signature (order-sensitive, not alphabetical)', () => {
  const a = payfastSignature([['merchant_id', '1'], ['amount', '2']])
  const b = payfastSignature([['amount', '2'], ['merchant_id', '1']])
  assert.notEqual(a, b, 'PayFast checkout signing is order-sensitive; these must differ')
})

console.log('checkout signature <-> ITN verifier round-trip (the real correctness proof)')
await check('an ITN body built the same way the checkout signs it verifies successfully', () => {
  // Simulate what PayFast would send back: our own fields, PHP-urlencoded,
  // in receipt order, with our own signature appended — exactly the shape
  // verifyItnSignature is designed to check.
  const fields = [
    ['m_payment_id', 'uid123-1699999999999'],
    ['pf_payment_id', '987654321'],
    ['payment_status', 'COMPLETE'],
    ['item_name', 'MentisFlow - Standard (monthly)'],
    ['amount_gross', '495.00'],
    ['custom_str1', 'uid123'],
    ['custom_str2', 'standard'],
    ['custom_str3', 'monthly'],
  ]
  const signature = payfastSignature(fields)
  const body = fields.map(([k, v]) => `${k}=${phpUrlEncode(v)}`).join('&') + `&signature=${signature}`
  assert.equal(verifyItnSignature(body, signature), true)
})
await check('a tampered ITN (amount changed after signing) is rejected', () => {
  const fields = [['custom_str1', 'uid123'], ['amount_gross', '495.00']]
  const signature = payfastSignature(fields)
  const tamperedBody = `custom_str1=${phpUrlEncode('uid123')}&amount_gross=${phpUrlEncode('9.00')}&signature=${signature}`
  assert.equal(verifyItnSignature(tamperedBody, signature), false)
})
await check('a missing/garbage signature is rejected, not thrown', () => {
  assert.equal(verifyItnSignature('custom_str1=uid123', null), false)
  assert.equal(verifyItnSignature('custom_str1=uid123', 'not-a-real-signature'), false)
})

console.log('isPayfastIp — the two published ITN ranges, tested at their boundaries')
await check('197.97.145.144/28 — network address (.144) is in range', () => assert.equal(isPayfastIp('197.97.145.144'), true))
await check('197.97.145.144/28 — broadcast address (.159) is in range', () => assert.equal(isPayfastIp('197.97.145.159'), true))
await check('197.97.145.144/28 — .143 (just below) is NOT in range', () => assert.equal(isPayfastIp('197.97.145.143'), false))
await check('197.97.145.144/28 — .160 (just above) is NOT in range', () => assert.equal(isPayfastIp('197.97.145.160'), false))
await check('41.74.179.192/27 — .192 is in range', () => assert.equal(isPayfastIp('41.74.179.192'), true))
await check('41.74.179.192/27 — .223 is in range', () => assert.equal(isPayfastIp('41.74.179.223'), true))
await check('41.74.179.192/27 — .191 is NOT in range', () => assert.equal(isPayfastIp('41.74.179.191'), false))
await check('41.74.179.192/27 — .224 is NOT in range', () => assert.equal(isPayfastIp('41.74.179.224'), false))
await check('an unrelated IP is rejected', () => assert.equal(isPayfastIp('8.8.8.8'), false))
await check('garbage input is rejected, not thrown', () => assert.equal(isPayfastIp('not-an-ip'), false))

console.log(`\n${passed} checks passed.`)
