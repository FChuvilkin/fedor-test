// FT — Fedor Testing. Amplitude Analytics + Web Experiment code goes here.
document.addEventListener('click', function (e) {
  if (e.target.closest('a[href="#"]')) e.preventDefault();
});
