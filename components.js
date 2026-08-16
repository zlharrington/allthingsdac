(() => {
  const e = React.createElement;
  const logoUrl = 'https://allthingsdac.com/wp-content/uploads/elementor/thumbs/ALL-THINGS-Logo-Final-02-qgh79c2h3iokz2svfomt334bg3xy40uovp52ti7kgu.png';
  const phoneHref = 'tel:+15093026024';
  const phoneDisplay = '509-302-6024';
  const email = 'matt@allthingsdac.com';

  const navItems = [
    ['services.html', 'Services'],
    ['work.html', 'Our Work'],
    ['about.html', 'About'],
    ['contact.html', 'Contact']
  ];

  function currentPage() {
    const page = window.location.pathname.split('/').pop();
    return page || 'index.html';
  }

  function Brand({ footer = false }) {
    return e(
      'a',
      {
        className: `brand brand-logo${footer ? ' footer-logo' : ''}`,
        href: 'index.html',
        'aria-label': 'All Things Drywall & Construction home'
      },
      e('img', { src: logoUrl, alt: 'All Things Drywall & Construction' })
    );
  }

  function SiteHeader() {
    const [menuOpen, setMenuOpen] = React.useState(false);
    const activePage = currentPage();
    return e(
      React.Fragment,
      null,
      e(
        'div',
        { className: 'topbar' },
        e(
          'div',
          { className: 'wrap' },
          e('span', null, 'Serving Tri-Cities & the Mid-Columbia'),
          e('a', { href: phoneHref }, `Call ${phoneDisplay}`)
        )
      ),
      e(
        'header',
        { className: 'site-header' },
        e(
          'div',
          { className: 'wrap nav' },
          e(Brand),
          e(
            'button',
            {
              className: 'mobile-toggle',
              'aria-label': menuOpen ? 'Close menu' : 'Open menu',
              'aria-expanded': String(menuOpen),
              type: 'button',
              onClick: () => setMenuOpen(open => !open)
            },
            '☰'
          ),
          e(
            'nav',
            { className: `nav-links${menuOpen ? ' open' : ''}`, 'aria-label': 'Primary navigation' },
            ...navItems.map(([href, label]) =>
              e(
                'a',
                {
                  key: href,
                  href,
                  'aria-current': activePage === href ? 'page' : undefined,
                  onClick: () => setMenuOpen(false)
                },
                label
              )
            ),
            e('a', { className: 'btn btn-primary', href: 'contact.html', onClick: () => setMenuOpen(false) }, 'Request an Estimate')
          )
        )
      )
    );
  }

  function SiteFooter() {
    return e(
      'footer',
      { className: 'footer' },
      e(
        'div',
        { className: 'wrap' },
        e(
          'div',
          { className: 'footer-grid' },
          e(
            'div',
            null,
            e(Brand, { footer: true }),
            e('p', null, 'Commercial • Government • Select Residential', e('br'), 'Tri-Cities, Washington')
          ),
          e(
            'div',
            null,
            e('strong', null, 'Contact'),
            e(
              'p',
              null,
              e('a', { href: phoneHref }, phoneDisplay),
              e('br'),
              e('a', { href: `mailto:${email}` }, email)
            )
          ),
          e('div', null, e('strong', null, 'License'), e('p', null, 'ALLTHTD827BH', e('br'), 'Pasco, Washington'))
        ),
        e(
          'div',
          { className: 'footer-bottom' },
          '© 2026 All Things Drywall & Construction, LLC. · ',
          e('a', { href: 'services.html' }, 'Services'),
          ' · ',
          e('a', { href: 'work.html' }, 'Our Work'),
          ' · ',
          e('a', { href: 'about.html' }, 'About'),
          ' · ',
          e('a', { href: 'contact.html' }, 'Contact'),
          e(
            'span',
            { className: 'site-credit' },
            ' · Website design & development by ',
            e('a', { href: 'https://harringtonit.com', target: '_blank', rel: 'noopener noreferrer' }, 'Harrington IT')
          )
        )
      )
    );
  }

  function mountSharedLayout() {
    let headerRoot = document.getElementById('site-header-root');
    if (!headerRoot) {
      const topbar = document.querySelector('.topbar');
      const header = document.querySelector('.site-header');
      if (topbar && header) {
        headerRoot = document.createElement('div');
        headerRoot.id = 'site-header-root';
        topbar.before(headerRoot);
        topbar.remove();
        header.remove();
      }
    }

    let footerRoot = document.getElementById('site-footer-root');
    if (!footerRoot) {
      const footer = document.querySelector('.footer');
      if (footer) {
        footerRoot = document.createElement('div');
        footerRoot.id = 'site-footer-root';
        footer.before(footerRoot);
        footer.remove();
      }
    }

    if (headerRoot) ReactDOM.createRoot(headerRoot).render(e(SiteHeader));
    if (footerRoot) ReactDOM.createRoot(footerRoot).render(e(SiteFooter));
  }

  mountSharedLayout();
})();
