/* ==========================================================
   Artisan Atelier Product Finder
   Demo v0.1.0
   JSON data can be replaced with a GAS endpoint when migrated.
========================================================== */

const DATA_URL = 'products.json';
const EMPTY_VALUE = '—';

const state = {
    products: [],
    activeProduct: null
};

const elements = {
    keyword: document.getElementById('keyword'),
    brandFilter: document.getElementById('brandFilter'),
    categoryFilter: document.getElementById('categoryFilter'),
    resultCount: document.getElementById('resultCount'),
    productList: document.getElementById('productList'),
    cardTemplate: document.getElementById('productCardTemplate'),
    modal: document.getElementById('detailModal'),
    modalBody: document.getElementById('modalBody'),
    closeModal: document.getElementById('closeModal'),
    loading: document.getElementById('loading')
};

const SEARCH_FIELDS = [
    'maker', 'code', 'name', 'brand', 'category', 'series',
    'tags', 'usageTags', 'description'
];

/** Start the application after the DOM is available. */
async function initialize() {
    bindEvents();
    setLoading(true);

    try {
        state.products = await fetchProducts();
        populateFilters(state.products);
        renderProducts();
    } catch (error) {
        console.error('Failed to load products:', error);
        showError('商品データを読み込めませんでした。ページを再読み込みしてください。');
    } finally {
        setLoading(false);
    }
}

/** Fetch and validate the local JSON array. */
async function fetchProducts() {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
        throw new Error('Product data must be an array.');
    }

    return data.filter((product) => product && typeof product === 'object');
}

/** Attach UI event handlers. */
function bindEvents() {
    elements.keyword.addEventListener('input', renderProducts);
    elements.brandFilter.addEventListener('change', renderProducts);
    elements.categoryFilter.addEventListener('change', renderProducts);
    elements.closeModal.addEventListener('click', closeModal);
    elements.modal.addEventListener('click', (event) => {
        if (event.target === elements.modal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeModal();
    });
}

/** Add sorted, non-empty brand and category options. */
function populateFilters(products) {
    populateSelect(elements.brandFilter, products.map((product) => product.brand));
    populateSelect(elements.categoryFilter, products.map((product) => product.category));
}

function populateSelect(select, values) {
    const uniqueValues = [...new Set(values.map(toText).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'ja'));

    uniqueValues.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.append(option);
    });
}

/** Render cards matching the current keyword and filter selections. */
function renderProducts() {
    const products = getFilteredProducts();
    elements.productList.replaceChildren();
    elements.resultCount.textContent = `${products.length}件`;

    if (!products.length) {
        showEmptyMessage('条件に一致する商品はありません。');
        return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach((product) => fragment.append(createProductCard(product)));
    elements.productList.append(fragment);
}

/** Return products matching all selected conditions. */
function getFilteredProducts() {
    const keyword = elements.keyword.value.trim().toLocaleLowerCase();
    const brand = elements.brandFilter.value;
    const category = elements.categoryFilter.value;

    return state.products.filter((product) => {
        return (!brand || toText(product.brand) === brand)
            && (!category || toText(product.category) === category)
            && (!keyword || getSearchText(product).includes(keyword));
    });
}

function getSearchText(product) {
    return SEARCH_FIELDS.map((field) => toText(product[field]))
        .join(' ')
        .toLocaleLowerCase();
}

/** Create an accessible card from the HTML template. */
function createProductCard(product) {
    const card = elements.cardTemplate.content.firstElementChild.cloneNode(true);
    const imageArea = card.querySelector('.product-image');

    card.querySelector('.product-code').textContent = toDisplayText(product.code);
    card.querySelector('.product-name').textContent = toDisplayText(product.name);
    card.querySelector('.product-brand').textContent = toDisplayText(product.brand);
    card.querySelector('.product-price').textContent = formatPrice(product.price);
    card.setAttribute('aria-label', `${toDisplayText(product.name)}の詳細を表示`);
    setProductImage(imageArea, product.image, product.name);
    card.addEventListener('click', () => openModal(product));
    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openModal(product);
        }
    });

    return card;
}

/** Display an image or a safe No Image placeholder. */
function setProductImage(container, imageUrl, altText) {
    const url = toText(imageUrl);
    if (!url || url === '-') {
        container.textContent = 'No Image';
        return;
    }

    const image = document.createElement('img');
    image.src = url;
    image.alt = toDisplayText(altText);
    image.addEventListener('error', () => {
        container.replaceChildren('No Image');
    }, { once: true });
    container.append(image);
}

/** Fill and show the detail modal. */
function openModal(product) {
    state.activeProduct = product;
    elements.modalBody.replaceChildren();

    const title = document.createElement('h2');
    title.id = 'modalTitle';
    title.className = 'modal-title';
    title.textContent = toDisplayText(product.name);

    const details = document.createElement('dl');
    details.className = 'detail-list';
    const fields = [
        ['メーカー', 'maker'], ['品番', 'code'], ['商品名', 'name'], ['ブランド', 'brand'],
        ['カテゴリ', 'category'], ['シリーズ', 'series'], ['カラー', 'color'], ['素材', 'material'],
        ['サイズ', 'size'], ['重量', 'weight'], ['商品説明', 'description'], ['価格', 'price']
    ];

    fields.forEach(([label, key]) => appendDetailField(details, label, key === 'price'
        ? formatPrice(product[key])
        : toDisplayText(product[key])));

    elements.modalBody.append(title, details);
    appendProductUrl(product.url);
    elements.modal.classList.remove('hidden');
    elements.closeModal.focus();
}

function appendDetailField(list, label, value) {
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    list.append(term, description);
}

/** Add the external product link only when a usable URL exists. */
function appendProductUrl(url) {
    const value = toText(url);
    appendDetailField(document.querySelector('.detail-list'), '商品URL', value || EMPTY_VALUE);

    if (!isHttpUrl(value)) return;

    const link = document.createElement('a');
    link.className = 'product-url-button';
    link.href = value;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '商品ページを開く';
    elements.modalBody.append(link);
}

function closeModal() {
    if (elements.modal.classList.contains('hidden')) return;
    elements.modal.classList.add('hidden');
    state.activeProduct = null;
}

function formatPrice(value) {
    if (!toText(value)) return EMPTY_VALUE;
    const price = Number(value);
    return Number.isFinite(price) ? `¥${price.toLocaleString('ja-JP')}` : EMPTY_VALUE;
}

/** Convert scalar and array data safely for display and search. */
function toText(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join(' / ');
    return value === null || value === undefined ? '' : String(value).trim();
}

function toDisplayText(value) {
    return toText(value) || EMPTY_VALUE;
}

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_error) {
        return false;
    }
}

function setLoading(isLoading) {
    elements.loading.classList.toggle('hidden', !isLoading);
}

function showEmptyMessage(message) {
    const element = document.createElement('p');
    element.className = 'empty-message';
    element.textContent = message;
    elements.productList.append(element);
}

function showError(message) {
    elements.productList.replaceChildren();
    elements.resultCount.textContent = '0件';
    const element = document.createElement('p');
    element.className = 'error-message';
    element.textContent = message;
    elements.productList.append(element);
}

initialize();
