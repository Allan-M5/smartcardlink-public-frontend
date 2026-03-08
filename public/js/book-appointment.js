(function () {
  'use strict';

  function bindFallback() {
    var btn = document.getElementById('bookAppointmentBtn');
    if (!btn) return;
    if (btn.dataset.bound === '1') return;

    btn.addEventListener('click', function (event) {
      if (btn.dataset.bound === '1') return;
      var bookingUrl = window.__SCL_BOOKING_URL__ || '';
      if (!bookingUrl) return;
      event.preventDefault();
      if (/^mailto:/i.test(bookingUrl)) {
        window.location.href = bookingUrl;
      } else {
        window.open(bookingUrl, '_blank', 'noopener');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindFallback);
  } else {
    bindFallback();
  }
})();
