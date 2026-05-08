/* ──────────────────────────────────────────────────────────
   ZKTest · v2 (modern rebuild)
   ────────────────────────────────────────────────────────── */

(() => {
'use strict';

// ── State ──────────────────────────────────────────────────
const state = {
    manifest: null,
    folders: [],
    selectedFolder: null,
    pendingFolderId: null,

    // Quiz mode
    quiz: {
        questions: [],
        index: 0,
        score: 0,
        results: []
    },

    // Flashcards mode (test-based)
    fc: {
        deck: [],          // queue of items
        seen: 0,
        known: 0,
        total: 0,
        current: null,
        flipped: false
    },

    // Trainer (per-material custom flashcards)
    trainer: {
        materialId: null,
        materialTitle: '',
        items: [],         // { id, q, a }
        editingId: null,
        // study sub-state
        deck: [],
        current: null,
        flipped: false,
        seen: 0,
        known: 0,
        total: 0
    }
};

const STORAGE = {
    THEME:        'zktest_theme',
    SESSION:      (id) => `zktest_session_${id}`,
    TRAINER:      (id) => `zktest_trainer_${id}`
};

// ── Materials definition ───────────────────────────────────
const MATERIALS = [
    {
        id: 'mat_test_zamk',
        title: 'Testowe zamknięte',
        desc: 'Pytania zamknięte z odpowiedziami.',
        pdf: 'materials/Testowe zamknięte.pdf'
    },
    {
        id: 'mat_ustne',
        title: 'Ustne',
        desc: 'Materiały do egzaminu ustnego.',
        pdf: 'materials/Ustne.pdf',
        starterTrainer: [
            { q: 'Czym jest WIT i kto go wydaje w Polsce?', a: 'Wiążąca Informacja Taryfowa — decyzja organu celnego dotycząca taryfikacji towaru. W Polsce wydaje ją Dyrektor Krajowej Informacji Skarbowej.' },
            { q: 'Wymień ogólne zasady pochodzenia preferencyjnego.', a: 'Zasada bezpośredniego transportu, tożsamości, terytorialności oraz dokumentowania pochodzenia.' },
            { q: 'Z czego zbudowana jest nomenklatura taryfowa?', a: 'Z sekcji, działów, pozycji i podpozycji. Pozycja HS = 4 cyfry, kod CN = 8 cyfr.' },
            { q: 'Co stanowi podstawę obliczenia cła?', a: 'Wartość celna towaru (z reguły wartość transakcyjna z dodatkami i wyłączeniami z UKC).' },
            { q: 'Jaka jest podstawowa metoda ustalania wartości celnej?', a: 'Metoda wartości transakcyjnej — cena faktycznie zapłacona lub należna za towar, z określonymi korektami.' },
            { q: 'W jakim terminie wnosi się odwołanie od decyzji w zakresie prawa celnego?', a: '14 dni od dnia doręczenia decyzji stronie.' },
            { q: 'Wymień finansowe organy postępowania przygotowawczego w sprawach KKS.', a: 'M.in. Naczelnik Urzędu Celno-Skarbowego oraz Szef KAS i Dyrektor IAS w określonych sprawach. Straż Graniczna nim NIE jest.' },
            { q: 'Co to jest REX?', a: 'System zarejestrowanych eksporterów m.in. w ramach Ogólnego Systemu Preferencji (GSP).' }
        ]
    },
    {
        id: 'mat_taryfikacja',
        title: 'Taryfikacja - Prosto',
        desc: 'Zasady klasyfikacji taryfowej.',
        pdf: 'materials/TARYFIKACJA - Prosto.pdf'
    },
    {
        id: 'mat_baza_opisowych',
        title: 'Baza opisowych - wszystko',
        desc: 'Pełna baza pytań opisowych.',
        pdf: 'materials/BAZA-OPISOWYCH-WSZYSTKO.pdf'
    },
    {
        id: 'mat_pochodzenie',
        title: 'Pochodzenie',
        desc: 'Pochodzenie towarów i preferencje.',
        pdf: 'materials/Pochodzenie.pdf'
    },
    {
        id: 'mat_skrocony',
        title: 'Skrócony skrypt',
        desc: 'Najważniejsze definicje w pigułce.',
        pdf: 'materials/Skrócony skrypt .pdf'
    }
];

// ── Special tests data (lazy — content defined at bottom) ─
function buildSpecialTestsData() {
    return [
        { id: 'sp_procedury',   title: 'Procedury celne',       files: [{ name: 'Procedury celne.txt',       content: SP_CONTENT.procedury }]},
        { id: 'sp_pochodzenie', title: 'Pochodzenie towarów',   files: [{ name: 'Pochodzenie towarów.txt',   content: SP_CONTENT.pochodzenie }]},
        { id: 'sp_taryfa',      title: 'Nomenklatura taryfowa', files: [{ name: 'Nomenklatura taryfowa.txt', content: SP_CONTENT.taryfa }]},
        { id: 'sp_wartosc',     title: 'Wartość celna',         files: [{ name: 'Wartość celna.txt',         content: SP_CONTENT.wartosc }]},
        { id: 'sp_kks',         title: 'Test KKS',              files: [{ name: 'KKS.txt',                   content: SP_CONTENT.kks }]}
    ];
}

// ── External links data (unchanged) ───────────────────────
const EXTERNAL_LINKS = [
    { category: 'Podatki i prawo podatkowe', links: [
        { title: 'System podatkowy - test',         url: 'https://docs.google.com/forms/d/e/1FAIpQLSdnC0eIeiGGS8WB6bIuvL2vjaldRbLj0MQm3QXEqAXFabOHtQ/viewform' },
        { title: 'Podatki 1',                       url: 'https://docs.google.com/forms/d/e/1FAIpQLSc7gzAz6A0xhI_qOtuH_49K8_srYu5F4UBB3jfekf8JS1cnPw/viewform' },
        { title: 'Podatki 2',                       url: 'https://docs.google.com/forms/d/e/1FAIpQLSemqr5ZoDMlyAoExbtPdFLzM4mkr65g4MKDbAF6AYjO3PnKWw/viewform' },
        { title: 'Prawo Podatkowe zbiór z kartek',  url: 'https://docs.google.com/forms/d/e/1FAIpQLScYY3FVX2oJrh7WjhbDOkXELepED9pGhtl9eAcivrWMM2l-FQ/viewform' }
    ]},
    { category: 'Karny i KKS', links: [
        { title: 'Karny',                url: 'https://docs.google.com/forms/d/e/1FAIpQLSfrrhE6z5ftwFCIDBiU3ILtl0m-GYs2ZEbfP2W3FpzP_CKbGQ/viewform' },
        { title: 'ZKZ Test 2',           url: 'https://docs.google.com/forms/d/e/1FAIpQLSc18ILi74wkbRQUQVbu_DvjXq8rZnRcdDGM1ibev5IWfjJgZQ/viewform' },
        { title: 'ZKZ TEST 3',           url: 'https://docs.google.com/forms/d/e/1FAIpQLSd0izfPsMr5wG9eZXRFQZNaBibqD3V_SEbrI4xkNUOhfwXHyA/viewform' },
        { title: 'ZKZ TEST 4',           url: 'https://docs.google.com/forms/d/e/1FAIpQLSfnvWngpXliewjznj_U_0-HIfBKlsAl-tMpgfYLKi3PeLmP5g/viewform' },
        { title: 'TEST 2 (02/2025)',     url: 'https://docs.google.com/forms/d/e/1FAIpQLSfDvLvGWCMz3ikF7ZlwzPoIqfy6EJgPeL77fWj3w6EtMRZPvQ/viewform' },
        { title: 'TEST 4',               url: 'https://docs.google.com/forms/d/e/1FAIpQLSfqj6HsqC-zTZCcnIt8jQ5EO_TRa44VRENBeqB9AZzKIsajKg/viewform' },
        { title: 'ZKZ TEST 6',           url: 'https://docs.google.com/forms/d/e/1FAIpQLSccQszO4BqBzhV14_GWLhsM-xu9zPvCt3k1nxzniTK9yVJG9Q/viewform' },
        { title: 'TEST 7',               url: 'https://docs.google.com/forms/d/e/1FAIpQLSeG8FCoJL-41cVH5eEe6N4RPKfshlTKE9mcV_hQIQXXgFBKhg/viewform' },
        { title: 'TEST 9',               url: 'https://docs.google.com/forms/d/e/1FAIpQLSflah2TsDHh_KpG3pC18-m1rT8smxXK6GjUlgEZ9KmNQXZcPA/viewform' },
        { title: 'ZKZ TEST 10',          url: 'https://docs.google.com/forms/d/e/1FAIpQLSfSD7ByYEeVvRpmnIlRGAX-mpA9AAy9e0McJVmcfR7_GDrJTw/viewform' },
        { title: 'ZKZ TEST 11',          url: 'https://docs.google.com/forms/d/e/1FAIpQLSchEhGDlnxd9X7QRYz29sNb0SAVViB8RAVEmYNfccLSSbwjzQ/viewform' },
        { title: 'ZKZ TEST Podsumowanie',url: 'https://docs.google.com/forms/d/e/1FAIpQLSdBH-D85ZXNrqc9JWlXl2WuO2Oztyq7GlOT-6cC7TQqop5RIg/viewform' },
        { title: 'KKS',                  url: 'https://docs.google.com/forms/d/e/1FAIpQLSdn3HSfEKF3jxC0HCUAlLTqBIieyWT7ks3G9iINgiYWBJz24A/viewform' },
        { title: 'KKS dodatkowe - test', url: 'https://docs.google.com/forms/d/e/1FAIpQLSfNliI3zqCJIhnE14CL9BwMrMXSXmQt-XPugHMEnfOuyZ9BXA/viewform' }
    ]},
    { category: 'Ograniczenia', links: [
        { title: 'Ograniczenia część 1', url: 'https://docs.google.com/forms/d/e/1FAIpQLSdh93loTvC9F9QPF3kOZNkkI7IA0vVaUIYlmTfT1AwMmNHl-w/viewform' },
        { title: 'Ograniczenia część 2', url: 'https://docs.google.com/forms/d/e/1FAIpQLSegSbyiIUcGwz7P4zJOtfPypoXu9L-qxCO8nAJuTj3xcfuX3Q/viewform' }
    ]},
    { category: 'Komunikacja', links: [
        { title: 'Komunikacja - test', url: 'https://docs.google.com/forms/d/e/1FAIpQLSfgTkSYSXf7UJyDnWlfuHKtK5LaQQaq0pAKi-ndgAog0zGKhA/viewform' }
    ]},
    { category: 'Kontrola', links: [
        { title: 'Kontrola - test', url: 'https://docs.google.com/forms/d/e/1FAIpQLScKKl7gn2K4zOIIPjQNPVP9IQKYzx4xEpy-x0S_DRp3bUhvQw/viewform' }
    ]},
    { category: 'Akcyza', links: [
        { title: 'Akcyza - test', url: 'https://docs.google.com/forms/d/e/1FAIpQLSe2McMym6LLbRUi0DiQdF759Qv3-FBA9pKbWSlztjNrdQDnrQ/viewform' }
    ]},
    { category: 'Prawo celne i procedury celne', links: [
        { title: 'Procedury Celne - zagadnienia ogólne',              url: 'https://docs.google.com/forms/d/e/1FAIpQLSfEY7iGXj36I57RccJD_ssDbFDwQT0OvSV3s-j-nn9AwxrelQ/viewform' },
        { title: 'Prawo Celne - Postępowanie Celne i Prawo Dewizowe', url: 'https://docs.google.com/forms/d/e/1FAIpQLSewSLlE7f7xm6fRyBUUNnk0ixhwYGq0Ay0qnKvIrYgdYlrLdg/viewform' },
        { title: 'Procedury celne - test',                            url: 'https://docs.google.com/forms/d/e/1FAIpQLScNbbzhfKdUNFfzOaC_vIBFDpobA149kolKcUwWHzWkIhLGBw/viewform' },
        { title: 'Test - Prawo celne',                                url: 'https://docs.google.com/forms/d/e/1FAIpQLSd6_ASDPE6mK7IyZ027nCF5mRFWzO9pE_mmBPo_dqD4t9lbmA/viewform' }
    ]},
    { category: 'Taryfa', links: [
        { title: 'Prawo Celne - Środki Taryfowe', url: 'https://docs.google.com/forms/d/e/1FAIpQLScUIGzsccDAYjqER28yWkVhOHqRHl4Rbcn2dIvkS7no317n8g/viewform' },
        { title: 'TEST - ZKZ - Taryfa',           url: 'https://docs.google.com/forms/d/e/1FAIpQLSdSmswk2vb8MaoPKm_ATTEc8w9psTVoOyU9qS_lYkexZb1SYg/viewform' }
    ]},
    { category: 'Wartość celna', links: [
        { title: 'Prawo Celne - Wartość celna towarów', url: 'https://docs.google.com/forms/d/e/1FAIpQLSeV5URw6zArpFWrC-5ukim8WnQ-AeQt8cawhiIpqmHi4U72ug/viewform' },
        { title: 'Test Wartość Celna ZKZ',              url: 'https://docs.google.com/forms/d/e/1FAIpQLSdP05TMx5Ajwf5_u4zLQudIkWxxiE48PcV3ioxksy12yl5xnA/viewform' }
    ]},
    { category: 'Pochodzenie towaru i preferencje', links: [
        { title: '151–181',                                      url: 'https://docs.google.com/forms/d/e/1FAIpQLSfHbxeLXtYmw0lgfpyF-4b8iaNixn-TR1EUpy1yyIQV634bJQ/viewform' },
        { title: 'TEST - ZKZ - Pochodzenie towaru / Zwalczanie', url: 'https://docs.google.com/forms/d/e/1FAIpQLSdl3tRebRuNisNHg_ceuTrG46SiYLv8Vi--RzGk5Zs9MjRHmQ/viewform' }
    ]},
    { category: 'Mieszane', links: [
        { title: 'Testor ZKZ', url: 'https://docs.google.com/forms/d/e/1FAIpQLSfJx0g9dsoFXLspX-vKCVQOyHlbUgFBns3K2ur_G3py1hODMw/viewform' }
    ]}
];

// ── DOM helpers ────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// ── Theme ──────────────────────────────────────────────────
function initTheme() {
    const stored = localStorage.getItem(STORAGE.THEME);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
}
function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE.THEME, next);
}

