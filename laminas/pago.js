/* Pago de láminas: pide el correo, abre el pago de PayPal con el importe ya puesto
   y deja el correo en la descripción del pago para saber a dónde enviar las láminas. */
(function () {
  var VENDEDOR = 'RL5PM8J348SBE';
  var form = document.getElementById('f');
  var cfg = window.PAGO;
  var err = document.getElementById('err');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      err.textContent = 'Revisa el correo: parece incompleto.';
      return;
    }
    err.textContent = '';
    var base = location.href.replace(/laminas\/.*$/, '');
    var desc = cfg.item + ' · enviar a: ' + email;
    var url = 'https://www.paypal.com/cgi-bin/webscr?cmd=_xclick'
      + '&business=' + VENDEDOR
      + '&item_name=' + encodeURIComponent(desc)
      + '&amount=' + cfg.importe
      + '&currency_code=EUR&no_shipping=1&no_note=1&lc=ES&charset=utf-8'
      + '&custom=' + encodeURIComponent(email)
      + '&return=' + encodeURIComponent(base + 'laminas/gracias.html')
      + '&cancel_return=' + encodeURIComponent(base);
    location.href = url;
  });
})();
