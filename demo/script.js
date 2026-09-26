/* ==========================================================
Artisan Atelier Product Finder
Demo v0.1.0
========================================================== */

const DATA_URL = 'products.json';
const EMPTY_VALUE = '—';

const FEATURE_TAG_LIMIT = 14;
const USAGE_TAG_LIMIT = 3;

const COLOR_GROUP_ORDER = [
    'BLACK',
    'WHITE',
    'GRAY',
    'NAVY',
    'BLUE',
    'RED',
    'PINK',
    'PURPLE',
    'GREEN',
    'YELLOW',
    'ORANGE',
    'BROWN',
    'BEIGE',
    'METALLIC',
    'OTHER'
];

const FEATURE_TAG_ORDER = [
    '牛革',
    'ナイロン',
    '帆布',
    'デニム',
    '合成皮革',
    '漁網ナイロン',
    'A4収納',
    'B4収納',
    'ボトル収納',
    'タブレット収納',
    '13-14インチPC収納',
    '15-16インチPC収納',
    '軽量',
    'コンパクト'
];

const USAGE_TAG_ORDER = [
    'ユニセックス',
    'メンズ',
    'レディース'
];

const state = {
    products: [],
    activeProduct: null,
    activeFeatureTags: [],
    activeUsageTags: [],
    activeColorGroups: [],
    featureTagsExpanded: false,
    usageTagsExpanded: false
};

const elements = {
    keyword: document.getElementById('keyword'),
    makerFilter: document.getElementById('makerFilter'),
    categoryFilter: document.getElementById('categoryFilter'),
    seriesFilter: document.getElementById('seriesFilter'),
    minPrice: document.getElementById('minPrice'),
    maxPrice: document.getElementById('maxPrice'),
    featureTags: document.getElementById('featureTags'),
    conditionTags: document.getElementById('conditionTags'),
    colorTags: document.getElementById('colorTags'),
    activeFilters: document.getElementById('activeFilters'),
    sortOrder: document.getElementById('sortOrder'),
    resetFilters: document.getElementById('resetFilters'),
    resultCount: document.getElementById('resultCount'),
    productList: document.getElementById('productList'),
    cardTemplate: document.getElementById('productCardTemplate'),
    modal: document.getElementById('detailModal'),
    modalBody: document.getElementById('modalBody'),
    closeModal: document.getElementById('closeModal'),
    loadingOverlay:
        document.getElementById('loadingOverlay') ||
        document.getElementById('loading')
};

const SEARCH_FIELDS = [
    'maker',
    'code',
    'name',
    'brand',
    'category',
    'series',
    'tags',
    'usageTags',
    'description'
];

function toText(value) {
    if (Array.isArray(value)) {
        return value.join(' ');
    }

    if (value === null || value === undefined) {
        return '';
    }

    return String(value);
}

function formatPrice(price) {
    const number = Number(price);

    if (!Number.isFinite(number)) {
        return EMPTY_VALUE;
    }

    return `¥${number.toLocaleString('ja-JP')}`;
}

function setLoading(isLoading) {
    if (!elements.loadingOverlay) {
        return;
    }

    elements.loadingOverlay.classList.toggle(
        'hidden',
        !isLoading
    );
}

function getSearchText(product) {
    return SEARCH_FIELDS
        .map((field) => toText(product[field]))
        .join(' ')
        .toLocaleLowerCase();
}

function normalizeProducts(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (data && Array.isArray(data.products)) {
        return data.products;
    }

    return [];
}

/* ==========================================================
タグ処理
========================================================== */