// ── Boot ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    bindGlobalControls();
    loadData();
    renderHomeStats();
    renderTestGroups();
    renderMaterials();
    renderExternalLinks();
    handleHashRoute();
    window.addEventListener('hashchange', handleHashRoute);
});

function bindGlobalControls() {
    $('#themeToggle').addEventListener('click', toggleTheme);

    $('#navMenuBtn').addEventListener('click', () => {
        $('#topnav').classList.toggle('is-mobile-open');
    });

    // navigation links anywhere with [data-view]
    document.addEventListener('click', (e) => {
        const navBtn = e.target.closest('[data-view]');
        if (navBtn) {
            const view = navBtn.dataset.view;
            if (['home','tests','materials','links'].includes(view)) {
                e.preventDefault();
                navigate(view);
                $('#topnav').classList.remove('is-mobile-open');
            }
        }
        const closeBtn = e.target.closest('[data-close-modal]');
        if (closeBtn) {
            closeAllModals();
        }
    });

    // tests search
    $('#testsSearch').addEventListener('input', (e) => filterTests(e.target.value));

    // quiz
    $('#quizBackBtn').addEventListener('click', () => navigate('tests'));
    $('#quizCheckBtn').addEventListener('click', quizCheckAnswer);
    $('#quizNextBtn').addEventListener('click', quizNext);
    $('#quizRestartBtn').addEventListener('click', () => {
        if (state.selectedFolder) startQuiz(state.selectedFolder.id, true);
    });

    // flashcards
    $('#fcBackBtn').addEventListener('click', () => navigate('tests'));
    $('#flashcard').addEventListener('click', flipFlashcard);
    $('#flashcard').addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipFlashcard(); }
    });
    $('#fcRateYes').addEventListener('click', () => rateFlashcard(true));
    $('#fcRateNo').addEventListener('click', () => rateFlashcard(false));
    $('#fcRestartBtn').addEventListener('click', () => {
        if (state.selectedFolder) startFlashcards(state.selectedFolder.id);
    });

    // continue prompt
    $('#continueResumeBtn').addEventListener('click', resumeQuizSession);
    $('#continueRestartBtn').addEventListener('click', () => {
        if (state.pendingFolderId) startQuiz(state.pendingFolderId, true);
    });
    $('#continueCancelBtn').addEventListener('click', () => navigate('tests'));

    // end screen
    $('#endRetryBtn').addEventListener('click', () => {
        if (state.selectedFolder) startQuiz(state.selectedFolder.id, true);
    });
    $('#endHomeBtn').addEventListener('click', () => navigate('tests'));

    // mode picker buttons (delegated below)
    $('#pickQuiz').addEventListener('click', () => {
        const folderId = state.pendingFolderId;
        closeAllModals();
        if (folderId) startQuiz(folderId);
    });
    $('#pickFlash').addEventListener('click', () => {
        const folderId = state.pendingFolderId;
        closeAllModals();
        if (folderId) startFlashcards(folderId);
    });

    // material picker buttons
    $('#pickRead').addEventListener('click', () => {
        const m = MATERIALS.find(x => x.id === state.pendingMaterialId);
        closeAllModals();
        if (m) openPdf(m.pdf, m.title);
    });
    $('#pickTrainer').addEventListener('click', () => {
        const m = MATERIALS.find(x => x.id === state.pendingMaterialId);
        closeAllModals();
        if (m) openTrainer(m);
    });

    // PDF modal
    $('#pdfFrame').addEventListener('error', () => {
        $('#pdfFrame').classList.add('hidden');
        $('#pdfFallback').classList.remove('hidden');
    });

    // ESC closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllModals();
    });

    // trainer
    $('#trainerBackBtn').addEventListener('click', () => navigate('materials'));
    $$('.trainer-tab').forEach(b => b.addEventListener('click', () => switchTrainerTab(b.dataset.trainerTab)));
    document.addEventListener('click', (e) => {
        const targetTab = e.target.closest('[data-trainer-tab]:not(.trainer-tab)');
        if (targetTab) switchTrainerTab(targetTab.dataset.trainerTab);
    });
    $('#trainerForm').addEventListener('submit', onTrainerFormSubmit);
    $('#trainerCancelEditBtn').addEventListener('click', cancelTrainerEdit);

    $('#trainerCard').addEventListener('click', flipTrainerCard);
    $('#trainerCard').addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipTrainerCard(); }
    });
    $('#trainerRateYes').addEventListener('click', () => rateTrainerCard(true));
    $('#trainerRateNo').addEventListener('click', () => rateTrainerCard(false));
}

