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
    return e('a', {
      className: `brand brand-logo${footer ? ' footer-logo' : ''}`,
      href: 'index.html',
      'aria-label': 'All Things Drywall & Construction home'
    }, e('img', { src: logoUrl, alt: 'All Things Drywall & Construction' }));
  }

  function SiteHeader() {
    const [menuOpen, setMenuOpen] = React.useState(false);
    const activePage = currentPage();
    return e(React.Fragment, null,
      e('div', { className: 'topbar' }, e('div', { className: 'wrap' },
        e('span', null, 'Serving Tri-Cities & the Mid-Columbia'),
        e('a', { href: phoneHref }, `Call ${phoneDisplay}`)
      )),
      e('header', { className: 'site-header' }, e('div', { className: 'wrap nav' },
        e(Brand),
        e('button', {
          className: 'mobile-toggle',
          'aria-label': menuOpen ? 'Close menu' : 'Open menu',
          'aria-expanded': String(menuOpen),
          type: 'button',
          onClick: () => setMenuOpen(open => !open)
        }, '☰'),
        e('nav', { className: `nav-links${menuOpen ? ' open' : ''}`, 'aria-label': 'Primary navigation' },
          ...navItems.map(([href, label]) => e('a', {
            key: href,
            href,
            'aria-current': activePage === href ? 'page' : undefined,
            onClick: () => setMenuOpen(false)
          }, label)),
          e('a', { className: 'btn btn-primary', href: 'contact.html', onClick: () => setMenuOpen(false) }, 'Request an Estimate')
        )
      ))
    );
  }

  function SiteFooter() {
    return e('footer', { className: 'footer' }, e('div', { className: 'wrap' },
      e('div', { className: 'footer-grid' },
        e('div', null, e(Brand, { footer: true }), e('p', null, 'Commercial • Government • Select Residential', e('br'), 'Tri-Cities, Washington')),
        e('div', null, e('strong', null, 'Contact'), e('p', null,
          e('a', { href: phoneHref }, phoneDisplay), e('br'), e('a', { href: `mailto:${email}` }, email)
        )),
        e('div', null, e('strong', null, 'License'), e('p', null, 'ALLTHTD827BH', e('br'), 'Pasco, Washington'))
      ),
      e('div', { className: 'footer-bottom' },
        '© 2026 All Things Drywall & Construction, LLC. · ',
        e('a', { href: 'services.html' }, 'Services'), ' · ',
        e('a', { href: 'work.html' }, 'Our Work'), ' · ',
        e('a', { href: 'about.html' }, 'About'), ' · ',
        e('a', { href: 'contact.html' }, 'Contact'),
        e('span', { className: 'site-credit' }, ' · Website design & development by ',
          e('a', { href: 'https://harringtonit.com', target: '_blank', rel: 'noopener noreferrer' }, 'Harrington IT')
        )
      )
    ));
  }

  function ServiceCard({ image, alt, title, description }) {
    return e('article', { className: 'card' },
      e('img', { src: image, alt, loading: 'lazy' }),
      e('div', { className: 'card-body' }, e('h3', null, title), e('p', null, description))
    );
  }

  function ServiceFeature({ eyebrow, title, description, items }) {
    return e('article', { className: 'service-feature' },
      e('div', null, e('span', { className: 'eyebrow' }, eyebrow), e('h2', null, title), e('p', null, description)),
      e('ul', null, ...items.map(item => e('li', { key: item }, item)))
    );
  }

  function TeamCard({ image, alt, name, description }) {
    return e('article', { className: 'person' },
      e('img', { src: image, alt, loading: 'lazy' }),
      e('div', null, e('h3', null, name), e('p', null, description))
    );
  }

  function CtaSection({ title, description, href, label }) {
    return e('section', { className: 'cta' }, e('div', { className: 'wrap' },
      e('div', null, e('h2', null, title), e('p', null, description)),
      e('a', { className: 'btn btn-primary', href }, label)
    ));
  }

  function replaceWithReactRoot(node, component) {
    if (!node || node.dataset.reactMounted === 'true') return;
    const rootNode = document.createElement(node.tagName.toLowerCase() === 'section' ? 'div' : node.tagName.toLowerCase());
    if (node.id) rootNode.id = node.id;
    rootNode.dataset.reactMounted = 'true';
    node.replaceWith(rootNode);
    ReactDOM.createRoot(rootNode).render(component);
  }

  function mountContentComponents() {
    const expertise = document.querySelector('.expertise');
    if (expertise) {
      const cards = [...expertise.querySelectorAll(':scope > .card')].map(card => ({
        image: card.querySelector('img')?.src || '',
        alt: card.querySelector('img')?.alt || '',
        title: card.querySelector('h3')?.textContent.trim() || '',
        description: card.querySelector('p')?.textContent.trim() || ''
      }));
      if (cards.length) {
        const root = document.createElement('div');
        root.className = 'expertise';
        root.dataset.reactMounted = 'true';
        expertise.replaceWith(root);
        ReactDOM.createRoot(root).render(e(React.Fragment, null, ...cards.map(card => e(ServiceCard, { key: card.title, ...card }))));
      }
    }

    const serviceSections = document.querySelector('.service-sections');
    if (serviceSections) {
      const services = [...serviceSections.querySelectorAll(':scope > .service-feature')].map(section => ({
        eyebrow: section.querySelector('.eyebrow')?.textContent.trim() || '',
        title: section.querySelector('h2')?.textContent.trim() || '',
        description: section.querySelector('p')?.textContent.trim() || '',
        items: [...section.querySelectorAll('li')].map(li => li.textContent.trim())
      }));
      if (services.length) {
        const root = document.createElement('div');
        root.className = 'wrap service-sections';
        root.dataset.reactMounted = 'true';
        serviceSections.replaceWith(root);
        ReactDOM.createRoot(root).render(e(React.Fragment, null, ...services.map(service => e(ServiceFeature, { key: service.title, ...service }))));
      }
    }

    const team = document.querySelector('.team');
    if (team) {
      const people = [...team.querySelectorAll(':scope > .person')].map(person => ({
        image: person.querySelector('img')?.src || '',
        alt: person.querySelector('img')?.alt || '',
        name: person.querySelector('h3')?.textContent.trim() || '',
        description: person.querySelector('p')?.textContent.trim() || ''
      }));
      if (people.length) {
        const root = document.createElement('div');
        root.className = 'team';
        root.dataset.reactMounted = 'true';
        team.replaceWith(root);
        ReactDOM.createRoot(root).render(e(React.Fragment, null, ...people.map(person => e(TeamCard, { key: person.name, ...person }))));
      }
    }

    document.querySelectorAll('section.cta').forEach(section => {
      const button = section.querySelector('a.btn');
      const data = {
        title: section.querySelector('h2')?.textContent.trim() || '',
        description: section.querySelector('p')?.textContent.trim() || '',
        href: button?.getAttribute('href') || 'contact.html',
        label: button?.textContent.trim() || 'Request an Estimate'
      };
      replaceWithReactRoot(section, e(CtaSection, data));
    });
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
    mountContentComponents();
  }

  window.AllThingsDAC = Object.assign(window.AllThingsDAC || {}, {
    ServiceCard,
    ServiceFeature,
    TeamCard,
    CtaSection
  });

  mountSharedLayout();
})();
