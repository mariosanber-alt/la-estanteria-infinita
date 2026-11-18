import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const payment = readFileSync(new URL('../laminas/pago.js', import.meta.url), 'utf8');
const ordal = readFileSync(new URL('../laminas/ordal/index.html', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];

test('invalid or missing sheet numbers cannot create a purchasable item', () => {
  for (const value of ['', '?n=0', '?n=16', '?n=2abc', '?n=01', '?n=-1']) {
    const button = {}, label = {}, error = {}, window = {};
    const context = vm.createContext({URLSearchParams, location: {search: value}, window,
      document: {getElementById: id => id === 'n' ? label : error, querySelector: () => button}});
    vm.runInContext(ordal, context);
    assert.equal(window.PAGO, null);
    assert.equal(button.disabled, true);
  }
});
test('valid sheet produces a PayPal URL without claiming verification', () => {
  let submit;
  const error = {}, location = {href: 'https://example.pages.dev/laminas/ordal/?n=2'};
  const window = {PAGO: {importe: '0.20', item: 'Lámina 2 · Cuentas de Ordal'}};
  const context = vm.createContext({window, location, document: {getElementById: id =>
    id === 'f' ? {addEventListener: (_event, fn) => {submit = fn;}}
      : id === 'email' ? {value: 'test@example.com'} : error}});
  vm.runInContext(payment, context);
  submit({preventDefault() {}});
  const url = new URL(location.href);
  assert.equal(url.origin, 'https://www.paypal.com');
  assert.equal(url.searchParams.get('amount'), '0.20');
  assert.equal(url.searchParams.get('currency_code'), 'EUR');
  assert.equal(url.searchParams.get('custom'), 'test@example.com');
  assert.equal(url.searchParams.get('item_name').includes('test@example.com'), false);
  assert.equal(url.searchParams.get('return'), 'https://example.pages.dev/laminas/gracias.html');
  assert.match(readFileSync(new URL('../laminas/gracias.html', import.meta.url), 'utf8'), /no confirma el pago/);
});