function navigate(view) {
    $$('.view').forEach(v => v.classList.remove('view--active'));
    const target = $(`#view-${view}`);
    if (target) target.classList.add('view--active');

    $$('.topnav__link').forEach(b => {
        b.classList.toggle('is-active', b.dataset.view === view);
    });

    if (['home','tests','materials','links'].includes(view)) {
        history.replaceState(null, '', `#${view}`);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleHashRoute() {
    const v = (location.hash || '').replace('#', '');
    if (['home','tests','materials','links'].includes(v)) navigate(v);
}

// ── Data load ──────────────────────────────────────────────
function loadData() {
    try {
        if (!window.ZKTEST_DATA) window.ZKTEST_DATA = { folders: [] };
        state.manifest = window.ZKTEST_DATA;

        if (!Array.isArray(state.manifest.folders) || state.manifest.folders.length === 0) {
            throw new Error('Brak danych testów w window.ZKTEST_DATA.');
        }

        // Inject special tests (lazy — references SP_CONTENT which is defined at bottom of IIFE)
        const specialTests = buildSpecialTestsData();
        specialTests.forEach(folder => {
            if (!state.manifest.folders.find(f => f.id === folder.id)) {
                const questions = loadQuestions(folder);
                folder.questionCount = questions.length;
                state.manifest.folders.push(folder);
            }
        });

        state.folders = state.manifest.folders;
    } catch (err) {
        console.error('loadData error:', err);
        showError('Nie udało się wczytać bazy testów. Uruchom build-manifest.ps1 aby odtworzyć tests/tests-data.js.');
    }
}

function showError(msg) {
    const el = $('#errorMsg');
    el.textContent = msg;
    el.classList.remove('hidden');
}

// ── Render: home stats ─────────────────────────────────────
function renderHomeStats() {
    const folders = state.folders || [];
    $('#statTests').textContent = folders.length || 0;
    const total = folders.reduce((sum, f) => sum + (f.questionCount || 0), 0);
    $('#statQuestions').textContent = total;
    $('#statMaterials').textContent = MATERIALS.length;
}

// ── Render: tests groups ───────────────────────────────────
const ICONS = {
    folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    star:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    pdf:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    extLink:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    chev:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
};

function renderTestGroups() {
    const generalPattern = /^Test[_\s]?\d+$/i;
    const special   = state.folders.filter(f => f.id.startsWith('sp_'));
    const general   = state.folders.filter(f => !f.id.startsWith('sp_') && generalPattern.test(f.id));
    const thematic  = state.folders.filter(f => !f.id.startsWith('sp_') && !generalPattern.test(f.id));

    fillGroup($('#specialFolderGrid'), special, 'star');
    fillGroup($('#thematicGrid'),     thematic, 'folder');
    fillGroup($('#generalGrid'),      general,  'folder');

    $('#groupSpecial').classList.toggle('hidden', special.length === 0);
    $('#groupThematic').classList.toggle('hidden', thematic.length === 0);
    $('#groupGeneral').classList.toggle('hidden', general.length === 0);
}

function fillGroup(grid, folders, icon) {
    if (!grid) return;
    grid.innerHTML = '';
    folders.forEach(f => grid.appendChild(makeTile(f, icon)));
}

function makeTile(folder, icon) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.dataset.testTitle = (folder.title || '').toLowerCase();
    btn.innerHTML = `
        <span class="tile__icon">${ICONS[icon] || ICONS.folder}</span>
        <span class="tile__body">
            <span class="tile__title"></span>
            <span class="tile__meta">${folder.questionCount || 0} pytań</span>
        </span>
        <span class="tile__arrow">→</span>
    `;
    btn.querySelector('.tile__title').textContent = folder.title;
    btn.addEventListener('click', () => openModePickerForTest(folder));
    return btn;
}

function filterTests(q) {
    const term = (q || '').trim().toLowerCase();
    $$('#view-tests .tile').forEach(t => {
        const match = !term || t.dataset.testTitle.includes(term);
        t.style.display = match ? '' : 'none';
    });
    // hide group titles when their grid is empty
    ['Special','Thematic','General'].forEach(name => {
        const grid = $(`#${name === 'Special' ? 'specialFolderGrid' : name === 'Thematic' ? 'thematicGrid' : 'generalGrid'}`);
        const groupEl = grid && grid.closest('.test-group');
        if (!groupEl) return;
        const visible = grid.querySelectorAll('.tile:not([style*="display: none"])').length;
        groupEl.style.display = visible ? '' : 'none';
    });
}

// ── Render: materials ──────────────────────────────────────
function renderMaterials() {
    const grid = $('#materialsGrid');
    grid.innerHTML = '';
    MATERIALS.forEach(m => {
        const card = document.createElement('article');
        card.className = 'material';
        card.innerHTML = `
            <div class="material__icon">${ICONS.pdf}</div>
            <h3></h3>
            <p></p>
            <div class="material__actions">
                <button class="btn btn--secondary" type="button" data-act="read">Czytaj</button>
                <button class="btn btn--primary" type="button" data-act="trainer">Trener</button>
            </div>
        `;
        card.querySelector('h3').textContent = m.title;
        card.querySelector('p').textContent = m.desc || '';
        card.querySelector('[data-act="read"]').addEventListener('click', () => openPdf(m.pdf, m.title));
        card.querySelector('[data-act="trainer"]').addEventListener('click', () => openTrainer(m));
        // tap card itself opens picker (apart from action buttons)
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            openMaterialPicker(m);
        });
        grid.appendChild(card);
    });
}

// ── Render: external links ────────────────────────────────
function renderExternalLinks() {
    const accordion = $('#linksAccordion');
    accordion.innerHTML = '';

    EXTERNAL_LINKS.forEach((group) => {
        const item = document.createElement('div');
        item.className = 'accordion-item';

        const header = document.createElement('button');
        header.type = 'button';
        header.className = 'accordion-header';
        header.innerHTML = `
            <span class="accordion-header__left">
                <span class="accordion-header__title"></span>
                <span class="accordion-header__count"></span>
            </span>
            <span class="accordion-chevron">${ICONS.chev}</span>
        `;
        header.querySelector('.accordion-header__title').textContent = group.category;
        header.querySelector('.accordion-header__count').textContent = group.links.length;

        const body = document.createElement('div');
        body.className = 'accordion-body';
        const inner = document.createElement('div');
        inner.className = 'accordion-body-inner';
        group.links.forEach(link => {
            const a = document.createElement('a');
            a.className = 'link-item';
            a.href = link.url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.innerHTML = `
                <span class="link-item__icon">${ICONS.extLink}</span>
                <span class="link-item__label"></span>
                <span class="link-item__arrow">→</span>
            `;
            a.querySelector('.link-item__label').textContent = link.title;
            inner.appendChild(a);
        });
        body.appendChild(inner);

        header.addEventListener('click', () => {
            item.classList.toggle('is-open');
        });

        item.appendChild(header);
        item.appendChild(body);
        accordion.appendChild(item);
    });
}

// ── Mode pickers ───────────────────────────────────────────
function openModePickerForTest(folder) {
    state.pendingFolderId = folder.id;
    $('#modePickerTitle').textContent = `Jak chcesz przerobić: „${folder.title}"?`;
    $('#modePickerSub').textContent = `${folder.questionCount || 0} pytań · wybierz tryb`;
    showModal('#modePicker');
}

state.pendingMaterialId = null;
function openMaterialPicker(material) {
    state.pendingMaterialId = material.id;
    $('#materialPickerTitle').textContent = `„${material.title}" — jak się uczysz?`;
    showModal('#materialPicker');
}

