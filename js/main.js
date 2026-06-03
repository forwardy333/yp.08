window.addEventListener('scroll', function() {
  var parallax = document.querySelectorAll('.parallax');
  for (var i = 0; i < parallax.length; i++) {
    var rect = parallax[i].getBoundingClientRect();
    var offset = rect.top * 0.3;
    var bg = parallax[i].querySelector('.parallax-bg');
    if (bg) {
      bg.style.transform = 'translateY(' + offset + 'px)';
    }
  }
});

function lazyLoad() {
  var imgs = document.querySelectorAll('.lazy');
  for (var i = 0; i < imgs.length; i++) {
    var rect = imgs[i].getBoundingClientRect();
    if (rect.top < window.innerHeight + 100) {
      imgs[i].src = imgs[i].getAttribute('data-src');
      imgs[i].classList.add('loaded');
    }
  }
}

window.addEventListener('scroll', lazyLoad);
window.addEventListener('load', lazyLoad);

function fadeInScroll() {
  var els = document.querySelectorAll('.fade-in');
  for (var i = 0; i < els.length; i++) {
    var rect = els[i].getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      els[i].classList.add('visible');
    }
  }
}

window.addEventListener('scroll', fadeInScroll);
window.addEventListener('load', fadeInScroll);

function updateAuthBtn() {
  var user = getCurrentUser();
  var btns = document.querySelectorAll('.auth-link');
  var inPages = window.location.pathname.indexOf('/pages/') !== -1;

  for (var i = 0; i < btns.length; i++) {
    if (btns[i].hasAttribute('onclick')) continue;
    if (user) {
      btns[i].href = inPages ? 'lk.html' : 'pages/lk.html';
      btns[i].innerHTML = 'Личный кабинет';
    } else {
      btns[i].href = inPages ? 'login.html' : 'pages/login.html';
      btns[i].innerHTML = 'Войти';
    }
  }
}

if (typeof getCurrentUser !== 'undefined') {
  document.addEventListener('DOMContentLoaded', updateAuthBtn);
  window.addEventListener('load', updateAuthBtn);
}

(function() {
  var burger = document.querySelector('.burger');
  var nav = document.querySelector('header nav');

  if (!burger || !nav) return;

  function closeMenu() {
    nav.classList.remove('open');
    burger.classList.remove('open');
    document.body.classList.remove('menu-open');
  }

  function toggleMenu(e) {
    e.stopPropagation();
    nav.classList.toggle('open');
    burger.classList.toggle('open');
    document.body.classList.toggle('menu-open');
  }

  burger.addEventListener('click', toggleMenu);

  nav.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', function(e) {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !burger.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      closeMenu();
    }
  });
})();
