// FRONTEND: runs in the visitor's browser and talks to the Express API.
document.documentElement.classList.add('js');
document.querySelector('#year').textContent = new Date().getFullYear();

// ---------- 4C tabs ----------
const tabs = [...document.querySelectorAll('[role="tab"]')];

function selectTab(tab) {
  for (const other of tabs) {
    const selected = other === tab;
    other.setAttribute('aria-selected', selected);
    other.tabIndex = selected ? 0 : -1; // Only the active tab is in the Tab order; arrows move between tabs.
    document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
  }
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    // In a right-to-left page, ArrowLeft means "next".
    const step = { ArrowLeft: 1, ArrowRight: -1 }[event.key];
    if (!step) return;
    const next = tabs[(index + step + tabs.length) % tabs.length];
    selectTab(next);
    next.focus();
  });
});

// ---------- Carat slider ----------
// Approximate diameter (mm) of a well-cut round brilliant at each weight.
const CARATS = [[0.25, 4.1], [0.5, 5.1], [0.75, 5.8], [1, 6.4], [1.5, 7.4], [2, 8.1], [3, 9.3]];
const PX_PER_MM = 16;
const caratRange = document.querySelector('#carat-range');
const caratStone = document.querySelector('#carat-stone');

function updateCarat() {
  const [carat, mm] = CARATS[caratRange.value];
  const size = `${mm * PX_PER_MM}px`;
  caratStone.style.width = size;
  caratStone.style.height = size;
  document.querySelector('#carat-value').textContent = carat.toFixed(2);
  document.querySelector('#carat-mm').textContent = mm;
  caratRange.setAttribute('aria-valuetext', `${carat} קראט, ${mm} מילימטר`);
}
caratRange.addEventListener('input', updateCarat);
updateCarat();

// ---------- Inquiry form ----------
const form = document.querySelector('#inquiry-form');
const button = document.querySelector('#submit-btn');
const formMessage = document.querySelector('#form-message');
const interestSelect = document.querySelector('#interest');

// Clicking a collection card pre-selects that interest in the form.
document.querySelectorAll('[data-interest]').forEach(card => {
  card.addEventListener('click', () => { interestSelect.value = card.dataset.interest; });
});

// Same rules as the server. Here they give a quick, friendly message; the server is what actually enforces them.
const PHONE = /^[0-9+\-\s()]{9,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RULES = [
  ['name', value => value.length >= 2 && value.length <= 60, 'נא להזין שם מלא.'],
  ['contact', value => PHONE.test(value) || EMAIL.test(value), 'נא להזין מספר טלפון או כתובת אימייל תקינים.'],
  ['interest', value => value !== '', 'נא לבחור מה מעניין אתכם.']
];

function showMessage(text, isError) {
  formMessage.textContent = text;
  formMessage.className = isError ? 'error' : '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  for (const key in data) data[key] = data[key].trim();

  for (const field of form.querySelectorAll('[aria-invalid]')) field.removeAttribute('aria-invalid');
  const failed = RULES.find(([key, isValid]) => !isValid(data[key]));
  if (failed) {
    const [key, , text] = failed;
    const input = form.elements[key];
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return showMessage(text, true);
  }

  button.disabled = true;
  showMessage('שולחים...');
  try {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (response.status === 429) throw new Error('rate-limit');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    form.reset();
    showMessage(`תודה, ${result.name}. קיבלנו את הפנייה ונחזור אליכם בהקדם.`);
  } catch (error) {
    showMessage(error.message === 'rate-limit'
      ? 'נשלחו יותר מדי פניות. נסו שוב בעוד כמה דקות.'
      : 'משהו השתבש בשליחה. נסו שוב בעוד רגע.', true);
    console.error(error);
  } finally {
    button.disabled = false;
  }
});

// ---------- Products ----------
// The list lives in /products.json. To add a piece: put its photos in /images/products/ and add an entry there.
const productList = document.querySelector('#products');
const detailsField = document.querySelector('#details');
// Which form option each product category pre-selects.
const CATEGORY_INTEREST = { rings: 'engagement', earrings: 'earrings', bracelets: 'bracelet', necklaces: 'necklace' };

