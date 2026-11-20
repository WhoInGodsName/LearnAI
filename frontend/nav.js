(() => {
  const header = document.querySelector('.site-header');
  const toggle = header?.querySelector('.nav-toggle');
  const nav = header?.querySelector('#site-nav');
  if (!header || !toggle || !nav) return;

  const mobileLayout = window.matchMedia('(max-width: 700px)');
  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    nav.hidden = true;
  };

  const syncLayout = () => {
    if (mobileLayout.matches) {
      if (toggle.getAttribute('aria-expanded') !== 'true') nav.hidden = true;
    } else {
      nav.hidden = false;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation menu');
    }
  };

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Open navigation menu' : 'Close navigation menu');
    nav.hidden = isOpen;
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a') && mobileLayout.matches) closeMenu();
  });

  document.addEventListener('click', (event) => {
    if (mobileLayout.matches && !header.contains(event.target)) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileLayout.matches) {
      closeMenu();
      toggle.focus();
    }
  });

  mobileLayout.addEventListener('change', syncLayout);
  syncLayout();
})();
