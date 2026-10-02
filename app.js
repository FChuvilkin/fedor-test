// FT — Fedor Testing
// Small shared script. Amplitude Analytics + Web Experiment will be added here later.

(function () {
  // Keep the masthead date current.
  var el = document.getElementById('today');
  if (el) {
    el.textContent = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  // Prevent placeholder links (href="#") from jumping to top.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
  });
})();