// Built with createElement + textContent (not innerHTML), so text from the JSON can never inject HTML.
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function productCard(product, index) {
  const card = element('li', 'product reveal');
  card.dataset.category = product.category;
  card.style.setProperty('--i', index % 3);

  const media = element('div', 'product-media');
  const image = element('img');
  image.src = `/images/products/${product.images[0]}`;
  image.alt = product.name;
  image.loading = 'lazy';
  media.append(image);

  // More than one photo: small dots switch between them.
  if (product.images.length > 1) {
    const dots = element('div', 'product-dots');
    product.images.forEach((file, photoIndex) => {
      const dot = element('button', 'product-dot');
      dot.type = 'button';
      dot.setAttribute('aria-label', `${product.name}, תמונה ${photoIndex + 1} מתוך ${product.images.length}`);
      dot.setAttribute('aria-pressed', photoIndex === 0);
      dot.addEventListener('click', () => {
        image.src = `/images/products/${file}`;
        for (const other of dots.children) other.setAttribute('aria-pressed', other === dot);
      });
      dots.append(dot);
    });
    media.append(dots);
  }

  const link = element('a', 'item-link', 'לתיאום פגישה ←');
  link.href = '#contact';
  // Pre-fill the form so we know which piece the visitor asked about.
  link.addEventListener('click', () => {
    interestSelect.value = CATEGORY_INTEREST[product.category] || 'other';
    if (!detailsField.value.trim()) detailsField.value = `מתעניינים ב: ${product.name}`;
  });

  card.append(media, element('h3', '', product.name), element('p', '', product.description), link);
  return card;
}

fetch('/products.json')
  .then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(products => {
    products.forEach((product, index) => {
      const card = productCard(product, index);
      productList.append(card);
      observer.observe(card);
    });
  })
  .catch(error => console.error('Could not load products:', error));

const filters = [...document.querySelectorAll('.filter')];
for (const filter of filters) {
  filter.addEventListener('click', () => {
    for (const other of filters) other.setAttribute('aria-pressed', other === filter);
    for (const card of productList.children) {
      card.hidden = filter.dataset.filter !== 'all' && card.dataset.category !== filter.dataset.filter;
    }
  });
}

// ---------- Scroll reveal ----------
// Cards in the same group get an index (--i) so CSS can delay each one a little more than the last.
// "% 3" restarts the count every three cards, so on a phone (one card per row) nobody waits too long.
for (const group of document.querySelectorAll('.collection, .shapes, .tips, .steps')) {
  [...group.children].forEach((child, index) => child.style.setProperty('--i', index % 3));
}

// Let CSS "draw" the gold icons: with pathLength="1", every outline counts as length 1, whatever its real size.
document.querySelectorAll('.item-icon *, .shape svg *').forEach(shape => shape.setAttribute('pathLength', '1'));

// IntersectionObserver tells us when an element enters the screen. Cheaper than listening to every scroll event.
// rootMargin -10% at the bottom waits until the element is a bit inside the screen, so you see it happen.
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }
}, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.reveal').forEach(element => observer.observe(element));

// Parallax: the hero image moves slower than the page and fades out, which adds depth.
const heroMedia = document.querySelector('.hero-media');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let frameRequested = false;
window.addEventListener('scroll', () => {
  if (frameRequested || reduceMotion.matches) return;
  // Scroll fires many times per frame. requestAnimationFrame updates at most once per screen refresh.
  frameRequested = true;
  requestAnimationFrame(() => {
    const y = Math.min(window.scrollY, window.innerHeight);
    heroMedia.style.transform = `translateY(${y * 0.35}px)`;
    heroMedia.style.opacity = 1 - (y / window.innerHeight) * 0.8;
    frameRequested = false;
  });
}, { passive: true }); // passive: we never block scrolling, so the browser can scroll smoothly.

// Show the small logo in the top bar only after the big hero logo has scrolled away.
new IntersectionObserver(([entry]) => {
  document.body.classList.toggle('past-hero', !entry.isIntersecting);
}, { threshold: 0.25 }).observe(document.querySelector('.hero-media'));