function getFeatureTags(product) {
    if (!Array.isArray(product.tags)) {
        return [];
    }

    return product.tags
        .flatMap((tag) => String(tag).split('|'))
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function getUsageTags(product) {
    if (!Array.isArray(product.usageTags)) {
        return [];
    }

    return product.usageTags
        .flatMap((tag) => String(tag).split('|'))
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function getColorGroups(product) {
    const value = product.colorGroup;

    if (Array.isArray(value)) {
        return value
            .flatMap((item) => String(item).split('|'))
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return String(value || '')
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean);
}

function countTags(products, getTagsFunction) {
    const counts = {};

    products.forEach(product => {
        const tags = getTagsFunction(product);

        tags.forEach(tag => {
            if (!tag) return;

            const tagName = String(tag).trim();

            if (!tagName) return;

            counts[tagName] =
                (counts[tagName] || 0) + 1;
        });
    });

    return counts;
}

function sortTagsByPriority(
    tagCounts,
    priorityOrder
) {
    return [...tagCounts].sort((a, b) => {
        const aIndex =
            priorityOrder.indexOf(a.tag);

        const bIndex =
            priorityOrder.indexOf(b.tag);

        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }

        if (aIndex !== -1) {
            return -1;
        }

        if (bIndex !== -1) {
            return 1;
        }

        if (b.count !== a.count) {
            return b.count - a.count;
        }

        return a.tag.localeCompare(b.tag, 'ja');
    });
}

/* ==========================================================
タグ選択
========================================================== */

function toggleFeatureTag(tag) {
    if (state.activeFeatureTags.includes(tag)) {
        state.activeFeatureTags =
            state.activeFeatureTags.filter(
                (selectedTag) => selectedTag !== tag
            );
    } else {
        state.activeFeatureTags.push(tag);
    }

    renderProducts();
}

function toggleUsageTag(tag) {
    if (state.activeUsageTags.includes(tag)) {
        state.activeUsageTags =
            state.activeUsageTags.filter(
                (selectedTag) => selectedTag !== tag
            );
    } else {
        state.activeUsageTags.push(tag);
    }

    renderProducts();
}

function toggleColorGroup(colorGroup) {
    if (state.activeColorGroups.includes(colorGroup)) {
        state.activeColorGroups =
            state.activeColorGroups.filter(
                (selectedColor) =>
                    selectedColor !== colorGroup
            );
    } else {
        state.activeColorGroups.push(colorGroup);
    }

    renderProducts();
}

/* ==========================================================
もっと見るボタン
========================================================== */

function createMoreButton(text, onClick) {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'tag-more-button';
    button.textContent = text;

    button.addEventListener('click', onClick);

    return button;
}

/* ==========================================================
特徴タグ表示
========================================================== */

function renderFeatureTags(products) {
    const container =
        document.getElementById('featureTags');

    if (!container) return;

    const tagCounts =
        countTags(products, getFeatureTags);

    const row1Order = [
        'Artisan限定',
        '牛革',
        'ナイロン',
        '帆布',
        'デニム',
        '合成皮革',
        '漁網ナイロン'
    ];

    const row2Order = [
        'A4収納',
        'B4収納',
        'ボトル収納',
        'タブレット収納',
        '13-14インチPC収納',
        '15-16インチPC収納',
        '軽量',
        'コンパクト',
        '大容量'
    ];

    const row1Tags =
        row1Order.filter(
            tag => tagCounts[tag] !== undefined
        );

    const row2Tags =
        row2Order.filter(
            tag => tagCounts[tag] !== undefined
        );

    const fixedTags =
        [...row1Order, ...row2Order];

    const otherTags =
        Object.keys(tagCounts)
            .filter(
                tag => !fixedTags.includes(tag)
            )
            .sort((a, b) => {
                if (
                    tagCounts[b] !==
                    tagCounts[a]
                ) {
                    return (
                        tagCounts[b] -
                        tagCounts[a]
                    );
                }

                return a.localeCompare(
                    b,
                    'ja'
                );
            });

    container.innerHTML = '';

    const createTagButton = (tag) => {
        const button =
            document.createElement('button');

        button.type = 'button';
        button.className =
            'condition-tag feature-condition-tag';

        if (
            state.activeFeatureTags.includes(tag)
        ) {
            button.classList.add('active');
        }

        button.textContent =
            `${tag} (${tagCounts[tag]})`;

        button.addEventListener(
            'click',
            () => {
                toggleFeatureTag(tag);
            }
        );

        return button;
    };

    row1Tags.forEach(tag => {
        container.appendChild(
            createTagButton(tag)
        );
    });

    const row2 =
        document.createElement('div');

    row2.className =
        'condition-tag-row';

    row2Tags.forEach(tag => {
        row2.appendChild(
            createTagButton(tag)
        );
    });

    container.appendChild(row2);

    if (otherTags.length > 0) {

        if (state.featureTagsExpanded) {

            const otherRow =
                document.createElement('div');

            otherRow.className =
                'condition-tag-row';

            otherTags.forEach(tag => {
                otherRow.appendChild(
                    createTagButton(tag)
                );
            });

            container.appendChild(
                otherRow
            );

            const closeButton =
                createMoreButton(
                    '閉じる',
                    () => {
                        state.featureTagsExpanded =
                            false;

                        renderProducts();
                    }
                );

            const buttonRow =
                document.createElement('div');

            buttonRow.className =
                'condition-tag-row';

            buttonRow.appendChild(
                closeButton
            );

            container.appendChild(
                buttonRow
            );

        } else {

            const moreButton =
                createMoreButton(
                    'その他のタグ',
                    () => {
                        state.featureTagsExpanded =
                            true;

                        renderProducts();
                    }
                );

            const buttonRow =
                document.createElement('div');

            buttonRow.className =
                'condition-tag-row';

            buttonRow.appendChild(
                moreButton
            );

            container.appendChild(
                buttonRow
            );
        }
    }
}

/* ==========================================================
用途タグ表示
========================================================== */

function renderConditionTags(products) {
    const container =
        document.getElementById(
            'conditionTags'
        );

    if (!container) return;

    const tagCounts =
        countTags(products, getUsageTags);

    const mainOrder = [
        'ユニセックス',
        'メンズ',
        'レディース',
        'ビジネス',
        '普段使い',
        'ギフト'
    ];

    const mainTags =
        mainOrder.filter(
            tag =>
                tagCounts[tag] !== undefined
        );

    const otherTags =
        Object.keys(tagCounts)
            .filter(
                tag =>
                    !mainOrder.includes(tag)
            )
            .sort((a, b) => {
                if (
                    tagCounts[b] !==
                    tagCounts[a]
                ) {
                    return (
                        tagCounts[b] -
                        tagCounts[a]
                    );
                }

                return a.localeCompare(
                    b,
                    'ja'
                );
            });

    container.innerHTML = '';

    const createTagButton = (tag) => {
        const button =
            document.createElement('button');

        button.type = 'button';
        button.className =
            'condition-tag usage-condition-tag';

        if (
            state.activeUsageTags.includes(tag)
        ) {
            button.classList.add('active');
        }

        button.textContent =
            `${tag} (${tagCounts[tag]})`;

        button.addEventListener(
            'click',
            () => {
                toggleUsageTag(tag);
            }
        );

        return button;
    };

    const mainRow =
        document.createElement('div');

    mainRow.className =
        'condition-tag-row';

    mainTags.forEach(tag => {
        mainRow.appendChild(
            createTagButton(tag)
        );
    });

    container.appendChild(mainRow);

    if (otherTags.length > 0) {

        if (state.usageTagsExpanded) {

            const otherRow =
                document.createElement('div');

            otherRow.className =
                'condition-tag-row';

            otherTags.forEach(tag => {
                otherRow.appendChild(
                    createTagButton(tag)
                );
            });

            container.appendChild(
                otherRow
            );

            const closeButton =
                createMoreButton(
                    '閉じる',
                    () => {
                        state.usageTagsExpanded =
                            false;

                        renderProducts();
                    }
                );

            const buttonRow =
                document.createElement('div');

            buttonRow.className =
                'condition-tag-row';

            buttonRow.appendChild(
                closeButton
            );

            container.appendChild(
                buttonRow
            );

        } else {

            const moreButton =
                createMoreButton(
                    'その他のタグ',
                    () => {
                        state.usageTagsExpanded =
                            true;

                        renderProducts();
                    }
                );

            const buttonRow =
                document.createElement('div');

            buttonRow.className =
                'condition-tag-row';

            buttonRow.appendChild(
                moreButton
            );

            container.appendChild(
                buttonRow
            );
        }
    }
}

/* ==========================================================
カラータグ表示
========================================================== */

function renderColorTags(products) {
    const container =
        document.getElementById(
            'colorTags'
        );

    if (!container) return;

    const colorCounts =
        countTags(
            products,
            getColorGroups
        );

    container.innerHTML = '';

    const row =
        document.createElement('div');

    row.className =
        'condition-tag-row color-tag-row';

    COLOR_GROUP_ORDER.forEach(
        (colorGroup) => {

            if (
                colorCounts[colorGroup] ===
                undefined
            ) {
                return;
            }

            const button =
                document.createElement('button');

            button.type = 'button';

            button.className =
                `condition-tag color-condition-tag color-${colorGroup.toLowerCase()}`;

            if (
                state.activeColorGroups
                    .includes(colorGroup)
            ) {
                button.classList.add(
                    'active'
                );
            }

            button.textContent =
                `${colorGroup} (${colorCounts[colorGroup]})`;

            button.addEventListener(
                'click',
                () => {
                    toggleColorGroup(
                        colorGroup
                    );
                }
            );

            row.appendChild(button);
        }
    );

    container.appendChild(row);
}

/* ==========================================================
ブランド・カテゴリ・カラー
========================================================== */

function createFilterOptions() {

    const currentMaker =
        elements.makerFilter.value;

    const currentCategory =
        elements.categoryFilter.value;

    const currentSeries =
        elements.seriesFilter.value;

    const makers = [
        ...new Set(
            state.products
                .map((product) =>
                    toText(
                        product.maker
                    ).trim()
                )
                .filter(Boolean)
        )
    ].sort(
        (a, b) =>
            a.localeCompare(b, 'ja')
    );

    const categories = [
        ...new Set(
            state.products
                .map((product) =>
                    toText(
                        product.category
                    ).trim()
                )
                .filter(Boolean)
        )
    ].sort(
        (a, b) =>
            a.localeCompare(b, 'ja')
    );

    const series = [
        ...new Set(
            state.products
                .flatMap((product) =>
                    toText(
                        product.series
                    )
                        .split('|')
                        .map((item) =>
                            item.trim()
                        )
                )
                .filter(Boolean)
        )
    ].sort(
        (a, b) =>
            a.localeCompare(b, 'ja')
    );

    elements.makerFilter.innerHTML =
        '<option value="">すべてのメーカー</option>';

    makers.forEach((maker) => {

        const option =
            document.createElement(
                'option'
            );

        option.value = maker;
        option.textContent = maker;

        elements.makerFilter.appendChild(
            option
        );
    });

    elements.categoryFilter.innerHTML =
        '<option value="">すべてのカテゴリ</option>';

    categories.forEach((category) => {

        const option =
            document.createElement(
                'option'
            );

        option.value = category;
        option.textContent = category;

        elements.categoryFilter.appendChild(
            option
        );
    });

    elements.seriesFilter.innerHTML =
        '<option value="">すべてのシリーズ</option>';

    series.forEach((item) => {

        const option =
            document.createElement(
                'option'
            );

        option.value = item;
        option.textContent = item;

        elements.seriesFilter.appendChild(
            option
        );
    });

    if (makers.includes(currentMaker)) {
        elements.makerFilter.value =
            currentMaker;
    }

    if (
        categories.includes(
            currentCategory
        )
    ) {
        elements.categoryFilter.value =
            currentCategory;
    }

    if (series.includes(currentSeries)) {
        elements.seriesFilter.value =
            currentSeries;
    }
}

/* ==========================================================
商品絞り込み
========================================================== */

function getFilteredProducts() {
    const keyword =
        elements.keyword
            ? elements.keyword.value
                .trim()
                .toLocaleLowerCase()
            : '';

    const maker =
    elements.makerFilter
        ? elements.makerFilter.value
        : '';

    const category =
    elements.categoryFilter
        ? elements.categoryFilter.value
        : '';

    const series =
    elements.seriesFilter
        ? elements.seriesFilter.value
        : '';

    const minPrice =
    elements.minPrice
        ? Number(elements.minPrice.value)
        : 0;

    const maxPrice =
    elements.maxPrice
        ? Number(elements.maxPrice.value)
        : 0;

    const featureTags =
        state.activeFeatureTags;

    const usageTags =
        state.activeUsageTags;

    const colorGroups =
        state.activeColorGroups;

    const sortOrder =
        elements.sortOrder
            ? elements.sortOrder.value
            : 'default';

    let filteredProducts =
        state.products.filter(
            (product) => {

                const productFeatureTags =
                    getFeatureTags(product);

                const productUsageTags =
                    getUsageTags(product);

                const productColorGroups =
                    getColorGroups(product);

                const matchesFeatureTags =
                    featureTags.every(
                        (tag) =>
                            productFeatureTags
                                .includes(tag)
                    );

                const matchesUsageTags =
                    usageTags.every(
                        (tag) =>
                            productUsageTags
                                .includes(tag)
                    );

                const matchesColorGroups =
                    colorGroups.every(
                        (colorGroup) =>
                            productColorGroups
                                .includes(
                                    colorGroup
                                )
                    );

                return (
                    (!maker ||
                       toText(
                                 product.maker
                        ) === maker) &&

                    (!category ||
                       toText(
                                 product.category
                        ) === category) &&

                    (!series ||
                       toText(
                                 product.series
                    )
                                 .split('|')
                                 .map(
                                     (item) =>
                                             item.trim()
                                     )
                                 .includes(series)) &&

                     (
                                 (!minPrice ||
                                   Number(product.price || 0) >= minPrice) &&

                                 (!maxPrice ||
                                   Number(product.price || 0) <= maxPrice)
                     ) &&             

                    (!keyword ||
                        getSearchText(
                            product
                        ).includes(
                            keyword
                        )) &&

                    matchesFeatureTags &&
                    matchesUsageTags &&
                    matchesColorGroups
                );
            }
        );

    switch (sortOrder) {

    case 'maleRecommended':
        filteredProducts =
            filteredProducts.filter(
                (product) =>
                    Boolean(
                        product.maleRecommended
                    )
            );
        break;

    case 'femaleRecommended':
        filteredProducts =
            filteredProducts.filter(
                (product) =>
                    Boolean(
                        product.femaleRecommended
                    )
            );
        break;

    case 'new':
        filteredProducts.sort(
            (a, b) =>
                Number(
                    Boolean(b.isNew)
                ) -
                Number(
                    Boolean(a.isNew)
                )
        );
        break;

    case 'popular':
        filteredProducts.sort(
            (a, b) =>
                Number(
                    Boolean(b.popular)
                ) -
                Number(
                    Boolean(a.popular)
                )
        );
        break;

    case 'priceAsc':
        filteredProducts.sort(
            (a, b) =>
                Number(a.price || 0) -
                Number(b.price || 0)
        );
        break;

    case 'priceDesc':
        filteredProducts.sort(
            (a, b) =>
                Number(b.price || 0) -
                Number(a.price || 0)
        );
        break;

    case 'default':
    default:
        filteredProducts.sort(
            (a, b) =>
                Number(
                    Boolean(
                        b.recommended
                    )
                ) -
                Number(
                    Boolean(
                        a.recommended
                    )
                )
        );
        break;
}

    return filteredProducts;
}

/* ==========================================================
選択中フィルター表示
========================================================== */

function renderActiveFilters() {
    if (!elements.activeFilters) {
        return;
    }

    elements.activeFilters.innerHTML =
        '';

    const filters = [];

    const keyword =
        elements.keyword
            ? elements.keyword.value.trim()
            : '';

    const maker =
    elements.makerFilter
        ? elements.makerFilter.value
        : '';

    const category =
    elements.categoryFilter
        ? elements.categoryFilter.value
        : '';

    const series =
    elements.seriesFilter
        ? elements.seriesFilter.value
        : '';

    if (keyword) {
        filters.push({
            label:
                `キーワード：${keyword}`,
            action: () => {
                elements.keyword.value =
                    '';

                renderProducts();
            }
        });
    }

    if (maker) {
        filters.push({
            label:
                `メーカー：${maker}`,
        action: () => {
                elements.makerFilter.value =
                '';

            renderProducts();
        }
    });
}

    if (category) {
        filters.push({
            label:
                `カテゴリ：${category}`,
            action: () => {
                elements.categoryFilter.value =
                    '';

                renderProducts();
            }
        });
    }

    if (series) {
    filters.push({
        label:
            `シリーズ：${series}`,
        action: () => {
            elements.seriesFilter.value =
                '';

            renderProducts();
        }
    });
}

    state.activeUsageTags.forEach(
        (tag) => {
            filters.push({
                type: 'usage',
                label:
                    `用途：${tag}`,
                action: () => {
                    state.activeUsageTags =
                        state.activeUsageTags.filter(
                            (selectedTag) =>
                                selectedTag !==
                                tag
                        );

                    renderProducts();
                }
            });
        }
    );

    state.activeFeatureTags.forEach(
        (tag) => {
            filters.push({
                type: 'feature',
                label:
                    `特徴：${tag}`,
                action: () => {
                    state.activeFeatureTags =
                        state.activeFeatureTags.filter(
                            (selectedTag) =>
                                selectedTag !==
                                tag
                        );

                    renderProducts();
                }
            });
        }
    );

    state.activeColorGroups.forEach(
        (colorGroup) => {
            filters.push({
                type: 'color',
                label:
                    `カラー：${colorGroup}`,
                action: () => {
                    state.activeColorGroups =
                        state.activeColorGroups.filter(
                            (selectedColor) =>
                                selectedColor !==
                                colorGroup
                        );

                    renderProducts();
                }
            });
        }
    );

    if (filters.length === 0) {
        return;
    }

    const title =
        document.createElement('span');

    title.className =
        'active-filters-title';

    title.textContent =
        '絞り込み中：';

    elements.activeFilters.appendChild(
        title
    );

    filters.forEach((filter) => {

        const button =
            document.createElement('button');

        button.type = 'button';

        button.className =
            'active-filter-tag';

        if (filter.type === 'usage') {
            button.classList.add(
                'usage-filter'
            );
        }

        if (filter.type === 'feature') {
            button.classList.add(
                'feature-filter'
            );
        }

        if (filter.type === 'color') {
            button.classList.add(
                'color-filter'
            );
        }

        button.textContent =
            `${filter.label} ×`;

        button.addEventListener(
            'click',
            filter.action
        );

        elements.activeFilters.appendChild(
            button
        );
    });
}

/* ==========================================================
商品カード
========================================================== */

function createProductCard(product) {
    const card =
        elements.cardTemplate.content
            .firstElementChild
            .cloneNode(true);

    card.dataset.code =
        toText(product.code);

    card.setAttribute(
        'tabindex',
        '0'
    );

    card.setAttribute(
        'aria-label',
        `${toText(product.name)}の商品詳細を開く`
    );

    const badge =
        card.querySelector(
            '.product-badge'
        );

    if (badge) {
        badge.textContent =
            product.recommended
                ? 'おすすめ'
                : '';

        badge.classList.toggle(
            'hidden',
            !product.recommended
        );
    }

    const newBadge =
        card.querySelector(
            '.product-new-badge'
        );

    if (newBadge) {
        newBadge.textContent =
            product.isNew
                ? '新商品'
                : '';

        newBadge.classList.toggle(
            'hidden',
            !product.isNew
        );
    }

    const popularBadge =
        card.querySelector(
            '.product-popular-badge'
        );

    if (popularBadge) {
        popularBadge.textContent =
            product.popular
                ? '人気商品'
                : '';

        popularBadge.classList.toggle(
            'hidden',
            !product.popular
        );
    }

    const stockBadge =
    card.querySelector(
        '.product-stock-badge'
    );

if (stockBadge) {

    const stockStatus =
        toText(product.stock).trim();

    stockBadge.textContent =
        stockStatus;

    stockBadge.classList.remove(
        'hidden',
        'stock-available',
        'stock-out',
        'stock-order',
        'stock-discontinued'
    );

    if (stockStatus === '在庫あり') {
        stockBadge.classList.add(
            'stock-available'
        );
    } else if (stockStatus === '在庫なし') {
        stockBadge.classList.add(
            'stock-out'
        );
    } else if (stockStatus === '取寄せ') {
        stockBadge.classList.add(
            'stock-order'
        );
    } else if (stockStatus === '廃番') {
        stockBadge.classList.add(
            'stock-discontinued'
        );
    } else {
        stockBadge.classList.add(
            'stock-out'
        );
    }
}

    const imageArea =
        card.querySelector(
            '.product-image'
        );

    if (imageArea) {
        imageArea.innerHTML = '';

        const imageUrl =
            toText(product.image).trim();

        if (imageUrl) {
            const image =
                document.createElement(
                    'img'
                );

            image.src = imageUrl;

            image.alt =
                toText(product.name);

            image.loading = 'lazy';

            image.addEventListener(
                'error',
                () => {
                    imageArea.textContent =
                        '画像なし';
                }
            );

            imageArea.appendChild(
                image
            );

        } else {
            imageArea.textContent =
                '画像なし';
        }
    }

    const code =
        card.querySelector(
            '.product-code'
        );

    if (code) {
        code.textContent =
            toText(product.code) ||
            EMPTY_VALUE;
    }

    const name =
        card.querySelector(
            '.product-name'
        );

    if (name) {
        name.textContent =
            toText(product.name) ||
            EMPTY_VALUE;
    }

    const brand =
        card.querySelector(
            '.product-brand'
        );

    if (brand) {
        brand.textContent =
            toText(product.brand) ||
            EMPTY_VALUE;
    }

    const price =
        card.querySelector(
            '.product-price'
        );

    if (price) {
        price.textContent =
            formatPrice(
                product.price
            );
    }

    const usageTagsArea =
        card.querySelector(
            '.product-usage-tags'
        );

    if (usageTagsArea) {
        usageTagsArea.innerHTML = '';

        getUsageTags(product)
            .forEach((tag) => {

                const tagElement =
                    document.createElement(
                        'button'
                    );

                tagElement.type =
                    'button';

                tagElement.className =
                    'usage-tag';

                if (
                    state.activeUsageTags
                        .includes(tag)
                ) {
                    tagElement.classList.add(
                        'selected'
                    );
                }

                tagElement.textContent =
                    tag;

                tagElement.addEventListener(
                    'click',
                    (event) => {

                        event.stopPropagation();

                        if (
                            state.activeUsageTags
                                .includes(tag)
                        ) {

                            state.activeUsageTags =
                                state.activeUsageTags.filter(
                                    (selectedTag) =>
                                        selectedTag !==
                                        tag
                                );

                        } else {

                            state.activeUsageTags
                                .push(tag);
                        }

                        renderProducts();
                    }
                );

                usageTagsArea.appendChild(
                    tagElement
                );
            });
    }

    const featureTagsArea =
        card.querySelector(
            '.product-feature-tags'
        );

    if (featureTagsArea) {
        featureTagsArea.innerHTML = '';

        getFeatureTags(product)
            .forEach((tag) => {

                const tagElement =
                    document.createElement(
                        'button'
                    );

                tagElement.type =
                    'button';

                tagElement.className =
                    'feature-tag';

                if (
                    state.activeFeatureTags
                        .includes(tag)
                ) {
                    tagElement.classList.add(
                        'selected'
                    );
                }

                tagElement.textContent =
                    tag;

                tagElement.addEventListener(
                    'click',
                    (event) => {

                        event.stopPropagation();

                        toggleFeatureTag(
                            tag
                        );
                    }
                );

                featureTagsArea.appendChild(
                    tagElement
                );
            });
    }

    const openDetail = () => {
        openModal(product);
    };

    card.addEventListener(
        'click',
        openDetail
    );

    card.addEventListener(
        'keydown',
        (event) => {

            if (
                event.key === 'Enter' ||
                event.key === ' '
            ) {

                event.preventDefault();

                openDetail();
            }
        }
    );

    return card;
}

/* ==========================================================
商品一覧表示
========================================================== */

function renderProducts() {
    const products =
        getFilteredProducts();

    elements.productList.innerHTML =
        '';

    if (elements.resultCount) {
        elements.resultCount.textContent =
            `${products.length}件の商品`;
    }

    renderActiveFilters();

    renderFeatureTags(products);

    renderConditionTags(products);

    renderColorTags(products);

    if (products.length === 0) {

        const message =
            document.createElement('p');

        message.className =
            'empty-message';

        message.textContent =
            '条件に一致する商品がありません。';

        elements.productList.appendChild(
            message
        );

        return;
    }

    products.forEach((product) => {

        elements.productList.appendChild(
            createProductCard(product)
        );
    });
}

/* ==========================================================
商品詳細モーダル
========================================================== */

function createDetailRow(
    label,
    value
) {

    const fragment =
        document.createDocumentFragment();

    const dt =
        document.createElement('dt');

    dt.className =
        'detail-label';

    dt.textContent =
        label;

    const dd =
        document.createElement('dd');

    dd.className =
        'detail-value';

    const isTagField =
        label === '特徴タグ' ||
        label === '用途タグ';

    const values =
        Array.isArray(value)
            ? value
                .flatMap((item) =>
                    String(item)
                        .split('|')
                )
                .map((item) =>
                    item.trim()
                )
                .filter(Boolean)

            : [toText(value).trim()]
                .filter(Boolean);

    if (values.length === 0) {

        const empty =
            document.createElement(
                'span'
            );

        empty.className =
            'detail-empty';

        empty.textContent =
            EMPTY_VALUE;

        dd.appendChild(empty);

    } else if (isTagField) {

        values.forEach((item) => {

            const tag =
                document.createElement(
                    'span'
                );

            tag.className =
                'detail-tag';

            tag.textContent =
                item;

            dd.appendChild(tag);
        });

    } else {

        dd.textContent =
            values.join('、');
    }

    fragment.appendChild(dt);
    fragment.appendChild(dd);

    return fragment;
}

function openModal(product) {
    state.activeProduct =
        product;

    elements.modalBody.innerHTML =
        '';

    const title =
        document.createElement(
            'h2'
        );

    title.className =
        'modal-title';

    title.textContent =
        toText(product.name) ||
        EMPTY_VALUE;

    elements.modalBody.appendChild(
        title
    );

    const detailList =
        document.createElement(
            'dl'
        );

    detailList.className =
        'detail-list';

    const details = [
        ['メーカー', product.maker],
        ['品番', product.code],
        ['ブランド', product.brand],
        ['カテゴリ', product.category],
        ['サブカテゴリ', product.subCategory],
        ['シリーズ', product.series],
        ['価格', formatPrice(product.price)],
        ['色', product.color],
        ['カラー系統', product.colorGroup],
        ['素材', product.material],
        ['サイズ', product.size],
        ['重量', product.weight],
        ['商品説明', product.description],
        ['特徴タグ', product.tags],
        ['用途タグ', product.usageTags]
    ];

    details.forEach(
        ([label, value]) => {

            detailList.appendChild(
                createDetailRow(
                    label,
                    value
                )
            );
        }
    );

    elements.modalBody.appendChild(
        detailList
    );

    const productUrl =
        toText(product.url).trim();

    if (productUrl) {

        const urlButton =
            document.createElement(
                'a'
            );

        urlButton.className =
            'product-url-button';

        urlButton.href =
            productUrl;

        urlButton.target =
            '_blank';

        urlButton.rel =
            'noopener noreferrer';

        urlButton.textContent =
            '商品ページを開く';

        elements.modalBody.appendChild(
            urlButton
        );
    }

    elements.modal.classList.remove(
        'hidden'
    );

    document.body.style.overflow =
        'hidden';
}

function closeModal() {
    elements.modal.classList.add(
        'hidden'
    );

    document.body.style.overflow =
        '';

    state.activeProduct =
        null;
}

/* ==========================================================
商品データ読み込み
========================================================== */

async function loadProducts() {
    setLoading(true);

    try {

        const response =
            await fetch(
                DATA_URL,
                {
                    cache: 'no-store'
                }
            );

        if (!response.ok) {
            throw new Error(
                `商品データの取得に失敗しました：${response.status}`
            );
        }

        const data =
            await response.json();

        state.products =
            normalizeProducts(data);

        createFilterOptions();

        renderProducts();

    } catch (error) {

        console.error(error);

        elements.productList.innerHTML =
            '';

        const errorMessage =
            document.createElement(
                'p'
            );

        errorMessage.className =
            'error-message';

        errorMessage.textContent =
            '商品データを読み込めませんでした。products.json を確認してください。';

        elements.productList.appendChild(
            errorMessage
        );

        if (elements.resultCount) {
            elements.resultCount.textContent =
                '0件の商品';
        }

    } finally {

        setLoading(false);
    }
}

/* ==========================================================
イベント
========================================================== */

elements.keyword.addEventListener(
    'input',
    renderProducts
);

elements.makerFilter.addEventListener(
    'change',
    renderProducts
);

elements.categoryFilter.addEventListener(
    'change',
    renderProducts
);

elements.seriesFilter.addEventListener(
    'change',
    renderProducts
);

if (elements.colorFilter) {
    elements.colorFilter.addEventListener(
        'change',
        renderProducts
    );
}

if (elements.sortOrder) {
    elements.sortOrder.addEventListener(
        'change',
        renderProducts
    );
}

if (elements.minPrice) {
    elements.minPrice.addEventListener(
        'input',
        renderProducts
    );
}

if (elements.maxPrice) {
    elements.maxPrice.addEventListener(
        'input',
        renderProducts
    );
}

if (elements.resetFilters) {

    elements.resetFilters.addEventListener(
        'click',
        () => {

            // フリーワード
            if (elements.keyword) {
                elements.keyword.value = '';
            }

            // メーカー
            if (elements.makerFilter) {
                elements.makerFilter.value = '';
            }

            // カテゴリ
            if (elements.categoryFilter) {
                elements.categoryFilter.value = '';
            }

            // シリーズ
            if (elements.seriesFilter) {
                elements.seriesFilter.value = '';
            }

            // 今後追加する価格範囲もここでリセット
            if (elements.minPrice) {
                elements.minPrice.value = '';
            }

            if (elements.maxPrice) {
                elements.maxPrice.value = '';
            }

            // 用途・特徴・カラータグ
            state.activeFeatureTags = [];
            state.activeUsageTags = [];
            state.activeColorGroups = [];

            // タグの「もっと見る」状態も初期化
            state.featureTagsExpanded = false;
            state.usageTagsExpanded = false;

            // 並び順
            if (elements.sortOrder) {
                elements.sortOrder.value = 'default';
            }

            renderProducts();
        }
    );
}

elements.closeModal.addEventListener(
    'click',
    closeModal
);

elements.modal.addEventListener(
    'click',
    (event) => {

        if (
            event.target ===
            elements.modal
        ) {
            closeModal();
        }
    }
);

document.addEventListener(
    'keydown',
    (event) => {

        if (
            event.key === 'Escape' &&
            !elements.modal.classList.contains(
                'hidden'
            )
        ) {
            closeModal();
        }
    }
);

/* ==========================================================
起動
========================================================== */

loadProducts();