function showModal(sel) {
    closeAllModals();
    const m = $(sel);
    if (m) {
        m.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}
function closeAllModals() {
    const pdfWasOpen = !$('#pdfModal').classList.contains('hidden');
    $$('.modal').forEach(m => m.classList.add('hidden'));
    document.body.style.overflow = '';
    if (pdfWasOpen) {
        const f = $('#pdfFrame');
        if (f) f.src = '';
    }
}

// ── PDF viewer ─────────────────────────────────────────────
function openPdf(src, title) {
    closeAllModals();
    $('#pdfModalTitle').textContent = title;
    $('#pdfOpenLink').href = src;
    $('#pdfFallback').classList.add('hidden');
    const f = $('#pdfFrame');
    f.classList.remove('hidden');
    f.src = src;
    $('#pdfModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// ── Question parsing (kept from v1) ────────────────────────
function loadQuestions(folder) {
    return (folder.files || []).reduce((acc, file) => {
        const qs = parseQuestionsFromFile(file.content, file.name);
        return acc.concat(qs);
    }, []);
}

function parseQuestionsFromFile(text, filename) {
    if (typeof text !== 'string' || !text.trim()) return [];

    const rawLines = text.split(/\r?\n/);
    const lines = [];
    for (const line of rawLines) {
        let trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith('klucz:')) {
            trimmed = trimmed.replace(/^klucz:\s*/i, '').trim();
        }
        if (trimmed.length > 0) lines.push(trimmed);
    }

    const blocks = [];
    let currentBlock = [];
    for (const line of lines) {
        if (isAnswerKey(line)) {
            if (currentBlock.length === 0) {
                currentBlock.push(line);
            } else if (currentBlock.some(l => isAnswerKey(l))) {
                blocks.push(currentBlock);
                currentBlock = [line];
            } else {
                currentBlock.push(line);
                blocks.push(currentBlock);
                currentBlock = [];
            }
        } else {
            currentBlock.push(line);
        }
    }
    if (currentBlock.length > 0 && currentBlock.some(l => isAnswerKey(l))) {
        blocks.push(currentBlock);
    }

    return blocks
        .map((block, i) => parseQuestionBlock(block, i === 0 ? filename : `${filename}#${i+1}`))
        .filter(Boolean);
}

function parseQuestionBlock(lines, filename) {
    if (lines.length < 2) return null;

    let keyLine;
    if (isAnswerKey(lines[0])) keyLine = lines.shift();
    else if (isAnswerKey(lines[lines.length - 1])) keyLine = lines.pop();
    else return null;

    const correctIndexes = [];
    for (let i = 1; i < keyLine.length; i++) {
        if (keyLine[i] === '1') correctIndexes.push(i - 1);
    }

    const expectedOptionCount = keyLine.length - 1;
    const questionLines = [];
    const options = [];
    let parsingOpts = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (isOptionStart(line, parsingOpts, questionLines.length > 0)) {
            parsingOpts = true;
            options.push(stripOptionPrefix(line));
            continue;
        }
        if (parsingOpts && options.length > 0) {
            options[options.length - 1] += ` ${line}`;
        } else {
            questionLines.push(line);
        }
    }

    if (options.length === 0 && questionLines.length > expectedOptionCount) {
        const fbQ = questionLines.slice(0, questionLines.length - expectedOptionCount);
        const fbO = questionLines.slice(questionLines.length - expectedOptionCount);
        if (fbQ.length > 0 && fbO.length === expectedOptionCount) {
            questionLines.length = 0;
            questionLines.push(...fbQ);
            options.push(...fbO.map(stripOptionPrefix));
        }
    }

    if (questionLines.length === 0 || options.length !== expectedOptionCount) return null;

    const questionText = questionLines.map(l => `${escapeHtml(l)}<br>`).join('');
    return { questionText, options, correctIndexes, filename };
}

function isAnswerKey(line) { return /^X[01]+$/.test(line); }
function isOptionStart(line, parsingOpts, hasQ) {
    if (/^[a-z]\s*[.)]/i.test(line)) return true;
    if (/^[•*-]\s*/.test(line)) return true;
    if ((parsingOpts || hasQ) && /^[a-e]\s+[^\s]/i.test(line)) return true;
    if ((parsingOpts || hasQ) && /^\d+\s*[.)]\s*/.test(line)) return true;
    return false;
}
function stripOptionPrefix(line) {
    return line
        .replace(/^[a-z]\s*[.)]\s*/i, '')
        .replace(/^[•*-]\s*/u, '')
        .replace(/^\d+\s*[.)]\s*/u, '')
        .replace(/^[a-e]\s+/i, '')
        .trim();
}
function escapeHtml(v) {
    return String(v)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
function shuffleArray(items) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── Quiz session storage ──────────────────────────────────
function saveQuizSession() {
    if (!state.selectedFolder) return;
    try {
        localStorage.setItem(STORAGE.SESSION(state.selectedFolder.id), JSON.stringify({
            folderId: state.selectedFolder.id,
            questions: state.quiz.questions,
            currentQuestionIndex: state.quiz.index,
            score: state.quiz.score,
            results: state.quiz.results
        }));
    } catch(_) {}
}
function loadQuizSession(folderId) {
    try {
        const raw = localStorage.getItem(STORAGE.SESSION(folderId));
        return raw ? JSON.parse(raw) : null;
    } catch(_) { return null; }
}
function clearQuizSession(folderId) {
    localStorage.removeItem(STORAGE.SESSION(folderId));
}

// ── Quiz mode ──────────────────────────────────────────────
function startQuiz(folderId, fresh = false) {
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return showError('Nie znaleziono testu.');
    state.selectedFolder = folder;
    state.pendingFolderId = null;

    if (!fresh) {
        const saved = loadQuizSession(folderId);
        if (saved && saved.currentQuestionIndex < saved.questions.length) {
            state.pendingFolderId = folderId;
            $('#continueInfo').textContent =
                `Pytanie ${saved.currentQuestionIndex + 1} / ${saved.questions.length} · Poprawne: ${saved.score}`;
            navigate('continue');
            return;
        }
    } else {
        clearQuizSession(folderId);
    }

    let questions;
    try {
        questions = loadQuestions(folder);
        if (!questions.length) throw new Error('Brak pytań.');
    } catch (e) {
        showError(`Nie udało się otworzyć testu „${folder.title}".`);
        return;
    }

    state.quiz.questions = shuffleArray(questions);
    state.quiz.index = 0;
    state.quiz.score = 0;
    state.quiz.results = [];

    $('#quizTestName').textContent = folder.title;
    navigate('quiz');
    renderQuizQuestion();
}

function resumeQuizSession() {
    const folderId = state.pendingFolderId;
    if (!folderId) return;
    const saved = loadQuizSession(folderId);
    if (!saved) return startQuiz(folderId, true);
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return;

    state.selectedFolder = folder;
    state.quiz.questions = saved.questions;
    state.quiz.index = saved.currentQuestionIndex;
    state.quiz.score = saved.score;
    state.quiz.results = saved.results || [];
    state.pendingFolderId = null;

    $('#quizTestName').textContent = folder.title;
    navigate('quiz');
    renderQuizQuestion();
}

function renderQuizQuestion() {
    const q = state.quiz.questions[state.quiz.index];
    const total = state.quiz.questions.length;
    $('#quizCounter').textContent = `Pytanie ${state.quiz.index + 1} / ${total}`;
    $('#quizScore').textContent = `Poprawne: ${state.quiz.score}`;
    $('#quizProgress').style.width = `${(state.quiz.index / total) * 100}%`;

    $('#quizQuestion').innerHTML = q.questionText;
    const optsBox = $('#quizOptions');
    optsBox.innerHTML = '';
    q.options.forEach((opt, i) => {
        const lbl = document.createElement('label');
        lbl.className = 'option';
        lbl.innerHTML = `<input type="checkbox" value="${i}" class="answer-input"><span></span>`;
        lbl.querySelector('span').textContent = opt;
        optsBox.appendChild(lbl);
    });

    $('#quizCheckBtn').classList.remove('hidden');
    $('#quizNextBtn').classList.add('hidden');
}

function quizCheckAnswer() {
    const q = state.quiz.questions[state.quiz.index];
    const inputs = $$('.answer-input');
    let ok = true;
    let any = false;
    const selected = [];

    inputs.forEach((inp, idx) => {
        const checked = inp.checked;
        const correct = q.correctIndexes.includes(idx);
        if (checked) { any = true; selected.push(idx); }
        inp.disabled = true;
        if (checked && correct) inp.parentElement.classList.add('correct');
        else if (checked && !correct) { inp.parentElement.classList.add('incorrect'); ok = false; }
        else if (!checked && correct) { inp.parentElement.classList.add('missed'); ok = false; }
    });

    if (!any) {
        toast('Zaznacz przynajmniej jedną odpowiedź.');
        inputs.forEach(i => i.disabled = false);
        return;
    }

    if (ok) {
        state.quiz.score += 1;
        $('#quizScore').textContent = `Poprawne: ${state.quiz.score}`;
    }

    state.quiz.results.push({
        correct: ok, selectedIndexes: selected, correctIndexes: q.correctIndexes,
        questionText: q.questionText, options: q.options
    });
    saveQuizSession();
    $('#quizCheckBtn').classList.add('hidden');
    $('#quizNextBtn').classList.remove('hidden');
}

function quizNext() {
    state.quiz.index += 1;
    saveQuizSession();
    if (state.quiz.index < state.quiz.questions.length) {
        renderQuizQuestion();
        return;
    }
    clearQuizSession(state.selectedFolder.id);
    showQuizEnd();
}

function showQuizEnd() {
    const total = state.quiz.questions.length;
    $('#endTitle').textContent = 'Koniec quizu!';
    $('#endSummary').textContent = `${state.selectedFolder.title} · ${state.quiz.score} / ${total} poprawnych odpowiedzi`;
    $('#endScore').textContent = state.quiz.score;
    $('#endTotal').textContent = total;

    const list = $('#endResults');
    list.innerHTML = '';
    const letters = ['a','b','c','d','e','f'];

    state.quiz.results.forEach((r, idx) => {
        const item = document.createElement('div');
        item.className = `result-item ${r.correct ? '' : 'result-item--fail'}`;
        item.innerHTML = `
            <div class="result-item__header">
                <span class="result-item__badge">${r.correct ? '✓' : '✗'}</span>
                <span class="result-item__num">Pytanie ${idx+1}</span>
                <span class="result-item__question"></span>
            </div>
        `;
        item.querySelector('.result-item__question').innerHTML = r.questionText.replace(/<br>/g, ' ');

        if (!r.correct) {
            const opts = document.createElement('div');
            opts.className = 'result-item__options';
            r.options.forEach((opt, oi) => {
                const row = document.createElement('div');
                const isCorrect = r.correctIndexes.includes(oi);
                const wasSel = r.selectedIndexes.includes(oi);
                row.className = 'result-opt' +
                    (isCorrect ? ' result-opt--correct' : '') +
                    (wasSel && !isCorrect ? ' result-opt--wrong' : '');
                row.textContent = `${letters[oi]}) ${opt}`;
                opts.appendChild(row);
            });
            item.appendChild(opts);
        }
        list.appendChild(item);
    });

    navigate('end');
}

// ── Flashcards mode (test-based) ───────────────────────────
function startFlashcards(folderId) {
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return;
    state.selectedFolder = folder;
    state.pendingFolderId = null;

    let questions;
    try {
        questions = loadQuestions(folder);
        if (!questions.length) throw new Error('Brak pytań.');
    } catch (e) {
        showError(`Nie udało się otworzyć testu „${folder.title}".`);
        return;
    }

    state.fc.deck = shuffleArray(questions).map(q => ({ q, status: 'pending' }));
    state.fc.seen = 0;
    state.fc.known = 0;
    state.fc.total = state.fc.deck.length;
    state.fc.flipped = false;
    state.fc.current = null;

    $('#fcTestName').textContent = folder.title;
    navigate('flashcards');
    nextFlashcard();
}

function nextFlashcard() {
    state.fc.flipped = false;
    $('#flashcard').classList.remove('is-flipped');
    $('#fcRateHint').classList.remove('hidden');

    const remaining = state.fc.deck.filter(it => it.status !== 'known');
    if (remaining.length === 0) {
        // done
        $('#endTitle').textContent = 'Świetnie!';
        $('#endSummary').textContent = `${state.selectedFolder.title} · oznaczone jako „umiem": ${state.fc.known} / ${state.fc.total}`;
        $('#endScore').textContent = state.fc.known;
        $('#endTotal').textContent = state.fc.total;
        $('#endResults').innerHTML = '';
        navigate('end');
        return;
    }

    state.fc.current = remaining[0];
    const q = state.fc.current.q;
    const letters = ['a','b','c','d','e','f'];

    $('#fcFront').innerHTML = q.questionText;
    const correctOpts = q.options
        .map((opt, i) => ({ text: opt, correct: q.correctIndexes.includes(i), letter: letters[i] }));

    const all = correctOpts.map(o => `
        <div class="fc-opt ${o.correct ? 'fc-opt--correct' : ''}">${o.letter}) ${escapeHtml(o.text)}</div>
    `).join('');

    $('#fcBack').innerHTML = `
        <div style="font-size:.95rem; opacity:.8; margin-bottom:8px;">Poprawne odpowiedzi:</div>
        <div class="fc-options-list">${all}</div>
    `;

    const idx = state.fc.total - remaining.length;
    $('#fcCounter').textContent = `Fiszka ${idx + 1} / ${state.fc.total}`;
    $('#fcKnown').textContent = `Umiem: ${state.fc.known}`;
    $('#fcProgress').style.width = `${((state.fc.total - remaining.length) / state.fc.total) * 100}%`;
}

function flipFlashcard() {
    state.fc.flipped = !state.fc.flipped;
    $('#flashcard').classList.toggle('is-flipped', state.fc.flipped);
    if (state.fc.flipped) $('#fcRateHint').classList.add('hidden');
}

function rateFlashcard(known) {
    if (!state.fc.flipped) {
        flipFlashcard();
        toast('Najpierw zobacz odpowiedź.');
        return;
    }
    if (!state.fc.current) return;

    if (known) {
        state.fc.current.status = 'known';
        state.fc.known += 1;
    } else {
        // move to back of remaining queue
        state.fc.deck = state.fc.deck.filter(it => it !== state.fc.current).concat([state.fc.current]);
    }
    state.fc.seen += 1;
    nextFlashcard();
}

// ── Trainer mode (per material) ────────────────────────────
function loadTrainerData(materialId) {
    try {
        const raw = localStorage.getItem(STORAGE.TRAINER(materialId));
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    // first-run: seed with starter cards if any
    const m = MATERIALS.find(x => x.id === materialId);
    const seed = (m && m.starterTrainer) ? m.starterTrainer.map((c, i) => ({ id: Date.now() + '_' + i, q: c.q, a: c.a })) : [];
    return seed;
}
function saveTrainerData(materialId, items) {
    try { localStorage.setItem(STORAGE.TRAINER(materialId), JSON.stringify(items)); } catch(_) {}
}

function openTrainer(material) {
    state.trainer.materialId = material.id;
    state.trainer.materialTitle = material.title;
    state.trainer.items = loadTrainerData(material.id);
    state.trainer.editingId = null;
    $('#trainerTitle').textContent = `Trener · ${material.title}`;
    $('#trainerQ').value = '';
    $('#trainerA').value = '';
    $('#trainerSaveBtn').textContent = 'Dodaj fiszkę';
    $('#trainerCancelEditBtn').hidden = true;
    switchTrainerTab(state.trainer.items.length === 0 ? 'edit' : 'study');
    navigate('trainer');
}

function switchTrainerTab(tab) {
    $$('.trainer-tab').forEach(b => b.classList.toggle('is-active', b.dataset.trainerTab === tab));
    $('#trainerStudy').classList.toggle('hidden', tab !== 'study');
    $('#trainerEdit').classList.toggle('hidden', tab !== 'edit');

    if (tab === 'study') startTrainerStudy();
    if (tab === 'edit') renderTrainerList();
}

function startTrainerStudy() {
    const items = state.trainer.items;
    $('#trainerEmpty').classList.toggle('hidden', items.length > 0);
    $('#trainerStudyBody').classList.toggle('hidden', items.length === 0);
    if (items.length === 0) return;

    state.trainer.deck = shuffleArray(items).map(it => ({ it, status: 'pending' }));
    state.trainer.total = state.trainer.deck.length;
    state.trainer.known = 0;
    state.trainer.seen = 0;
    state.trainer.flipped = false;
    state.trainer.current = null;
    nextTrainerCard();
}

function nextTrainerCard() {
    state.trainer.flipped = false;
    $('#trainerCard').classList.remove('is-flipped');
    $('#trainerRateHint').classList.remove('hidden');

    const remaining = state.trainer.deck.filter(it => it.status !== 'known');
    if (remaining.length === 0) {
        $('#trainerFront').innerHTML = `<div style="text-align:center;"><strong>Brawo!</strong><br>Wszystkie fiszki przerobione.</div>`;
        $('#trainerBack').innerHTML = `<div>Powodzenia na egzaminie!</div>`;
        $('#trainerCounter').textContent = `Fiszka ${state.trainer.total} / ${state.trainer.total}`;
        $('#trainerKnown').textContent = `Umiem: ${state.trainer.known}`;
        $('#trainerProgress').style.width = '100%';
        return;
    }

    state.trainer.current = remaining[0];
    $('#trainerFront').textContent = state.trainer.current.it.q;
    $('#trainerBack').textContent = state.trainer.current.it.a;
    const idx = state.trainer.total - remaining.length;
    $('#trainerCounter').textContent = `Fiszka ${idx + 1} / ${state.trainer.total}`;
    $('#trainerKnown').textContent = `Umiem: ${state.trainer.known}`;
    $('#trainerProgress').style.width = `${(idx / state.trainer.total) * 100}%`;
}

function flipTrainerCard() {
    state.trainer.flipped = !state.trainer.flipped;
    $('#trainerCard').classList.toggle('is-flipped', state.trainer.flipped);
    if (state.trainer.flipped) $('#trainerRateHint').classList.add('hidden');
}

function rateTrainerCard(known) {
    if (!state.trainer.flipped) {
        flipTrainerCard();
        toast('Najpierw zobacz odpowiedź.');
        return;
    }
    if (!state.trainer.current) return;
    if (known) {
        state.trainer.current.status = 'known';
        state.trainer.known += 1;
    } else {
        state.trainer.deck = state.trainer.deck.filter(it => it !== state.trainer.current).concat([state.trainer.current]);
    }
    state.trainer.seen += 1;
    nextTrainerCard();
}

function onTrainerFormSubmit(e) {
    e.preventDefault();
    const q = $('#trainerQ').value.trim();
    const a = $('#trainerA').value.trim();
    if (!q || !a) return;

    if (state.trainer.editingId) {
        const item = state.trainer.items.find(it => it.id === state.trainer.editingId);
        if (item) { item.q = q; item.a = a; }
        state.trainer.editingId = null;
        $('#trainerSaveBtn').textContent = 'Dodaj fiszkę';
        $('#trainerCancelEditBtn').hidden = true;
    } else {
        state.trainer.items.push({ id: 'fc_' + Date.now(), q, a });
    }
    saveTrainerData(state.trainer.materialId, state.trainer.items);
    $('#trainerQ').value = '';
    $('#trainerA').value = '';
    renderTrainerList();
    toast('Zapisano fiszkę');
}

function cancelTrainerEdit() {
    state.trainer.editingId = null;
    $('#trainerQ').value = '';
    $('#trainerA').value = '';
    $('#trainerSaveBtn').textContent = 'Dodaj fiszkę';
    $('#trainerCancelEditBtn').hidden = true;
}

function renderTrainerList() {
    const list = $('#trainerList');
    list.innerHTML = '';
    if (state.trainer.items.length === 0) {
        list.innerHTML = `<p class="muted" style="text-align:center; padding:24px;">Brak fiszek — dodaj pierwszą powyżej.</p>`;
        return;
    }
    state.trainer.items.forEach((it, idx) => {
        const row = document.createElement('div');
        row.className = 'trainer-item';
        row.innerHTML = `
            <span class="trainer-item__num">${idx + 1}</span>
            <div class="trainer-item__body">
                <div class="trainer-item__q"></div>
                <div class="trainer-item__a"></div>
            </div>
            <div class="trainer-item__actions">
                <button class="trainer-item__btn" data-act="edit" title="Edytuj">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="trainer-item__btn is-danger" data-act="del" title="Usuń">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </button>
            </div>
        `;
        row.querySelector('.trainer-item__q').textContent = it.q;
        row.querySelector('.trainer-item__a').textContent = it.a;
        row.querySelector('[data-act="edit"]').addEventListener('click', () => {
            state.trainer.editingId = it.id;
            $('#trainerQ').value = it.q;
            $('#trainerA').value = it.a;
            $('#trainerSaveBtn').textContent = 'Zapisz zmiany';
            $('#trainerCancelEditBtn').hidden = false;
            $('#trainerQ').focus();
            $('#trainerQ').scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        row.querySelector('[data-act="del"]').addEventListener('click', () => {
            if (!confirm('Usunąć tę fiszkę?')) return;
            state.trainer.items = state.trainer.items.filter(x => x.id !== it.id);
            saveTrainerData(state.trainer.materialId, state.trainer.items);
            renderTrainerList();
            toast('Usunięto');
        });
        list.appendChild(row);
    });
}

// ── Toast ──────────────────────────────────────────────────
let toastTimer;
function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    requestAnimationFrame(() => el.classList.add('is-visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        el.classList.remove('is-visible');
        setTimeout(() => el.classList.add('hidden'), 250);
    }, 2200);
}

/* ──────────────────────────────────────────────────────────
   Special tests content (preserved from v1)
   ────────────────────────────────────────────────────────── */
const SP_CONTENT = {
procedury: `1. W Polsce procedura odwoławcza została określona w:
Prawie Celnym przez odwołanie do odpowiednich przepisów Ordynacji Podatkowej;
Kodeksie Postępowania Administracyjnego;
Prawie Administracyjnym.
X100

2. Decyzje „z urzędu" są wydawane:
Na wniosek zgłaszającego;
Bez uprzedniego wniosku osoby zainteresowanej;
Zarówno na wniosek jak i bez uprzedniego wniosku osoby zainteresowanej.
X010

3. Decyzja niekorzystna to:
Decyzja wydawana na wniosek w pełni go uwzględniająca;
Tylko i wyłącznie decyzja wydana z urzędu
Decyzja wydana na wniosek nie w pełni go uwzględniająca
X001

4. Organ celny, wszczynając postępowanie z urzędu:
Wydaje postanowienie o wszczęciu postępowania
Wydaje powiadomienie o wszczęciu postępowania
Nie wydaje żadnego odrębnego aktu administracyjnego o wszczęciu postępowania
X001

5. Odwołanie od decyzji przysługuje:
Tylko w przypadku decyzji niekorzystnych;
Niezależnie od rodzaju wydanego rozstrzygnięcia;
Wyłącznie przypadku decyzji wydawanych „na wniosek zainteresowanego"
X010

6. Przed wydaniem decyzji niekorzystnej organy celne dają wnioskodawcy możliwość przedstawienia stanowiska w terminie:
14 dni;
7 dni;
30 dni.
X001

7. Odwołanie od decyzji składa się:
w każdym państwie członkowskim UE;
w państwie członkowskim, w którym decyzja została wydana
jedynie w Brukseli.
X010

8. Wydanie decyzji i powiadomienie o niej winno nastąpić w terminie:
120 dni od daty przyjęcia wniosku;
30 dni od daty przyjęcia wniosku;
90 ,dni od daty przyjęcia wniosku.
X100

9. Publiczna usługa hybrydowa w zakresie doręczeń
jest realizowana prze InPost;
jest realizowana przez Pocztę Polska;
jest aktualnie niedostępna.
X010

10. Podstawowa forma doręczeń to:
Doręczenie korespondencji na adres elektroniczny
Doręczenie w ramach publicznej usługi hybrydowej
Doręczenie przez awizo.
X100

11. Niedopełnienie obowiązku zgłoszenia przywozu do Polski środków pieniężnych
Nie podlega żadnej karze;
Podlega karze grzywny za przestępstwo lub wykroczenie skarbowe;
Podlega karze ograniczenia wolności.
X010

12. Decyzja zaczyna obowiązywać:
Z dniem jej doręczenia lub uznania za doręczoną;
Po 14 dniach od doręczenia;
Co do zasady po 30 dniach.
X100

13. Odwołanie o decyzji w zakresie prawa celnego wnosi się:
W terminie 30 dni od doręczenia jej stronie;
W terminie 14 dni od doręczenia jej stronie;
W terminie 7 dni od doręczenia jej stronie
X010

14. W Polsce do postępowania w sprawach celnych stosuje się przepisy:
Ustawy Ordynacja podatkowa;
Ustawy Kodeks Postępowania Administracyjnego;
Tylko i wyłącznie Unijnego Kodeksu Celnego
X100`,

pochodzenie: `1. Pochodzenie towaru udokumentowane poprzez przedstawienie niepreferencyjnego świadectwa pochodzenia pozwala:
Skorzystać z obniżonej stawki celnej
Skorzystać z zerowej stawki celnej
Zastosować stawkę celną „erga omnes".
X001

2. Strefy wolnego handlu pozwalają na:
Zastosowanie preferencji wynikających ze wzajemnych umów handlowych
Zastosowanie preferencji wynikających z jednostronnych uzgodnień UE
Zastosowanie preferencji na podstawie świadectwa ATR.
X100

3. Preferencje wynikające z unii celnej oparte są na:
Pochodzeniu towarów
Statusie celnym towarów
Pochodzeniu i statusie celnym
X010

4. Ważność świadectwa ATR wynosi:
4 miesiące
90 dni
2 lata
X100

5. UE zawarła unię celną z:
Turcją, Andorą i San Marino
Jedynie z Turcją
Turcją i Szwajcarią
X100

6. Upoważniony eksporter:
Sporządza deklarację pochodzenia, tylko wtedy gdy wartość towaru przekracza 4000 EUR;
Nie jest związany żadnym limitem wartości produktów pochodzących
Sporządza deklarację o pochodzeniu niepreferencyjnym.
X010

7. Ogólne zasady pochodzenia preferencyjnego obejmują:
Zasadę bezpośredniego transportu, tożsamości, terytorialności i dokumentowania pochodzenia
Tylko zasadę bezpośredniego transportu i terytorialności
Jedynie zasadę dokumentowania i tożsamości.
X100

8. REX to :
system zarejestrowanych eksporterów min. w ramach Ogólnego Systemu Preferencji (GSP)
skrót dot. zasady bezpośredniego transportu
produkty całkowicie uzyskane
X100

9. Świadectwo o niemaniplulowaniu towarem:
służy potwierdzeniu zachowania dozoru celnego dla towarów transportowanych między stronami umowy o wolnym handlu
dokumentuje preferencyjne pochodzenie towaru
potwierdza status celny towaru.
X100

10. „Wystarczające przetwarzanie lub obróbka" to procesy, którym poddawane są:
towary unijne by uzyskać status nieunijnych
towary niepochodzące by uzyskać status pochodzących
towary z krajów trzecich by uzyskać status unijny
X010

11. EUR 1, EUR-MED to dowody pochodzenia stosowane:
w GSP
W strefach wolnego handlu
W unii celnej
X010

12. Preferencje jednostronne (GSP) przyznawane są:
Jedynie krajom Afryki
Krajom rozwijającym się i najsłabiej rozwiniętym
Turcji, San Marino i Andorze
X010

13. Umowy o wolnym handlu:
To negocjowany, wzajemny system preferencji
To przyznawany system preferencji jednostronnych
Opierają się na unii celnej
X100

14. Stawka celna stosowana w oparciu o KNU to:
Stawka celna konwencyjna
Stawka celna preferencyjna
Stawka celna obniżona
X100

15. WIP w Polsce wydaje:
Każdy NUCS
Dyrektor Krajowej Informacji Skarbowej
Minister Finansów
X010

16. Deklaracja o pochodzeniu towaru może być wystawiona :
Jedynie przez upoważnionego eksportera
Tylko i wyłącznie przez nieupoważnionego eksportera
Zarówno przez upoważnionego jak i przez nieupoważnionego eksportera
X001`,

taryfa: `1. Nomenklatura taryfowa zbudowana jest z:
a) Stawek celnych, wykazu alfabetycznego towarów,
b) Tylko wykazu alfabetycznego towarów,
c) Sekcji, działów, pozycji i podpozycji.
X001

2. Pozycja HS jest określona na poziomie:
a) 4 cyfr,
b) 6 cyfr,
c) 10 cyfr.
X100

3. Oznaczenie AD F/M oznacza we Wspólnej Taryfie Celnej:
a) Dodatkowe cło za cukier,
b) Dodatkowe cło za mąkę;
c) Dodatkowe cło za alkohol.
X010

4. Skrót CN oznacza:
a) Nomenklatura Scalona,
b) System Zharmonizowany,
c) Ogólne Reguły Interpretacji Nomenklatury Scalonej.
X100

5. Dla towaru, o wartości poniżej 700 EUR, o charakterze niehandlowym, przewożonego w bagażu podróżnego stosuje się:
a) Stawkę celną procentową w zależności od kodu towaru;
b) Ryczałtową stawkę celną w wysokości 2,5 % od wartości
c) Stawkę celną kwotowa w zależności od masy towaru.
X010

6. WIT to decyzja organu celnego dot. taryfikacji wydawana w Polsce przez:
a) Dyrektorów Izby Administracji Skarbowej;
b) Naczelników Urzędów Celno-Skarbowych;
c) Dyrektora Krajowej Informacji Skarbowej.
X001

7. Dodatkowe cło za cukier we Wspólnej Taryfie Celnej jest oznaczone skrótem:
a) EA
b) AD S/Z
c) AD F/M.
X010

8. Futerał na broń (pistolet), przewożony wraz z tym pistoletem, nadający się do długotrwałego użytkowania klasyfikuje się:
a) Jako opakowanie jednorazowego użytku;
b) Wraz z towarem, do pozycji dla pistoletów;
c) Zgodnie z regułą reguła ORINS 5B.
X010

9. Reguła 5 ORINS służy do:
a) Klasyfikacji opakowań przewożonych wraz z towarem
b) Klasyfikacji towaru do odpowiednich podpozycji CN;
c) Klasyfikacji mieszanin.
X100

10. Wyroby niegotowe, mające zasadniczy charakter wyrobu gotowego klasyfikuje się zgodnie z :
a) 2a ORINS;
b) 4 ORINS;
c) 6 ORINS.
X100

11. Nomenklatura taryfowa dzieli się na:
a) 5 sekcji;
b) 21 sekcji;
c) 99 sekcji.
X010

12. Do specjalnego użytku przez właściwe organy unijne zarezerwowany jest:
a) Dział 77;
b) Dział 98 i 99
c) Dział 102.
X010

13. Kod CN jest określany przez:
a) 4 cyfry, gdzie dwie pierwsze cyfry to numer działu;
b) 8 cyfr ;
c) 2 cyfry, które odnoszą się do numeru działu
X010

14. Załącznik I do Rozp. Rady 2658/87:
a) Jest publikowany corocznie, nie później niż do 31 października danego roku
b) Jest aktualizowany raz na 10 lat;
c) Nie podlega corocznym przeglądom ani aktualizacji.
X100

15. Element rolny w Taryfie Celnej określany jest:
a) HS
b) CN
c) EA.
X001

16. Tytuły sekcji, działów, poddziałów, przy klasyfikacji towarów mają znaczenie:
a) Prawne;
b) Wyłącznie orientacyjne;
c) Najważniejsze.
X010

17. System ISZTAR:
a) Zawiera nomenklaturę towarową, stawki celne, dane krajowe w zakresie podatków, ograniczenia w imporcie i eksporcie;
b) Zawiera tylko dodatkowe kody TARIC, np. kody Meursinga;
c) Zawiera jedynie nomenklaturę TARIC
X100

18. TARIC to Zintegrowana Taryfa Wspólnot Europejskich która jest:
a) Źródłem prawa UE w zakresie taryfikacji;
b) Internetową bazą danych prowadzoną przez DG TAXUD,
c) bazą danych ustanowioną przez Polskie Ministerstwo Finansów.
X010

19. W nomenklaturze taryfowej ma zastosowanie tzw. zasada stopnia przetworzenia która:
a) Dotyczy tylko towarów rolnych;
b) Oznacza drogę towaru od surowca, przez półprodukt do produktu gotowego;
c) Odnosi się do reguł pochodzenia towaru.
X010

20. Wyroby niekompletne, niegotowe, rozmontowane lub niezmontowane klasyfikuje się:
a) Zgodnie z regułą 2A ORINS;
b) Jako części towaru gotowego;
c) W zależności od jego zasadniczego składnika/komponentu
X100

21. Części ogólnego użytku
a) Klasyfikuje się jako części jednego konkretnego, głównego towaru;
b) Do własnych pozycji, np.: gwoździe, zatrzaski;
c) Są nieistotne w procesie klasyfikacji towarowej.
X010

22. Maszyna, składająca się z kilku maszyn, przeznaczonych do pełnienia dwóch lub więcej funkcji wzajemnie uzupełniających się, taryfikowana jest:
a) Do pozycji zarezerwowanej dla maszyny występującej w nazwie jako główna
b) Do pozycji odpowiedniej dla maszyny wykonującej podstawową funkcję;
c) Do pozycji maszyny występującej jako pierwsza we wspólnej taryfie celnej
X010

23. W procesie klasyfikacji taryfowej zawsze korzystamy z :
a) Pierwszej Ogólnej Reguły Interpretacyjnej
b) Z każdej reguły ORINS;
c) Tylko jednej reguły, która odpowiada naszemu towarowi
X100`,

wartosc: `1. Wartość celna stanowi podstawę:
a) obliczenia cła;
b) ustalenia statusu celnego towaru;
c) ustalenia preferencyjnego pochodzenia towaru.
X100

2. UKC wprowadza kolejność stosowania metod ustalania wartości celnej. Wyjątkiem są:
a) metoda wartości transakcyjnej i towarów identycznych, stosowane zamiennie
b) metoda dedukcyjna i wartości kalkulowanej, których kolejność może być odwrócona
c) metoda towarów identycznych i podobnych, których kolejność może być odwrócona.
X010

3. O podmiotach powiązanych mówimy, gdy:
a) są członkami tej samej rodziny;
b) gdy kupują towar u tego samego producenta;
c) są przewoźnikiem i odbiorca towaru.
X100

4. Do wartości transakcyjnej dodaje się:
a) koszty transportu po ich wprowadzeniu na obszar UE;
b) prowizje i koszty pośrednictwa;
c) koszty prac badawczych, inżynieryjnych, przywożonych towarów prowadzone po ich wprowadzeniu na obszar UE.
X010

5. Do wartości transakcyjnej nie wlicza się:
a) kosztów pośrednictwa;
b) kosztów transportu po ich wprowadzeniu na obszar celny UE;
c) kosztów transportu do miejsca wprowadzenia towaru na obszar celny UE.
X010

6. Reguły INCOTERMS regulują:
a) podział kosztów i ryzyka dostawy między sprzedającym, a kupującym;
b) podział kosztów między przewoźnikiem, a producentem towaru;
c) kwestie klasyfikacji towarowej
X100

7. Podstawą do zakwestionowania zadeklarowanej wartości może być:
a) wątpliwość co do wiarygodności i autentyczności dokumentów, np. faktury;
b) brak preferencyjnego dowodu pochodzenia towaru;
c) pewność, że zadeklarowana wartość stanowi całkowitą zapłacona kwotę za towar.
X100

8. Zgodnie z Rozp. Delegowanym 2015/2446:
a) istnieje 5 metod zastępczych ustalania wartości celnej ;
b) istnieje 6 metod ustalania wartości celnej towaru;
c) metody ustalania wartości celnej wskazano w UKC, nie w Rozp. Delegowanym
X001

9. Którą z poniższych metod ustalania wartości celnej towaru stosuje się w pierwszej kolejności:
a) metoda dedukcyjna;
b) metoda towarów identycznych;
c) metoda towarów podobnych
X010

10. Gdy sprzedaż lub cena towaru są uzależnione od warunków lub świadczeń, których wartości nie można ustalić:
a) nie ma możliwości zastosowania wartości transakcyjnej;
b) stosuje się metodę ostatniej szansy,
c) nie można zaimportować towaru.
X100

11. Honoraria, tantiemy, opłaty licencyjne są dodawane do wartości transakcyjnej:
a) gdy sprzedający domaga się od kupującego takiej płatności jako warunek sprzedaży;
b) gdy towary mogą być sprzedane bez płatności tych honorariów;
c) tylko, gdy są wymagane na terenie UE.
X100

12. Przeliczenia kursu waluty na PLN, na potrzeby ustalenia wartości celnej, dokonuje się na podstawie:
a) kursów dziennych walut obcych;
b) bieżących kursów średnich walut obcych ogłaszanych przez NBP;
c) kursów dziennych z dnia przyjęcia zgłoszenia w procedurze dopuszczenia do obrotu.
X010

13. Koszty robocizny związanej z pakowaniem towaru mogą stanowić element dodawany do wartości transakcyjnej:
a) nie, nigdy
b) tak, to jeden z możliwych elementów doliczanych do ceny faktycznie zapłaconej lub należnej;
c) tak, ale tylko w przypadku szklanych butelek.
X010

14. W sytuacji zakwestionowania wartości transakcyjnej:
a) należy unieważnić zgłoszenie;
b) wartość celną należy ustalić metodami zastępczymi ustalania wartości celnej;
c) należy jedynie dokonać weryfikacji faktur w kraju wystawienia.
X010`,

kks: `1. Właściwość rzeczowa NUCS obejmuje:
a) przestępstwa skarbowe i wykroczenia skarbowe,
b) wskazane w ustawie o KAS przestępstwa z KK oraz wskazane w KKS przestępstwa skarbowe i wykroczenia skarbowe,
c) wskazane w ustawie o KAS przestępstwa z KK, wskazane w KKS przestępstwa skarbowe i wykroczenia skarbowe oraz czyny zabronione określone w ustawach szczególnych wskazanych w ustawie o KAS a także niektóre wykroczenia z KW i innych ustaw;
X001
2. NUCS prowadzi postępowanie przygotowawcze w sprawach o przestępstwa z art. 258, art. 270, art. 270a, art. 271, art. 271a, art. 273, art. 277a, art. 286 § 1 oraz art. 299 KK, gdy:
a) wartość przedmiotu przestępstwa stanowi mienie wielkiej wartości i zostały ujawnione przez organy KAS
b) zostały ujawnione przez SCS i w związku z nimi nastąpiło uszczuplenie lub narażenie na uszczuplenie należności publicznoprawne
c) zostały ujawnione przez KAS i w związku z nimi nastąpiło uszczuplenie lub narażenie na uszczuplenie należności publicznoprawnej,
X001
3. NUCS prowadzi postępowanie o czyny zabronione z ustaw szczególnych, gdy:
a) czyn został ujawniony przez KAS,
b) przestępstwo skarbowe, wykroczenie lub przestępstwo zostało ujawnione przez SCS.
c) przestępstwo lub wykroczenie zostało ujawnione przez SCS
X001
4. Finansowym organem postępowania przygotowawczego jest:
a) Krajowa Administracja Skarbowa
b) Dyrektor Izby Administracji Skarbowej
c) Naczelnik Urzędu Celno-Skarbowego
X001
5. Finansowym organem postępowania przygotowawczego nie jest:
a) Straż Graniczna
b) Naczelnik Urzędu Celno-Skarbowego
c) Szef Krajowej Administracji Skarbowej
X100

1. Jeżeli przepis części szczególnej KKS określa, że dany czyn zagrożony jest karą „pozbawienia wolności" bez wskazania jej wymiaru, to trwa ona:
a) najkrócej 5 dni, najdłużej 5 lat,
b) najkrócej 5 dni, najdłużej 3 lata,
c) od 6 miesięcy do 8 lat;
X100
2. Kara grzywny za przestępstwo skarbowe określana jest w stawkach dziennych, w wymiarze:
a) od 10 do 540,
b) od 10 do 720,
c) od 10 do 2000;
X010
3. Jeżeli przepis części szczególnej KKS posługuje się terminem „ustawowy próg" oznacza to, że czyn taki jest:
a) wykroczeniem zagrożonym karą grzywny w granicach od jednej dziesiątej do dwudziestokrotnej wysokości minimalnego wynagrodzenia
b) wykroczeniem skarbowym zagrożonym karą w granicach od jednej dziesiątej do pięciokrotnej wysokości minimalnego wynagrodzenia,
c) wykroczeniem skarbowym zagrożonym karą grzywny wyrażoną kwotowo;
X001
4. Wykroczeniem skarbowym jest niezgłoszenie organom celnym wywozu lub wwozu do/z Unii Europejskiej środków pieniężnych jeżeli ich wartość/równowartość:
a) nie przekracza kwoty małej wartości,
b) jest równa lub wyższa 10.000 euro,
c) a) i b),
X001
5. Kara grzywny za wykroczenie skarbowe wymierzana jest kwotowo w granicach:
a) od jednej dziesiątej do dwudziestokrotnej wysokości minimalnego wynagrodzenia,
b) od jednej dziesiątej do pięciokrotnej wysokości minimalnego wynagrodzenia,
c) od jednej dziesiątej do dziesięciokrotnej wysokości minimalnego wynagrodzenia.
X010

1. Zgodnie z definicją w ustawie Prawo własności przemysłowej, znakiem towarowym podrobionym jest:
a) użyty bezprawnie znak identyczny lub taki, który nie może być odróżniony w zwykłych warunkach obrotu od znaków zarejestrowanych, dla towarów objętych prawem ochronnym,
b) użyty nielegalnie znak tożsamy lub taki, który nie może być odróżniony w warunkach gospodarczych od znaków zarejestrowanych, dla innych towarów objętych prawem ochronnym,
c) użyty nielegalnie znak tożsamy lub taki, który nie może być odróżniony w warunkach gospodarczych od znaków zarejestrowanych, dla innych towarów objętych prawem ochronnym, przez konsumenta;
X100
2. Naczelnik urzędu celno-skarbowego posiada uprawnienia do ścigania sprawcy przestępstwa jeżeli zostało przez niego ujawnione, a polega na:
a) przygotowaniu do przywozu do Polski środków odurzających wbrew przepisom ustawy o przeciwdziałaniu narkomanii,
b) udzielaniu innej osobie środka odurzającego wbrew przepisom ustawy o przeciwdziałaniu narkomanii,
c) uprawie krzewu konopi indyjskich wbrew przepisom ustawy o przeciwdziałaniu narkomanii;
X100
3. Naczelnik urzędu celno-skarbowego posiada uprawnienia do ścigania sprawcy przestępstwa jeżeli zostało przez niego ujawnione, a polega na:
a) prowadzeniu reklamy lub promocji substancji psychotropowych wbrew przepisom ustawy o przeciwdziałaniu narkomanii,
b) kradzieży środków odurzających,
c) przewozie przez terytorium Polski substancji psychotropowych wbrew przepisom ustawy o przeciwdziałaniu narkomanii;
X001
4. Z której ustawy występki są ścigane na wniosek:
a) Ustawy Prawo Własności Przemysłowej i Ustawy o ochronie przyrody,
b) Ustawy o przeciwdziałaniu narkomani i Ustawy o prawie autorskim i prawach pokrewnych,
c) Ustawy Prawo Własności Przemysłowej i Ustawy o prawie autorskim i prawach pokrewnych;
X001
5. W której ustawie znajdują się czyny zabronione zarówno jako zbrodnia jak i wykroczenie, których ściganie jest we właściwości rzeczowej NUCS:
a) Ustawie o wyrobie alkoholu etylowego oraz wytwarzaniu wyrobów tytoniowych,
b) Ustawie o przeciwdziałaniu narkomani,
c) Ustawie o bezpieczeństwie obrotu prekursorami materiałów wybuchowych.
X010
6. Naczelnik urzędu celno-skarbowego posiada uprawnienia do ścigania sprawcy przestępstwa jeżeli zostało przez niego ujawnione a polega na:
a) dokonywaniu obrotu towarem z podrobionym znakiem towarowym,
b) przypisaniu sobie autorstwa,
c) zgłoszeniu cudzego wynalazku w celu uzyskania patentu, nie będąc do tego uprawnionym
X100

1. Organy KAS ujawniły „fabrykę pustych faktur", które przez szereg firm zostały wykorzystane do wyłudzenia podatku Vat. W sprawie wszczęto postępowanie przygotowawcze o przestępstwo z art. 271a § 1 KK w zb z art. 76 § 1 KKS i art. 62 § 2 KKS w zw. z art. 8 § 1 KKS, nadzór nad tym postępowaniem sprawuje:
a) DIAS jeżeli jest prowadzone w formie dochodzenia a prokurator jeśli jest prowadzone w formie śledztwa,
b) Zawsze prokurator,
c) Prokurator ale gdy mamy do czynienia ze zorganizowaną grupą przestępczą,
X010
2. Ujawniono przypadek wystawienia faktur, poświadczających nieprawdę co do okoliczności faktycznych mogących mieć znaczenie dla określenia wysokości należności publicznoprawnej. Powyższe należy zakwalifikować jako przestępstwo z art. 271a KK gdy,
a) Faktury zawierają kwotę należności ogółem, której łączna wartość jest znaczna,
b) Prokurator tak postanowi;
c) Faktury zawierają kwotę podatku, której wartość jest wielka,
X100
3. Wskaż przypadek „idealnego zbiegu" czynów zabronionych i stosowania art. 8 § 1 KKS:
a) Art. 62 § 2 KKS w zbiegu z art. 271a KK,
b) Art. 62 § 2 KKS w zbiegu z art. 76 § 2 KKS,
c) Art. 271a KK w zbiegu z art. 258 KK,
X100
4. Jako zbrodnie (potocznie określane „zbrodniami vatowskimi lub fakturowymi") kwalifikowane są następujące przestępstwa:
a) art. 270a § 2 KK, art. 271a § 2 KK i art. 277a § 1 KK,
b) art. 62 § 2 KKS w zbiegu z art. 76 § 1 KKS,
c) W sprawach gospodarczych zbrodnie nie występują, są zarezerwowane dla najcięższych przestępstw (morderstwo, handel narkotykami na wielką skalę itp.),
X100
5. Czy w KKS występują przestępstwa kwalifikowane jako zbrodnie?
a) Tak jeśli uszczuplono podatek w kwocie której wartość jest wielka,
b) Nie
c) Nie, chyba że kwota uszczuplonego podatku przekracza 200.000 zł
X010

1. Określenie „znaczna wartość" jest pojęciem związanym z:
a) Prawem karnym skarbowym
b) Prawem karnym
c) Kodeksem Wykroczeń
X010
2. Jednym ze sposobów wszczęcia dochodzenia jest:
a) sporządzenie notatki służbowej,
b) zatwierdzenie przez prokuratora rejonowego przeprowadzonego wcześniej przeszukania,
c) przeszukanie wykonane w granicach koniecznych dla zabezpieczenia śladów i dowodów przestępstwa skarbowego.
X001
3. Jakiej czynności nie wykonujemy w trybie art. 308 kpk
a) przeszukania
b) tymczasowego zajęcia mienia ruchomego
c) końcowego zaznajomienia z materiałem dowodowym
X001
4. Określenie „znaczna wartość" oznacza mienie, którego wartość w chwili czynu zabronionego:
a) Nie przekracza 200 tyś. zł
b) Jest równa 200 tyś zł
c) Przekracza 200 tyś zł
X001
5. Określenie „duża wartość" jest pojęciem:
a) Prawa karnego skarbowego i zachodzi gdy wartość uszczuplonego podatku przekracza 200 x minimalnego wynagrodzenia
b) Prawa karnego skarbowego i zachodzi gdy wartość uszczuplonego podatku przekracza 500 x minimalnego wynagrodzenia
c) Prawa karnego i zachodzi gdy wartość uszczuplonego podatku przekracza 500 x minimalnego wynagrodzenia
X010
6. Przesłuchanie osoby podejrzanej w trybie art. 308 § 2 kpk zaczyna się od:
a) Pytania o przebieg zdarzenia
b) Informacji o treści zarzutu wpisanego do protokołu przesłuchania podejrzanego
c) Zapoznania jej z treścią postanowienia o przedstawieniu zarzutów
X010
7. Czynności w niezbędnym zakresie (prowadzone w trybie art. 308 kpk) mogą być wykonywane w ciągu:
a) 5 dni od dnia pierwszej czynności
b) 14 dni od dnia pierwszej czynności
c) 7 dni od dnia pierwszej czynności
X100
8. Celem dochodzenia prowadzonego w niezbędnym zakresie (art. 308 kpk) jest:
a) ustalenie, czy zachodzi podejrzenie popełnienia przestępstwa,
b) przyjęcie wniosku o ściganie,
c) zabezpieczenie śladów i dowodów przestępstwa przed ich utratą
X001
9. W razie złożenia wniosku o ściganie niektórych tylko sprawców, obowiązek ścigania obejmuje:
a) również inne osoby, których czyny pozostają w ścisłym związku z czynem osoby wskazanej we wniosku, o czym należy uprzedzić składającego wniosek,
b) inne osoby, których czyny są związane z czynem osoby wskazanej we wniosku, o czym nie należy uprzedzać składającego wniosek,
c) obejmuje inne osoby, których czyny nie muszą być związane z czynem osoby wskazanej we wniosku, o czym nie należy uprzedzić składającego wniosek.
X100
10. Wniosek o ściganie może zostać cofnięty w postępowaniu przygotowawczym za zgodą prokuratora a w postępowaniu sądowym:
a) Za zgodą prokuratora - aż do zamknięcia przewodu sądowego na pierwszej rozprawie głównej,
b) Za zgodą sądu - aż do zamknięcia przewodu sądowego na pierwszej rozprawie głównej, jeżeli nie sprzeciwi się temu pokrzywdzony,
c) Za zgodą sądu - aż do zamknięcia przewodu sądowego na pierwszej rozprawie głównej, jeżeli nie sprzeciwi się temu oskarżyciel publiczny obecny na rozprawie lub posiedzeniu.
X001

1. Jeżeli dane istniejące w chwili wszczęcia dochodzenia lub zebrane w jego toku uzasadniają dostatecznie podejrzenie, że czyn popełniła określona osoba:
a) sporządza się postanowienie o przedstawieniu zarzutów, niezwłocznie ogłaszano je podejrzanemu i przesłuchano go w charakterze podejrzanego,
b) wydaje się postanowienie o przedstawieniu zarzutów, ogłasza je podejrzanemu i przesłuchuje go w charakterze podejrzanego
c) wydaje się postanowienie o przedstawieniu zarzutów, niezwłocznie ogłasza je podejrzanemu i przesłuchuje go w charakterze podejrzanego;
X001
2. Za podejrzanego uważa się osobę:
a) co do której wydano postanowienie o przedstawieniu zarzutów albo której bez wydania takiego postanowienia, postawiono zarzut w związku z przystąpieniem do przesłuchania w charakterze podejrzanego,
b) co do której wydano postanowienie o przedstawieniu zarzutów albo której bez wydania takiego postanowienia, postawiono zarzut w związku z przystąpieniem do przesłuchania w charakterze osoby podejrzanej,
c) której ogłoszono postanowienie o przedstawieniu zarzutów albo której bez takiego postanowienia, postawiono zarzut w związku z przystąpieniem do przesłuchania w charakterze podejrzanego;
X100
3. Stronami postępowania przygotowawczego w sprawach o przestępstwo skarbowe są:
a) podejrzany, podmiot pociągnięty do odpowiedzialności posiłkowej oraz pokrzywdzony
b) podejrzany, podmiot pociągnięty do odpowiedzialności posiłkowej oraz interwenient.
c) podejrzany, pokrzywdzony oraz interwenient.
X010
4. Stroną postępowania przygotowawczego w sprawach o wykroczenie skarbowe nie jest:
a) podmiot pociągnięty do odpowiedzialności posiłkowej,
b) podejrzany,
c) Interwenient
X100
5. Stronami postępowania przygotowawczego w sprawach o przestępstwo są:
a) podejrzany oraz pokrzywdzony
b) podejrzany, podmiot pociągnięty do odpowiedzialności posiłkowej oraz interwenient.
c) podejrzany, pokrzywdzony oraz interwenient.
X100
6. Z tytułu sprawowanego nadzoru prokurator może w szczególności:
a) przejąć sprawę do swego prowadzenia;
b) zmieniać i uchylać postanowienia i zarządzenia wydane przez prowadzącego postępowanie
c) obie odpowiedzi są prawidłowe
X001
7. Obligatoryjny nadzór prokuratora nad postępowaniem przygotowawczym w sprawie o przestępstwo skarbowe ma miejsce gdy:
a) podejrzany nie ukończył 18 lat;
b) podejrzany jest głuchy, niemy lub niewidomy;
c) obie odpowiedzi są prawidłowe
X001
8. Obligatoryjny nadzór prokuratora nad postępowaniem przygotowawczym w sprawie o przestępstwo skarbowe ma miejsce gdy:
a) zachodzi uzasadniona wątpliwość, czy zdolność podejrzanego rozpoznania znaczenia czynu lub kierowania swoim postępowaniem nie była w czasie popełnienia tego czynu wyłączona lub w znacznym stopniu ograniczona;
b) zachodzi uzasadniona wątpliwość, czy stan jego zdrowia psychicznego pozwala na udział w postępowaniu lub prowadzenie obrony w sposób samodzielny oraz rozsądny.
c) obie odpowiedzi są prawidłowe
X001
9. Obligatoryjny nadzór prokuratora nad postępowaniem przygotowawczym w sprawie o wykroczenie skarbowe ma miejsce
a) jeżeli prokurator, powołuje biegłego lekarza psychiatrę,
b) gdy postępowanie prowadzone jest w formie śledztwa,
c) obie odpowiedzi są błędne;
X001
10. Obligatoryjny nadzór prokuratora nad postępowaniem przygotowawczym w sprawie o przestępstwo skarbowe ma miejsce
a) gdy sąd zastosował tymczasowe aresztowanie podejrzanego,
b) gdy podejrzany nie ma polskiego obywatelstwa,
c) obie odpowiedzi są prawidłowe
X100

1. Jeżeli zatrzymanie rzeczy w trybie art. 308 kpk odbyło się przymusowo, ustawowy termin doręczenia postanowienia prokuratora o zatwierdzeniu tej czynności wynosi:
a) 7 dni,
b) 14 dni,
c) 5 dni;
X100
2. Jeżeli zatrzymanie rzeczy w trybie art. 308 kpk odbyło się dobrowolnie ale uprawniony złożył wniosek o doręczenie mu, postanowienia prokuratora o zatwierdzeniu tej czynności, ustawowy termin doręczenia wynosi:
a) 7 dni,
b) 14 dni,
c) Nie jest określony;
X010
3. Ustawowy termin do zatwierdzenia przez prokuratora przeszukania dokonanego w trybie art. 308 kpk wynosi:
a) 7 dni,
b) 14 dni,
c) 5 dni;
X100
4. Oględzin lub badań ciała, które mogą wywołać uczucie wstydu, zgodnie z kpk:
a) powinna dokonać osoba tej samej płci, chyba że łączą się z tym szczególne trudności,
b) musi zawsze dokonać osoba tej samej płci
c) Sytuacja ta nie jest unormowana przez kpk
X100
5. Zatrzymane rzeczy należy niezwłocznie zwrócić, jeżeli zatrzymanie rzeczy (lub przeszukanie) nastąpiło bez uprzedniego polecenia prokuratora, a w ciągu 7 dni od dnia czynności nie nastąpiło zatwierdzenie tej czynności, chyba że rzeczy wydano dobrowolnie, a osoba uprawniona nie złożyła wniosku o doręczenie jej:
a) postanowienia prokuratora w przedmiocie zatwierdzenia czynności,
b) postanowienia Dyrektora IAS w przedmiocie zatwierdzenia czynności,
c) postanowienia NUCS w przedmiocie zatwierdzenia czynności.
X100

1. Zatrzymanego należy natychmiast zwolnić jeżeli:
a) w ciągu 48 godzin od chwili zatrzymania przez uprawniony organ nie zostanie on przekazany do dyspozycji sądu wraz z wnioskiem o zastosowanie tymczasowego aresztowania,
b) w ciągu 24 godzin od przekazania go do dyspozycji sądu nie doręczono mu postanowienia o zastosowaniu wobec niego tymczasowego aresztowania albo nie ogłoszono mu tego postanowienia na posiedzeniu,
c) obie odpowiedzi są prawidłowe;
X001
2. Jeżeli zachowanie osoby zatrzymanej wskazuje na to, że jest ona pod wpływem alkoholu lub innego podobnie działającego środka albo z innych powodów ma zakłóconą świadomość:
a) osobę taką odsyła się do izby wytrzeźwień,
b) osobę taką poddaje się niezwłocznie badaniu lekarskiemu,
c) sytuacja ta nie jest unormowana przez kpk;
X010
3. Zatrzymanego należy zwolnić jeżeli:
a) lekarz nie wyrazi zgody na zatrzymanie lub osadzenie w pomieszczeniach dla osób zatrzymanych,
b) ustanie przyczyna zatrzymania a także na polecenie sądu lub prokuratora,
c) obie odpowiedzi są prawidłowe;
X001
4. Zatrzymanemu przysługuje prawo do wniesienia, w terminie:
a) 7 dni od dnia zatrzymania, zażalenia na zatrzymanie do sądu rejonowego właściwego ze względu na miejsce zatrzymania lub prowadzenia postępowania,
b) 14 dni od dnia zatrzymania, zażalenia na sposób przeprowadzenia zatrzymania do prokuratora właściwego ze względu na miejsce zatrzymania,
c) obie odpowiedzi są prawidłowe;
X100
5. Funkcjonariusz dokonujący zatrzymania nie jest zobowiązany do:
a) sprawdzenia czy osoba zatrzymana posiada przy sobie broń, inne niebezpieczne przedmioty oraz ich odebrania,
b) ustalenia tożsamości osoby zatrzymanej,
c) przesłuchania osoby zatrzymanej na okoliczność zatrzymania
X001`
};

})();
