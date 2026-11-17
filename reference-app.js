const fallbackCatalog = [
  { id: 'demo-rack-lisboa', name: 'Rack Lisboa', category: 'Sala', price: 999.9, old: 'R$ 1.299,90', discount: '-23%', pix: 'R$ 949,90 no PIX', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=700&q=80', badge: 'Mais vendido' },
  { id: 'demo-guarda-roupa-nordico', name: 'Guarda-Roupa Nórdico', category: 'Quarto', price: 1799.9, old: 'R$ 2.199,90', discount: '-18%', pix: 'R$ 1.709,90 no PIX', image: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&w=700&q=80', badge: '' },
  { id: 'demo-mesa-jantar-premium', name: 'Mesa de Jantar Premium', category: 'Sala de Jantar', price: 1199.9, old: 'R$ 1.499,90', discount: '-20%', pix: 'R$ 1.139,90 no PIX', image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=700&q=80', badge: '' },
  { id: 'demo-cama-casal-montana', name: 'Cama Casal Montana', category: 'Quarto', price: 1499.9, old: 'R$ 1.899,90', discount: '-21%', pix: 'R$ 1.424,90 no PIX', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=700&q=80', badge: '' },
  { id: 'demo-comoda-elegance', name: 'Armário de Quarto Elegance', category: 'Quarto', price: 849.9, old: 'R$ 999,90', discount: '-15%', pix: 'R$ 807,90 no PIX', image: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&w=700&q=80', badge: '' },
];

function readLocal(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

let catalog = readLocal('montai.catalog', [...fallbackCatalog]);
let cart = [];
const formatMoney = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function renderProducts() {
  const grid = document.querySelector('#product-grid');
  if (!grid) return;
  grid.innerHTML = catalog.map(product => `
    <article class="product-card">
      <button class="product-photo" style="background-image:url('${escapeHtml(product.image)}')" aria-label="Ver ${escapeHtml(product.name)}">
        ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}
      </button>
      <div class="product-info">
        <p>${escapeHtml(product.name)}</p>
        <span>★★★★★ <span>(clientes Montaí)</span></span>
        <div><small class="old">${escapeHtml(product.old || '')}</small> <small class="discount">${escapeHtml(product.discount || '')}</small></div>
        <strong>${formatMoney(product.price)}</strong>
        <span>ou ${Number(product.installments || 12)}x de ${formatMoney((Number(product.price) * (1 + Number(product.installmentInterest || 0))) / Number(product.installments || 12))}</span>
        <div class="pix">◆ ${escapeHtml(product.pix || '')}</div>
        ${product.sku ? `<small class="product-code">Cód. ${escapeHtml(product.sku)}</small>` : ''}
        <button class="text-link add-product" data-id="${escapeHtml(product.id)}">Comprar</button>
      </div>
    </article>
  `).join('');
  document.querySelectorAll('.add-product').forEach(button => {
    button.addEventListener('click', () => addToCart(catalog.find(product => product.id === button.dataset.id)));
  });
}

async function loadCatalog() {
  const localCatalog = readLocal('montai.catalog', null);
  if (Array.isArray(localCatalog) && localCatalog.length) {
    catalog = localCatalog;
    renderProducts();
  }
  try {
    const response = await fetch('/api/catalog', { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const payload = await response.json();
    if (Array.isArray(payload.products) && payload.products.length) {
      catalog = payload.products;
      renderProducts();
    }
  } catch (_error) {
    // A vitrine sem backend configurado continua usando o catálogo de demonstração.
  }
}

function safeImageUrl(value) {
  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch (_error) {
    return '';
  }
}

function addToCart(product) {
  if (!product) return;
  cart.push(product);
  renderCart();
  openCart();
}

function renderCart() {
  const count = document.querySelector('.badge');
  if (count) count.textContent = cart.length;
  const total = cart.reduce((sum, product) => sum + Number(product.price || 0), 0);
  const totalElement = document.querySelector('#cart-total');
  if (totalElement) totalElement.textContent = formatMoney(total);
  const items = document.querySelector('#cart-items');
  if (items) {
    items.innerHTML = cart.length
      ? cart.map(product => `<div class="cart-item"><img src="${escapeHtml(product.image)}" alt=""><div><p>${escapeHtml(product.name)}</p><span>${formatMoney(product.price)}</span>${product.manufacturer ? `<small class="cart-item-meta">MDF: ${escapeHtml(product.manufacturer)}${product.finish ? ` · ${escapeHtml(product.finish)}` : ''}</small>` : ''}</div></div>`).join('')
      : '<p class="empty-cart">Sua sacola está esperando por você.</p>';
  }
}

function openCart() {
  document.querySelector('.cart-drawer')?.classList.add('open');
  document.querySelector('.overlay')?.classList.add('open');
}

function closeCart() {
  document.querySelector('.cart-drawer')?.classList.remove('open');
  document.querySelector('.overlay')?.classList.remove('open');
}

document.querySelector('.cart-button')?.addEventListener('click', event => { event.preventDefault(); openCart(); });
document.querySelector('.close-cart')?.addEventListener('click', closeCart);
document.querySelector('.overlay')?.addEventListener('click', closeCart);

const navMenus = [...document.querySelectorAll('.nav-menu')];
function closeNavMenus() { navMenus.forEach(menu => { menu.open = false; }); }
navMenus.forEach(menu => {
  menu.addEventListener('toggle', () => {
    if (menu.open) navMenus.filter(other => other !== menu).forEach(other => { other.open = false; });
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNavMenus));
});
document.addEventListener('click', event => {
  if (!event.target.closest('.nav-menu')) closeNavMenus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeNavMenus();
});

const search = document.querySelector('.search input');
search?.addEventListener('input', () => {
  const term = search.value.toLowerCase();
  document.querySelectorAll('.product-card').forEach(card => {
    card.style.display = card.innerText.toLowerCase().includes(term) ? 'block' : 'none';
  });
});

const heroSlides = [...document.querySelectorAll('.hero-slide')];
const heroDots = [...document.querySelectorAll('.hero-carousel .dots button')];
let heroIndex = 0;
let heroTimer;

function showHero(index) {
  heroIndex = (index + heroSlides.length) % heroSlides.length;
  heroSlides.forEach((slide, i) => slide.classList.toggle('is-active', i === heroIndex));
  heroDots.forEach((dot, i) => dot.classList.toggle('is-active', i === heroIndex));
  clearInterval(heroTimer);
  heroTimer = setInterval(() => showHero(heroIndex + 1), 6000);
}

document.querySelector('.hero-prev')?.addEventListener('click', () => showHero(heroIndex - 1));
document.querySelector('.hero-next')?.addEventListener('click', () => showHero(heroIndex + 1));
heroDots.forEach((dot, i) => dot.addEventListener('click', () => showHero(i)));
showHero(0);

let heroTouchStart = 0;
document.querySelector('.hero-carousel')?.addEventListener('touchstart', event => { heroTouchStart = event.changedTouches[0].clientX; }, { passive: true });
document.querySelector('.hero-carousel')?.addEventListener('touchend', event => {
  const delta = event.changedTouches[0].clientX - heroTouchStart;
  if (Math.abs(delta) > 45) showHero(heroIndex + (delta < 0 ? 1 : -1));
}, { passive: true });

const environmentTrack = document.querySelector('#environment-track');
const environmentCards = [...document.querySelectorAll('.environment-card')];
const environmentDots = document.querySelector('#environment-dots');
let environmentIndex = 0;

function environmentVisibleCount() { return window.innerWidth <= 650 ? 2 : window.innerWidth <= 950 ? 3 : 6; }
function renderEnvironmentDots() {
  if (!environmentDots || !environmentCards.length) return;
  const count = Math.max(1, environmentCards.length - environmentVisibleCount() + 1);
  environmentDots.innerHTML = Array.from({ length: count }, (_, index) => `<button class="environment-dot${index === environmentIndex ? ' is-active' : ''}" type="button" aria-label="Ir para ambientes ${index + 1}" data-environment-index="${index}"></button>`).join('');
  environmentDots.querySelectorAll('[data-environment-index]').forEach(dot => dot.addEventListener('click', () => showEnvironment(Number(dot.dataset.environmentIndex))));
}
function showEnvironment(index) {
  const visible = environmentVisibleCount();
  const max = Math.max(0, environmentCards.length - visible);
  environmentIndex = Math.max(0, Math.min(index, max));
  const cardWidth = environmentCards[0]?.getBoundingClientRect().width || 0;
  if (environmentTrack) environmentTrack.style.transform = `translateX(-${environmentIndex * (cardWidth + 12)}px)`;
  renderEnvironmentDots();
}
document.querySelector('#environment-prev')?.addEventListener('click', () => showEnvironment(environmentIndex - 1));
document.querySelector('#environment-next')?.addEventListener('click', () => showEnvironment(environmentIndex + 1));
window.addEventListener('resize', () => showEnvironment(environmentIndex));
showEnvironment(0);

const featuredImage = document.querySelector('#featured-image');
document.querySelectorAll('[data-gallery-image]').forEach(thumb => thumb.addEventListener('click', () => {
  if (featuredImage) featuredImage.src = thumb.dataset.galleryImage;
  document.querySelectorAll('.gallery-thumb').forEach(item => item.classList.toggle('is-active', item === thumb));
}));
const mdfManufacturers = Array.isArray(window.MDF_MANUFACTURERS) ? window.MDF_MANUFACTURERS.filter(item => item.active !== false) : [];
const mdfManufacturerMap = Object.fromEntries(mdfManufacturers.map(item => [item.id, item]));
let selectedFeaturedManufacturer = localStorage.getItem('montai.featuredManufacturer') || 'guararapes';
let selectedFeaturedFinish = localStorage.getItem('montai.featuredFinish') || 'freijo';
function getFeaturedManufacturer() { return mdfManufacturerMap[selectedFeaturedManufacturer] || mdfManufacturers[0]; }
function getFeaturedCatalog() { return getFeaturedManufacturer()?.patterns || []; }
function getFeaturedFinish() { const catalog = getFeaturedCatalog(); return catalog.find(item => item.id === selectedFeaturedFinish) || catalog.find(item => item.id === 'freijo') || catalog[0]; }
function renderManufacturerCards() {
  const container = document.querySelector('#manufacturer-list');
  if (!container) return;
  container.innerHTML = mdfManufacturers.map(manufacturer => `
    <a class="manufacturer-card" href="${escapeHtml(manufacturer.website)}" target="_blank" rel="noopener noreferrer" aria-label="Conhecer ${escapeHtml(manufacturer.name)} no site oficial">
      <span class="manufacturer-card-logo"><img src="${escapeHtml(manufacturer.logo)}" alt="Logo ${escapeHtml(manufacturer.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="manufacturer-wordmark" hidden>${escapeHtml(manufacturer.name)}</span></span>
      <span class="manufacturer-card-footer"><span>${manufacturer.patterns.length ? `${manufacturer.patterns.length} padrões cadastrados` : 'Catálogo a importar'}</span><strong>Site oficial ↗</strong></span>
    </a>
  `).join('');
}
function renderFeaturedManufacturers() {
  const container = document.querySelector('#featured-manufacturer-options');
  if (!container) return;
  container.innerHTML = mdfManufacturers.map(manufacturer => `
    <button class="manufacturer-chip${manufacturer.id === selectedFeaturedManufacturer ? ' is-active' : ''}" type="button" data-featured-manufacturer="${escapeHtml(manufacturer.id)}" role="radio" aria-checked="${manufacturer.id === selectedFeaturedManufacturer ? 'true' : 'false'}" aria-label="${escapeHtml(manufacturer.name)}">
      <img src="${escapeHtml(manufacturer.logo)}" alt="Logo ${escapeHtml(manufacturer.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="manufacturer-wordmark" hidden>${escapeHtml(manufacturer.name)}</span>
    </button>
  `).join('');
  container.querySelectorAll('[data-featured-manufacturer]').forEach(button => button.addEventListener('click', () => selectFeaturedManufacturer(button.dataset.featuredManufacturer)));
  updateFeaturedManufacturerUI();
}
function updateFeaturedManufacturerUI() {
  const manufacturer = getFeaturedManufacturer();
  document.querySelectorAll('[data-featured-manufacturer]').forEach(button => {
    const active = button.dataset.featuredManufacturer === manufacturer?.id;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-checked', active ? 'true' : 'false');
  });
  const status = document.querySelector('#featured-material-status');
  if (status && manufacturer) {
    status.innerHTML = manufacturer.patterns.length
      ? `${manufacturer.patterns.length} padrões cadastrados nesta vitrine.`
      : `Ainda não há padrões cadastrados para ${escapeHtml(manufacturer.name)}. <a href="${escapeHtml(manufacturer.catalogUrl)}" target="_blank" rel="noopener noreferrer">Consultar catálogo oficial ↗</a>`;
  }
}
function selectFeaturedManufacturer(id) {
  if (!mdfManufacturerMap[id]) return;
  selectedFeaturedManufacturer = id;
  selectedFeaturedFinish = getFeaturedCatalog()[0]?.id || '';
  localStorage.setItem('montai.featuredManufacturer', id);
  localStorage.setItem('montai.featuredFinish', selectedFeaturedFinish);
  updateFeaturedManufacturerUI();
  renderFeaturedFinishes();
}
function renderFeaturedFinishes() {
  const container = document.querySelector('#featured-finish-options');
  if (!container) return;
  const catalog = getFeaturedCatalog();
  container.replaceChildren();
  catalog.slice(0, 8).forEach(finish => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'color-swatch';
    button.dataset.finish = finish.id;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-label', finish.name);
    button.setAttribute('aria-checked', finish.id === selectedFeaturedFinish ? 'true' : 'false');
    const image = document.createElement('img');
    image.src = finish.image;
    image.alt = `Textura ${finish.name}`;
    image.loading = 'lazy';
    button.append(image);
    button.addEventListener('click', () => selectFeaturedFinish(finish.id));
    container.append(button);
  });
  if (!catalog.length) {
    const empty = document.createElement('p');
    empty.className = 'material-empty';
    empty.innerHTML = 'Nenhum padrão cadastrado para este fabricante nesta vitrine.';
    container.append(empty);
  }
  updateFeaturedFinishUI();
}
function updateFeaturedFinishUI() {
  const finish = getFeaturedFinish();
  document.querySelectorAll('[data-finish]').forEach(button => {
    const active = button.dataset.finish === finish?.id;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-checked', active ? 'true' : 'false');
  });
  const colorName = document.querySelector('#color-name');
  if (colorName) colorName.textContent = finish ? `${finish.name} · ${finish.line} · ${finish.finish}` : 'Selecione um padrão após consultar o catálogo';
  const configuratorLink = document.querySelector('.featured-cta');
  if (configuratorLink) configuratorLink.href = `configurator.html?manufacturer=${encodeURIComponent(selectedFeaturedManufacturer)}${finish ? `&finish=${encodeURIComponent(finish.id)}` : ''}`;
  const zoom = document.querySelector('#featured-finish-zoom');
  if (zoom) zoom.dataset.image = finish?.image || '';
}
function selectFeaturedFinish(id) {
  if (!getFeaturedCatalog().some(item => item.id === id)) return;
  selectedFeaturedFinish = id;
  localStorage.setItem('montai.featuredFinish', id);
  updateFeaturedFinishUI();
}
document.querySelector('#featured-finish-zoom')?.addEventListener('click', () => {
  const finish = getFeaturedFinish();
  const dialog = document.querySelector('#finish-zoom-dialog');
  const image = document.querySelector('#finish-zoom-image');
  const title = document.querySelector('#finish-zoom-title');
  if (!finish || !dialog || !image) return;
  image.src = finish.image;
  image.alt = `Textura ${finish.name}`;
  if (title) title.textContent = `${finish.name} · ${finish.line} · ${finish.finish}`;
  if (typeof dialog.showModal === 'function') dialog.showModal(); else window.open(finish.image, '_blank', 'noopener');
});
document.querySelector('#finish-zoom-close')?.addEventListener('click', () => document.querySelector('#finish-zoom-dialog')?.close());
document.querySelector('#finish-zoom-dialog')?.addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
renderManufacturerCards();
renderFeaturedManufacturers();
renderFeaturedFinishes();

function applyBanners(banners) {
  const slides = [...document.querySelectorAll('.hero-slide')];
  banners.slice(0, slides.length).forEach((banner, index) => {
    const slide = slides[index];
    const image = safeImageUrl(banner.image_url || banner.image);
    if (image) slide.style.setProperty('--hero-image', `url("${image}")`);
    const tag = slide.querySelector('.tag');
    const title = slide.querySelector('h1');
    const description = slide.querySelector('.hero-content p');
    const links = slide.querySelectorAll('.hero-content a');
    if (tag && banner.eyebrow) tag.textContent = banner.eyebrow;
    if (title && banner.title) title.textContent = banner.title;
    if (description && banner.description) description.textContent = banner.description;
    if (links[0] && banner.primary_label) { links[0].textContent = banner.primary_label; links[0].href = banner.primary_url || '#produtos'; }
    if (links[1] && banner.secondary_label) { links[1].textContent = banner.secondary_label; links[1].href = banner.secondary_url || '#produtos'; }
  });
}

async function loadBanners() {
  const localBanners = readLocal('montai.banners', null);
  if (Array.isArray(localBanners) && localBanners.length) { applyBanners(localBanners); return; }
  try {
    const response = await fetch('/api/cms/banners', { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const payload = await response.json();
      if (Array.isArray(payload.banners) && payload.banners.length) applyBanners(payload.banners);
    }
  } catch (_error) {
    // A vitrine sem CMS configurado mantém os banners do HTML.
  }
}

function applyOffers(offers) {
  offers.slice(0, 4).forEach((offer, index) => {
    const slot = document.querySelector(`[data-offer-slot="${index}"]`);
    if (!slot || !offer.title) return;
    const icon = slot.querySelector('.top-icon');
    slot.textContent = '';
    if (icon) slot.appendChild(icon);
    const code = offer.code ? ` · Use ${offer.code}` : '';
    slot.appendChild(document.createTextNode(` ${offer.title}${code}`));
  });
}

async function loadOffers() {
  const localOffers = readLocal('montai.offers', null);
  if (Array.isArray(localOffers) && localOffers.length) { applyOffers(localOffers); return; }
  try {
    const response = await fetch('/api/cms/offers', { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const payload = await response.json();
      if (Array.isArray(payload.offers) && payload.offers.length) applyOffers(payload.offers);
    }
  } catch (_error) {
    // A vitrine sem CMS configurado mantém as ofertas do HTML.
  }
}

renderProducts();
renderCart();
loadCatalog();
loadBanners();
loadOffers();
