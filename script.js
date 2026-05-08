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
    },

    // Error mode (uses quiz machinery with mode flag)
    errorMode: {
        active: false,
        deck: []
    },

    // Mock exam
    mock: {
        active: false,
        questions: [],     // [{ ...question, categoryId, categoryLabel }]
        index: 0,
        answers: [],       // [{ selectedIndexes, skipped }]
        startedAt: 0,
        endsAt: 0,
        timerId: null,
        finishedSummary: null
    },

    // Oral simulator
    oral: {
        deck: [],
        index: 0,
        known: 0,
        total: 0,
        timerId: null,
        timeLeft: 0,
        revealed: false
    },

    // Dialog mode
    dialog: {
        scriptId: null,
        script: null,
        index: 0,
        known: 0,
        revealed: false,
        history: []        // [{ q, a, known }]
    }
};

const STORAGE = {
    THEME:          'zktest_theme',
    SESSION:        (id) => `zktest_session_${id}`,
    TRAINER:        (id) => `zktest_trainer_${id}`,
    ERRORS:         'zktest_errors_v1',
    STATS:          'zktest_stats_v1',
    DIALOG_DONE:    'zktest_dialog_done_v1',
    FC_SESSION:     (id) => `zktest_fc_${id}`,
    MOCK_SESSION:   'zktest_mock_session_v1',
    ORAL_SESSION:   'zktest_oral_session_v1',
    DIALOG_SESSION: (id) => `zktest_dialog_${id}`,
    MOCK_SEEN:      'zktest_mock_seen_v1'
};

// ── Mock exam categories ─────────────────────────────────
const EXAM_CATEGORIES = [
    {
        id: 'system_prawa',
        label: 'System prawa',
        count: 8,
        folderIds: ['Cywilne']          // 'Różne' przeniesione do MIXED_FOLDERS
    },
    {
        id: 'prawo_celne',
        label: 'Prawo celne',
        count: 16,
        folderIds: ['Celne', 'Celne_2', 'Celne_3', 'sp_procedury', 'sp_pochodzenie', 'sp_taryfa', 'sp_wartosc']
    },
    {
        id: 'podatki',
        label: 'Podatki',
        count: 12,
        folderIds: ['Podatki', 'Akcyza']
    },
    {
        id: 'prawo_karne',
        label: 'Prawo karne',
        count: 12,
        folderIds: ['Karne', 'sp_kks']
    },
    {
        id: 'kontrola',
        label: 'Kontrola',
        count: 12,
        folderIds: ['Kontrola']
    }
];

// Foldery z mieszaną tematyką — każde pytanie klasyfikowane na podstawie treści
const MIXED_FOLDERS = ['Różne'];

const MOCK_EXAM_MINUTES = 60;

// ── Dialog scripts (curated oral exam dialogues) ────────
const DIALOG_SCRIPTS = [
    {
        id: 'dlg_wit',
        title: 'WIT — Wiążąca Informacja Taryfowa',
        intro: 'Egzaminator pyta cię o decyzję WIT. Przejdź przez sekwencję pytań pogłębiających.',
        steps: [
            { q: 'Co to jest WIT?', a: 'Wiążąca Informacja Taryfowa — decyzja organu celnego dotycząca klasyfikacji taryfowej (kodu CN/HS) konkretnego towaru. Wiąże organy celne państw członkowskich UE wobec posiadacza decyzji.' },
            { q: 'Kto wydaje WIT w Polsce?', a: 'W Polsce WIT wydaje Dyrektor Krajowej Informacji Skarbowej (KIS).' },
            { q: 'Jak długo jest ważna decyzja WIT?', a: 'WIT jest co do zasady ważny przez 3 lata od dnia wejścia w życie decyzji.' },
            { q: 'Czy WIT może wcześniej utracić ważność?', a: 'Tak — m.in. gdy zostanie zmieniona Nomenklatura Scalona (CN), wydane zostanie rozporządzenie o klasyfikacji, decyzja stanie się niezgodna z prawem albo zostanie cofnięta/unieważniona.' },
            { q: 'Czy WIT obowiązuje tylko w Polsce, czy w całej UE?', a: 'WIT wiąże wszystkie organy celne państw członkowskich UE, ale tylko wobec posiadacza decyzji i wobec konkretnego towaru, dla którego została wydana.' }
        ]
    },
    {
        id: 'dlg_pochodzenie',
        title: 'Pochodzenie towaru i preferencje',
        intro: 'Pytania pogłębiające o pochodzeniu i dokumentach pochodzenia.',
        steps: [
            { q: 'Czym różni się pochodzenie preferencyjne od niepreferencyjnego?', a: 'Niepreferencyjne ustala kraj pochodzenia dla statystyk, oznaczeń i środków handlowych — nie daje obniżonych stawek. Preferencyjne pozwala zastosować obniżone (np. zerowe) stawki celne na podstawie umowy o wolnym handlu lub GSP.' },
            { q: 'Wymień ogólne zasady pochodzenia preferencyjnego.', a: 'Cztery zasady: bezpośredniego transportu, tożsamości (towar dostarczony w niezmienionym stanie), terytorialności i dokumentowania pochodzenia.' },
            { q: 'Co to jest GSP?', a: 'Generalised System of Preferences — Ogólny System Preferencji UE. Jednostronne preferencje przyznawane krajom rozwijającym się i najsłabiej rozwiniętym.' },
            { q: 'Co to jest REX?', a: 'System zarejestrowanych eksporterów. Zastępuje świadectwa FORM A w GSP — eksporterzy zarejestrowani w REX sami sporządzają deklarację pochodzenia.' },
            { q: 'Wymień typowe dowody pochodzenia preferencyjnego.', a: 'EUR.1, EUR-MED, deklaracja pochodzenia upoważnionego eksportera, oświadczenie o pochodzeniu w systemie REX, FORM A (dawniej w GSP).' },
            { q: 'Co to jest świadectwo ATR i ile jest ważne?', a: 'Świadectwo dokumentujące status celny towaru w wymianie z Turcją (unia celna UE-Turcja). Ważne 4 miesiące.' }
        ]
    },
    {
        id: 'dlg_procedury',
        title: 'Procedury celne i odwołania',
        intro: 'Postępowanie w sprawach celnych — terminy, organy, doręczenia.',
        steps: [
            { q: 'Jakie przepisy stosuje się w Polsce do postępowania w sprawach celnych?', a: 'Przepisy ustawy Ordynacja podatkowa (przez odesłanie z Prawa celnego) oraz Unijnego Kodeksu Celnego (UKC).' },
            { q: 'W jakim terminie wnosi się odwołanie od decyzji w zakresie prawa celnego?', a: 'W terminie 14 dni od dnia doręczenia decyzji stronie.' },
            { q: 'Gdzie składa się odwołanie?', a: 'W państwie członkowskim, w którym decyzja została wydana — czyli w Polsce, do polskiego organu drugiej instancji za pośrednictwem organu, który decyzję wydał.' },
            { q: 'Co to jest decyzja niekorzystna?', a: 'Decyzja wydana na wniosek, która nie uwzględnia go w pełni (np. odmawia, ogranicza, narzuca warunki).' },
            { q: 'Co organ celny robi przed wydaniem decyzji niekorzystnej?', a: 'Daje wnioskodawcy możliwość przedstawienia stanowiska — termin to 30 dni.' },
            { q: 'W jakim terminie organ wydaje decyzję od daty przyjęcia wniosku?', a: 'Co do zasady 120 dni od daty przyjęcia wniosku.' },
            { q: 'Kiedy decyzja zaczyna obowiązywać?', a: 'Z dniem jej doręczenia lub uznania za doręczoną.' }
        ]
    },
    {
        id: 'dlg_wartosc',
        title: 'Wartość celna',
        intro: 'Metody ustalania wartości celnej i ich kolejność.',
        steps: [
            { q: 'Co stanowi podstawę obliczenia cła?', a: 'Wartość celna towaru — z reguły wartość transakcyjna (cena faktycznie zapłacona lub należna) z określonymi korektami z UKC.' },
            { q: 'Wymień kolejność stosowania metod ustalania wartości celnej.', a: '1) wartość transakcyjna, 2) wartość transakcyjna towarów identycznych, 3) wartość transakcyjna towarów podobnych, 4) metoda dedukcyjna, 5) metoda wartości kalkulowanej, 6) metoda ostatniej szansy. Wyjątek: kolejność 4 i 5 może być na wniosek importera odwrócona.' },
            { q: 'Co dolicza się do wartości transakcyjnej?', a: 'M.in. prowizje i koszty pośrednictwa (oprócz prowizji od zakupu), opakowania, koszty transportu i ubezpieczenia do miejsca wprowadzenia na obszar UE, honoraria/tantiemy/opłaty licencyjne stanowiące warunek sprzedaży, robociznę przy pakowaniu.' },
            { q: 'Czego nie wlicza się do wartości transakcyjnej?', a: 'Kosztów transportu po wprowadzeniu na obszar celny UE, ceł i podatków pobieranych w UE, prowizji od zakupu, opłat za prawo do reprodukcji w UE.' },
            { q: 'Co to są reguły INCOTERMS?', a: 'Międzynarodowe reguły handlowe regulujące podział kosztów i ryzyka dostawy między sprzedającym a kupującym (np. EXW, FOB, CIF, DAP, DDP).' },
            { q: 'Po jakim kursie przelicza się walutę dla wartości celnej?', a: 'Po bieżącym kursie średnim walut obcych ogłaszanym przez NBP (z przedostatniej środy miesiąca, obowiązującym przez cały następny miesiąc).' }
        ]
    },
    {
        id: 'dlg_taryfa',
        title: 'Nomenklatura taryfowa i klasyfikacja',
        intro: 'Budowa taryfy celnej, ORINS, TARIC.',
        steps: [
            { q: 'Z czego zbudowana jest nomenklatura taryfowa?', a: 'Z sekcji, działów, pozycji i podpozycji.' },
            { q: 'Ile cyfr ma pozycja HS, a ile kod CN?', a: 'Pozycja HS = 6 cyfr (rozpoznawana w pierwszych 4 cyfrach jako "pozycja"), kod CN = 8 cyfr, kod TARIC = 10 cyfr.' },
            { q: 'Ile sekcji ma nomenklatura taryfowa?', a: '21 sekcji.' },
            { q: 'Co to są ORINS?', a: 'Ogólne Reguły Interpretacji Nomenklatury Scalonej — zestaw 6 reguł stosowanych przy klasyfikacji taryfowej towarów.' },
            { q: 'Do czego służy reguła 5 ORINS?', a: 'Do klasyfikacji opakowań i pojemników przewożonych wraz z towarem (np. futerał na broń klasyfikuje się razem z bronią, jeśli nadaje się do długotrwałego użytkowania).' },
            { q: 'Co to jest TARIC i kto go prowadzi?', a: 'Zintegrowana Taryfa Wspólnot Europejskich — internetowa baza danych prowadzona przez Komisję Europejską (DG TAXUD), nie jest źródłem prawa.' },
            { q: 'Co to jest ISZTAR?', a: 'Polski system informacyjny zawierający nomenklaturę towarową, stawki celne, dane krajowe (VAT, akcyza), ograniczenia w imporcie i eksporcie.' }
        ]
    },
    {
        id: 'dlg_kks',
        title: 'KKS — postępowanie przygotowawcze',
        intro: 'Właściwość rzeczowa NUCS, podejrzany, zatrzymanie, nadzór prokuratora.',
        steps: [
            { q: 'Co obejmuje właściwość rzeczowa NUCS?', a: 'Wskazane w ustawie o KAS przestępstwa z KK, wskazane w KKS przestępstwa skarbowe i wykroczenia skarbowe oraz czyny zabronione z ustaw szczególnych wskazanych w ustawie o KAS, a także niektóre wykroczenia z KW.' },
            { q: 'Kto jest finansowym organem postępowania przygotowawczego?', a: 'M.in. Naczelnik Urzędu Celno-Skarbowego, Naczelnik Urzędu Skarbowego, Szef KAS i Dyrektor IAS — w określonych sprawach. Straż Graniczna NIE jest organem finansowym.' },
            { q: 'Co oznacza pojęcie "znaczna wartość"?', a: 'Mienie, którego wartość w chwili czynu zabronionego przekracza 200 tysięcy złotych. To pojęcie z prawa karnego.' },
            { q: 'Kim jest podejrzany?', a: 'Osoba, co do której wydano postanowienie o przedstawieniu zarzutów, albo której bez takiego postanowienia postawiono zarzut w związku z przystąpieniem do przesłuchania w charakterze podejrzanego.' },
            { q: 'Kiedy obligatoryjny jest nadzór prokuratora w sprawie o przestępstwo skarbowe?', a: 'M.in. gdy podejrzany nie ukończył 18 lat, jest głuchy/niemy/niewidomy, są wątpliwości co do poczytalności, lub gdy sąd zastosował tymczasowe aresztowanie.' },
            { q: 'Ile trwają czynności w trybie art. 308 kpk?', a: 'Mogą być wykonywane w ciągu 5 dni od dnia pierwszej czynności.' },
            { q: 'Jaki jest termin doręczenia postanowienia prokuratora o zatwierdzeniu zatrzymania rzeczy w trybie art. 308 kpk (przymusowo)?', a: '7 dni.' }
        ]
    }
];

// ── Curated oral topics (used by oral simulator) ────────
const ORAL_TOPICS = [
    { topic: 'Co to jest WIT i kto go wydaje?', answer: 'Wiążąca Informacja Taryfowa — decyzja o klasyfikacji taryfowej. W Polsce wydaje ją Dyrektor Krajowej Informacji Skarbowej. Ważna 3 lata.' },
    { topic: 'Wymień zasady pochodzenia preferencyjnego.', answer: 'Bezpośredniego transportu, tożsamości, terytorialności, dokumentowania pochodzenia.' },
    { topic: 'Z czego zbudowana jest nomenklatura taryfowa?', answer: 'Sekcji (21), działów, pozycji (HS — 4/6 cyfr), podpozycji. CN = 8 cyfr, TARIC = 10 cyfr.' },
    { topic: 'Co stanowi podstawę obliczenia cła?', answer: 'Wartość celna towaru — co do zasady wartość transakcyjna z korektami z UKC.' },
    { topic: 'Wymień metody ustalania wartości celnej.', answer: 'Transakcyjna, identyczne, podobne, dedukcyjna, kalkulowana, ostatniej szansy. Kolejność 4-5 odwracalna na wniosek.' },
    { topic: 'W jakim terminie wnosi się odwołanie od decyzji celnej?', answer: '14 dni od doręczenia decyzji stronie.' },
    { topic: 'Co to jest decyzja niekorzystna?', answer: 'Decyzja wydana na wniosek, która nie uwzględnia go w pełni. Przed wydaniem organ daje wnioskodawcy 30 dni na stanowisko.' },
    { topic: 'Co to jest GSP?', answer: 'Ogólny System Preferencji — jednostronne preferencje UE dla krajów rozwijających się i najsłabiej rozwiniętych.' },
    { topic: 'Co to jest REX?', answer: 'System zarejestrowanych eksporterów. Eksporterzy w REX sami sporządzają deklarację o pochodzeniu (m.in. w GSP).' },
    { topic: 'Co to jest TARIC?', answer: 'Zintegrowana Taryfa UE — baza danych prowadzona przez DG TAXUD. Nie jest źródłem prawa, ale gromadzi środki taryfowe i pozataryfowe.' },
    { topic: 'Co to jest ISZTAR?', answer: 'Polski system informacyjny — nomenklatura, stawki, podatki krajowe, ograniczenia importowe/eksportowe.' },
    { topic: 'Co to są ORINS?', answer: 'Ogólne Reguły Interpretacji Nomenklatury Scalonej — 6 reguł klasyfikacji taryfowej.' },
    { topic: 'Co obejmuje właściwość rzeczowa NUCS?', answer: 'Przestępstwa z KK wskazane w ustawie o KAS, przestępstwa i wykroczenia skarbowe z KKS, czyny z ustaw szczególnych, niektóre wykroczenia z KW.' },
    { topic: 'Wymień finansowe organy postępowania przygotowawczego.', answer: 'NUCS, NUS, Szef KAS, Dyrektor IAS w określonych sprawach. Straż Graniczna nie jest organem finansowym.' },
    { topic: 'Czym jest "znaczna wartość" w prawie karnym?', answer: 'Mienie, którego wartość w chwili czynu przekracza 200 tysięcy złotych.' },
    { topic: 'Podaj kary za przestępstwo skarbowe w stawkach dziennych.', answer: 'Kara grzywny: od 10 do 720 stawek dziennych.' },
    { topic: 'Co to jest "ustawowy próg" w KKS?', answer: 'Wykroczenie skarbowe zagrożone karą grzywny wyrażoną kwotowo (od 1/10 do 20-krotności minimalnego wynagrodzenia).' },
    { topic: 'Reguły INCOTERMS — czego dotyczą?', answer: 'Podziału kosztów i ryzyka dostawy między sprzedającym a kupującym (np. EXW, FOB, CIF, DAP, DDP).' },
    { topic: 'Co to jest świadectwo ATR i ile jest ważne?', answer: 'Dokument statusu celnego w wymianie UE-Turcja. Ważne 4 miesiące.' },
    { topic: 'Co to jest świadectwo o niemanipulowaniu towarem?', answer: 'Potwierdza zachowanie dozoru celnego dla towarów transportowanych między stronami umowy o wolnym handlu.' }
];

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
    updateErrorBadge();
    handleHashRoute();
    window.addEventListener('hashchange', handleHashRoute);

    // Auto-save state when user hides the tab or closes the window
    const persistAll = () => {
        try {
            if (state.mock.active) saveMockSession();
            if (state.fc.deck && state.fc.deck.length > 0) saveFCSession();
            if (state.oral.deck && state.oral.deck.length > 0) saveOralSession();
        } catch (_) {}
    };
    document.addEventListener('visibilitychange', () => { if (document.hidden) persistAll(); });
    window.addEventListener('pagehide', persistAll);
    window.addEventListener('beforeunload', persistAll);
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

    // continue prompt (handles both quiz and flashcards)
    $('#continueResumeBtn').addEventListener('click', () => {
        if (state.pendingResumeMode === 'flash') resumeFCSession();
        else resumeQuizSession();
    });
    $('#continueRestartBtn').addEventListener('click', () => {
        if (!state.pendingFolderId) return;
        if (state.pendingResumeMode === 'flash') {
            startFlashcards(state.pendingFolderId, true);
        } else {
            startQuiz(state.pendingFolderId, true);
        }
    });
    $('#continueCancelBtn').addEventListener('click', () => {
        state.pendingResumeMode = null;
        navigate('tests');
    });

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

    // Action chips
    $('#goErrorMode').addEventListener('click', openErrorMode);
    $('#goMockExam').addEventListener('click', openMockExamSetup);
    $('#goHeatmap').addEventListener('click', openHeatmap);
    $('#goOralSim').addEventListener('click', openOralSim);
    $('#goDialog').addEventListener('click', openDialogList);

    // Error mode buttons
    $('#errorClearBtn').addEventListener('click', () => {
        if (!confirm('Wyczyścić całą pulę błędów?')) return;
        clearErrorPool();
        renderErrorMode();
        toast('Pula błędów wyczyszczona');
    });
    $('#errorStartBtn').addEventListener('click', () => startErrorQuiz('quiz'));
    $('#errorFlashBtn').addEventListener('click', () => startErrorQuiz('flash'));

    // Mock exam buttons
    $('#mockStartBtn').addEventListener('click', () => {
        const saved = loadMockSession();
        if (saved && saved.questions && saved.questions.length > 0) {
            if (!confirm('Masz nieukończony egzamin. Rozpoczęcie nowego nadpisze go. Kontynuować?')) return;
        }
        startMockExam();
    });
    $('#mockResumeBtn').addEventListener('click', resumeMockExam);
    $('#mockDiscardBtn').addEventListener('click', () => {
        if (!confirm('Usunąć zapisany egzamin?')) return;
        clearMockSession();
        $('#mockResumeBanner').classList.add('hidden');
        toast('Zapisany egzamin usunięty');
    });
    $('#mockAbortBtn').addEventListener('click', abortMockExam);
    $('#mockPrevBtn').addEventListener('click', mockGoPrev);
    $('#mockSkipBtn').addEventListener('click', mockGoNext);
    $('#mockNextBtn').addEventListener('click', mockGoNext);
    $('#mockSubmitBtn').addEventListener('click', mockSubmit);
    $('#mockRetryBtn').addEventListener('click', () => { openMockExamSetup(); });
    $('#mockReviewBtn').addEventListener('click', () => {
        const list = $('#mockEndResults');
        if (list) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Heatmap
    $('#heatmapResetBtn').addEventListener('click', () => {
        if (!confirm('Wyczyścić wszystkie statystyki folderów?')) return;
        clearStats();
        renderHeatmap();
        toast('Statystyki wyczyszczone');
    });

    // Oral simulator
    $('#oralRevealBtn').addEventListener('click', oralReveal);
    $('#oralRateYes').addEventListener('click', () => oralRate(true));
    $('#oralRateNo').addEventListener('click', () => oralRate(false));
    $('#oralShuffleBtn').addEventListener('click', () => { startOralSim(); toast('Pula przetasowana'); });
    $('#oralTimerSelect').addEventListener('change', oralReset);
    $('#oralResumeBtn').addEventListener('click', resumeOralSession);
    $('#oralDiscardBtn').addEventListener('click', () => {
        if (!confirm('Usunąć zapisaną sesję ustnego?')) return;
        clearOralSession();
        startOralSim();
        toast('Zapisana sesja usunięta');
    });

    // Dialog
    $('#dialogBackBtn').addEventListener('click', openDialogList);
    $('#dialogRevealBtn').addEventListener('click', dialogReveal);
    $('#dialogRateYes').addEventListener('click', () => dialogRate(true));
    $('#dialogRateNo').addEventListener('click', () => dialogRate(false));
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

    // Cleanup: leaving runner views resets stale state
    if (view !== 'quiz' && view !== 'flashcards' && view !== 'end') {
        state.errorMode.active = false;
    }
    if (view !== 'mock-run') stopMockTimer();
    if (view !== 'oral-sim') stopOralTimer();

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

// ── Question fingerprinting (stable hash of normalized text) ──
function simpleHash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return (h >>> 0).toString(36);
}
function fingerprintQuestion(q) {
    const normalized = String(q.questionText || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .slice(0, 220);
    return 'q_' + simpleHash(normalized + '|' + (q.options || []).length);
}

// ── Error pool (questions answered wrong) ──────────────────
function loadErrorPool() {
    try {
        const raw = localStorage.getItem(STORAGE.ERRORS);
        return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
}
function saveErrorPool(pool) {
    try { localStorage.setItem(STORAGE.ERRORS, JSON.stringify(pool)); } catch (_) {}
}
function errorPoolList() {
    const pool = loadErrorPool();
    return Object.values(pool);
}
function recordError(q, folderId, folderTitle) {
    const pool = loadErrorPool();
    const fp = fingerprintQuestion(q);
    pool[fp] = {
        fp,
        questionText: q.questionText,
        options: q.options,
        correctIndexes: q.correctIndexes,
        folderId: folderId || pool[fp]?.folderId || '',
        folderTitle: folderTitle || pool[fp]?.folderTitle || '',
        addedAt: pool[fp]?.addedAt || Date.now()
    };
    saveErrorPool(pool);
    updateErrorBadge();
}
function removeError(q) {
    const pool = loadErrorPool();
    const fp = fingerprintQuestion(q);
    if (pool[fp]) {
        delete pool[fp];
        saveErrorPool(pool);
        updateErrorBadge();
    }
}
function clearErrorPool() {
    saveErrorPool({});
    updateErrorBadge();
}
function updateErrorBadge() {
    const badge = document.getElementById('errorBadge');
    if (!badge) return;
    const n = Object.keys(loadErrorPool()).length;
    badge.textContent = n;
    badge.dataset.empty = n === 0 ? 'true' : 'false';
}

// ── Per-folder stats (attempted / correct) ─────────────────
function loadStats() {
    try {
        const raw = localStorage.getItem(STORAGE.STATS);
        return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
}
function saveStats(s) {
    try { localStorage.setItem(STORAGE.STATS, JSON.stringify(s)); } catch (_) {}
}
function recordStat(folderId, isCorrect) {
    if (!folderId) return;
    const s = loadStats();
    if (!s[folderId]) s[folderId] = { attempted: 0, correct: 0 };
    s[folderId].attempted += 1;
    if (isCorrect) s[folderId].correct += 1;
    saveStats(s);
}
function clearStats() {
    saveStats({});
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

    // Record stats + error pool
    const folderId = state.errorMode.active ? '' : (state.selectedFolder ? state.selectedFolder.id : '');
    const folderTitle = state.selectedFolder ? state.selectedFolder.title : '';
    if (!state.errorMode.active && folderId) recordStat(folderId, ok);
    if (ok) removeError(q);
    else recordError(q, folderId, folderTitle);

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
    const pct = total > 0 ? Math.round((state.quiz.score / total) * 100) : 0;
    $('#endTitle').textContent = 'Koniec quizu!';
    $('#endSummary').textContent = `${state.selectedFolder.title} · ${state.quiz.score} / ${total} poprawnych odpowiedzi · ${pct}%`;
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

// ── Flashcards session persistence ─────────────────────────
function saveFCSession() {
    if (!state.selectedFolder || state.errorMode.active) return;
    if (!state.fc.deck || state.fc.deck.length === 0) return;
    try {
        localStorage.setItem(STORAGE.FC_SESSION(state.selectedFolder.id), JSON.stringify({
            folderId: state.selectedFolder.id,
            folderTitle: state.selectedFolder.title,
            deck: state.fc.deck,
            seen: state.fc.seen,
            known: state.fc.known,
            total: state.fc.total,
            savedAt: Date.now()
        }));
    } catch (_) {}
}
function loadFCSession(folderId) {
    try {
        const raw = localStorage.getItem(STORAGE.FC_SESSION(folderId));
        return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
}
function clearFCSession(folderId) {
    localStorage.removeItem(STORAGE.FC_SESSION(folderId));
}

// ── Flashcards mode (test-based) ───────────────────────────
function startFlashcards(folderId, fresh = false) {
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return;
    state.selectedFolder = folder;
    state.pendingFolderId = null;

    if (!fresh) {
        const saved = loadFCSession(folderId);
        if (saved && saved.deck && saved.deck.some(it => it.status !== 'known')) {
            state.pendingFolderId = folderId;
            state.pendingResumeMode = 'flash';
            const remaining = saved.deck.filter(it => it.status !== 'known').length;
            $('#continueInfo').textContent =
                `Fiszki: pozostało ${remaining} / ${saved.total} · oznaczone „umiem": ${saved.known}`;
            navigate('continue');
            return;
        }
    } else {
        clearFCSession(folderId);
    }

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

function resumeFCSession() {
    const folderId = state.pendingFolderId;
    if (!folderId) return;
    const saved = loadFCSession(folderId);
    if (!saved) return startFlashcards(folderId, true);
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return;

    state.selectedFolder = folder;
    state.fc.deck = saved.deck;
    state.fc.seen = saved.seen || 0;
    state.fc.known = saved.known || 0;
    state.fc.total = saved.total || saved.deck.length;
    state.fc.flipped = false;
    state.fc.current = null;
    state.pendingFolderId = null;
    state.pendingResumeMode = null;

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
        const fcPct = state.fc.total > 0 ? Math.round((state.fc.known / state.fc.total) * 100) : 0;
        $('#endTitle').textContent = 'Świetnie!';
        $('#endSummary').textContent = `${state.selectedFolder.title} · oznaczone jako „umiem": ${state.fc.known} / ${state.fc.total} · ${fcPct}%`;
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
    saveFCSession();

    // If deck finished — clear session
    const remaining = state.fc.deck.filter(it => it.status !== 'known');
    if (remaining.length === 0 && state.selectedFolder && !state.errorMode.active) {
        clearFCSession(state.selectedFolder.id);
    }

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
   ERROR MODE
   ────────────────────────────────────────────────────────── */
function openErrorMode() {
    state.errorMode.active = false;
    renderErrorMode();
    navigate('error-mode');
}

function renderErrorMode() {
    const list = errorPoolList();
    const info = $('#errorPoolInfo');
    const hint = $('#errorHint');
    const start = $('#errorStartBtn');
    const flash = $('#errorFlashBtn');
    const clearBtn = $('#errorClearBtn');
    const wrap = $('#errorList');

    info.textContent = `Liczba pytań w puli: ${list.length}`;
    const empty = list.length === 0;
    start.disabled = empty;
    flash.disabled = empty;
    clearBtn.disabled = empty;
    start.style.opacity = empty ? .5 : 1;
    flash.style.opacity = empty ? .5 : 1;
    clearBtn.style.opacity = empty ? .5 : 1;
    hint.classList.toggle('hidden', !empty);

    wrap.innerHTML = '';
    if (empty) {
        const div = document.createElement('div');
        div.className = 'error-list-empty';
        div.textContent = 'Brak błędów. Świetnie — albo jeszcze nic nie rozwiązałeś.';
        wrap.appendChild(div);
        return;
    }

    list
        .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
        .slice(0, 50)
        .forEach((it, idx) => {
            const row = document.createElement('div');
            row.className = 'error-list-item';
            const src = document.createElement('div');
            src.className = 'error-list-item__src';
            src.textContent = `${idx + 1}. ${it.folderTitle || 'Inne'}`;
            const txt = document.createElement('div');
            txt.innerHTML = String(it.questionText || '').replace(/<br>/g, ' ').replace(/<[^>]+>/g, ' ');
            row.appendChild(src);
            row.appendChild(txt);
            wrap.appendChild(row);
        });

    if (list.length > 50) {
        const more = document.createElement('div');
        more.className = 'muted';
        more.style.cssText = 'text-align:center; padding:12px; font-size:.85rem;';
        more.textContent = `…oraz ${list.length - 50} więcej`;
        wrap.appendChild(more);
    }
}

function startErrorQuiz(mode) {
    const list = errorPoolList();
    if (list.length === 0) return;

    const questions = list.map(it => ({
        questionText: it.questionText,
        options: it.options,
        correctIndexes: it.correctIndexes,
        filename: it.folderTitle || ''
    }));

    state.errorMode.active = true;
    state.selectedFolder = { id: '__errors__', title: 'Tryb błędów', questionCount: questions.length };

    if (mode === 'flash') {
        state.fc.deck = shuffleArray(questions).map(q => ({ q, status: 'pending' }));
        state.fc.seen = 0;
        state.fc.known = 0;
        state.fc.total = state.fc.deck.length;
        state.fc.flipped = false;
        state.fc.current = null;
        $('#fcTestName').textContent = 'Tryb błędów';
        navigate('flashcards');
        nextFlashcard();
    } else {
        state.quiz.questions = shuffleArray(questions);
        state.quiz.index = 0;
        state.quiz.score = 0;
        state.quiz.results = [];
        $('#quizTestName').textContent = 'Tryb błędów';
        navigate('quiz');
        renderQuizQuestion();
    }
}

/* ──────────────────────────────────────────────────────────
   MOCK EXAM
   ────────────────────────────────────────────────────────── */
function buildCategoryPool(category) {
    // Returns array of all parsed questions from folders matching this category.
    const qs = [];
    category.folderIds.forEach(fid => {
        const folder = state.folders.find(f => f.id === fid);
        if (!folder) return;
        try {
            const parsed = loadQuestions(folder);
            parsed.forEach(q => {
                qs.push({
                    questionText: q.questionText,
                    options: q.options,
                    correctIndexes: q.correctIndexes,
                    sourceFolderId: folder.id,
                    sourceFolderTitle: folder.title,
                    categoryId: category.id,
                    categoryLabel: category.label
                });
            });
        } catch (_) {}
    });
    return qs;
}

// ── Mock session persistence ────────────────────────────
function saveMockSession() {
    if (!state.mock.active) return;
    try {
        const remainingMs = Math.max(0, state.mock.endsAt - Date.now());
        localStorage.setItem(STORAGE.MOCK_SESSION, JSON.stringify({
            questions: state.mock.questions,
            answers: state.mock.answers,
            index: state.mock.index,
            remainingMs,
            savedAt: Date.now()
        }));
    } catch (_) {}
}
function loadMockSession() {
    try {
        const raw = localStorage.getItem(STORAGE.MOCK_SESSION);
        return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
}
function clearMockSession() {
    localStorage.removeItem(STORAGE.MOCK_SESSION);
}
function resumeMockExam() {
    const saved = loadMockSession();
    if (!saved) return;
    state.mock.active = true;
    state.mock.questions = saved.questions;
    state.mock.answers = saved.answers || saved.questions.map(() => []);
    state.mock.index = Math.min(saved.index || 0, saved.questions.length - 1);
    state.mock.startedAt = Date.now();
    state.mock.endsAt = Date.now() + Math.max(saved.remainingMs || 0, 1000);
    state.mock.finishedSummary = null;
    navigate('mock-run');
    renderMockQuestion();
    startMockTimer();
}

function openMockExamSetup() {
    // Resume banner
    const saved = loadMockSession();
    const banner = $('#mockResumeBanner');
    if (saved && saved.questions && saved.questions.length > 0) {
        const minutes = Math.max(1, Math.round(saved.remainingMs / 60000));
        const answered = (saved.answers || []).filter(a => a && a.length > 0).length;
        $('#mockResumeInfo').textContent =
            `Pytanie ${(saved.index || 0) + 1} / ${saved.questions.length} · odpowiedzi: ${answered} · pozostało ok. ${minutes} min`;
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }

    // Render breakdown showing how many questions are available per category
    const wrap = $('#catBreakdown');
    wrap.innerHTML = '';
    let totalRequested = 0;
    let totalAvailable = 0;
    const warnings = [];

    EXAM_CATEGORIES.forEach(cat => {
        const pool = buildCategoryPool(cat);
        totalRequested += cat.count;
        totalAvailable += Math.min(pool.length, cat.count);
        if (pool.length < cat.count) {
            warnings.push(`${cat.label}: w bazie jest ${pool.length} pytań (potrzeba ${cat.count})`);
        }
        const row = document.createElement('div');
        row.className = 'cat-breakdown__row';
        row.innerHTML = `
            <span class="cat-breakdown__label"></span>
            <span class="cat-breakdown__count"></span>
        `;
        row.querySelector('.cat-breakdown__label').textContent = cat.label;
        row.querySelector('.cat-breakdown__count').textContent = `${cat.count} pytań`;
        wrap.appendChild(row);
    });

    const tot = document.createElement('div');
    tot.className = 'cat-breakdown__row cat-breakdown__total';
    tot.innerHTML = `<span>Łącznie</span><span class="cat-breakdown__count">${totalRequested} pytań</span>`;
    wrap.appendChild(tot);

    if (warnings.length > 0) {
        const w = document.createElement('div');
        w.className = 'cat-breakdown__warn';
        w.innerHTML = '<strong>Uwaga:</strong> ' + warnings.join(' · ');
        wrap.appendChild(w);
    }

    navigate('mock-setup');
}

// ── Mock exam seen-questions helpers ─────────────────────
function loadMockSeen() {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE.MOCK_SEEN)) || []); } catch (_) { return new Set(); }
}
function saveMockSeen(seenSet) {
    try { localStorage.setItem(STORAGE.MOCK_SEEN, JSON.stringify([...seenSet])); } catch (_) {}
}
function clearMockSeen() {
    try { localStorage.removeItem(STORAGE.MOCK_SEEN); } catch (_) {}
}
function questionKey(q) {
    return (q.questionText || '').trim().slice(0, 120);
}

// ── Content-based question classifier ────────────────────
// Klasyfikuje pytanie do kategorii na podstawie słów kluczowych w treści.
// Zwraca categoryId lub null gdy pytanie niejednoznaczne.
function classifyQuestion(q) {
    // Normalizacja: małe litery, bez diakrytyków
    const t = (q.questionText || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '');

    const scores = { podatki: 0, prawo_celne: 0, prawo_karne: 0, kontrola: 0, system_prawa: 0 };

    // ── KONTROLA (sprawdź PRZED prawo_celne — "celno-skarbowy" to kontrola, nie prawo celne)
    if (/urz[ae]d celno.?skarbow|naczelnik.*celno.?skarbow|celno.?skarbow/.test(t)) scores.kontrola += 4;
    if (/\bnucs\b/.test(t)) scores.kontrola += 3;
    if (/szef.*krajowej administracji|szef kas\b/.test(t)) scores.kontrola += 3;
    if (/dyrektor izby administracji skarbow/.test(t)) scores.kontrola += 3;
    if (/\bkas\b/.test(t)) scores.kontrola += 2;
    if (/kontrola celna|kontrola celno|rewizja celna|czynnosci sprawdzaj/.test(t)) scores.kontrola += 2;

    // ── PODATKI
    if (/ordynacja podatkow|zobowiazanie podatkow|obowiazek podatkow/.test(t)) scores.podatki += 4;
    if (/zaleglosc podatkow|nadplata|inkasent|platnik/.test(t)) scores.podatki += 3;
    if (/\bpodatek\b|\bpodatku\b|\bpodatnik[ao]?\b|\bpodatnikiem\b/.test(t)) scores.podatki += 2;
    if (/\bvat\b|\bakcyz|\bpit\b|\bcit\b/.test(t)) scores.podatki += 2;
    if (/stawka podatkow|ulga podatkow|interpretacja.*podatkow/.test(t)) scores.podatki += 2;

    // ── PRAWO CELNE
    if (/prawo celne|procedura celna|zgloszenie celne|sklad celny|dlug celny/.test(t)) scores.prawo_celne += 4;
    if (/wartosc celna|taryfa celna|klasyfikacja taryfow|nomenklatura|orins/.test(t)) scores.prawo_celne += 4;
    if (/\bwit\b|\btaric\b|\bisztar\b|\bincoterms\b|\bukc\b/.test(t)) scores.prawo_celne += 4;
    if (/unijny kodeks celny|eur[.-]1|eur.?med|swiadectwo.*atr|\batr\b/.test(t)) scores.prawo_celne += 3;
    if (/\bclo\b|\bclowa\b|\bclem\b|\bcelny\b|\bcelna\b|\bcelne\b/.test(t)) scores.prawo_celne += 1;

    // ── PRAWO KARNE
    if (/\bkks\b|kodeks karny skarbow|przestepstwo skarbow|wykroczenie skarbow/.test(t)) scores.prawo_karne += 4;
    if (/postepowanie karne|podejrzany|oskarzony|prokurator|tymczasowe aresztowanie/.test(t)) scores.prawo_karne += 3;
    if (/kara grzywny|mandat karny|wniosek o ukaranie|stawka dzienna/.test(t)) scores.prawo_karne += 3;

    // ── SYSTEM PRAWA
    if (/\bdyrektywa\b|prawo wspolnotow|prymat prawa|zasada pierwszenstwa/.test(t)) scores.system_prawa += 4;
    if (/rozporzadzenie.*unijn|unijn.*rozporzadzenie|prawo unijne|traktat.*ue\b/.test(t)) scores.system_prawa += 3;
    if (/\bkpa\b|kodeks cywilny|postepowanie administracyjne|zrodla prawa/.test(t)) scores.system_prawa += 3;
    if (/konstytucja/.test(t)) scores.system_prawa += 2;

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return best[1] > 0 ? best[0] : null;
}

// Normalise question text for similarity comparison:
// lowercase, strip diacritics, remove punctuation, collapse spaces, take first 80 chars
function questionNorm(q) {
    return (q.questionText || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip diacritics
        .replace(/[^a-z0-9 ]/g, ' ')                       // remove punctuation
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80);
}

function startMockExam() {
    const seen = loadMockSeen();
    const deck = [];
    let anyFresh = false;

    // ── Zbuduj pule dodatkowe z folderów mieszanych (klasyfikacja per pytanie)
    const mixedByCategory = {};
    EXAM_CATEGORIES.forEach(c => { mixedByCategory[c.id] = []; });

    MIXED_FOLDERS.forEach(folderId => {
        const folder = state.folders.find(f => f.id === folderId);
        if (!folder) return;
        try {
            loadQuestions(folder).forEach(q => {
                const catId = classifyQuestion(q);
                if (catId && mixedByCategory[catId]) {
                    mixedByCategory[catId].push(q);
                }
                // pytania nierozpoznane (catId === null) są pomijane
            });
        } catch (_) {}
    });

    EXAM_CATEGORIES.forEach(cat => {
        // 1. Build full pool for this category (primary folders + classified mixed)
        const rawPool = shuffleArray([...buildCategoryPool(cat), ...mixedByCategory[cat.id]]);

        // 2. Deduplicate WITHIN category by normalised question text
        //    (removes near-identical variants that appear across multiple folders)
        const catNorms = new Set();
        const deduped = rawPool.filter(q => {
            const n = questionNorm(q);
            if (catNorms.has(n)) return false;
            catNorms.add(n);
            return true;
        });

        // 3. Prefer unseen questions; backfill with already-seen if pool runs short
        const fresh = deduped.filter(q => !seen.has(questionKey(q)));
        const old   = deduped.filter(q =>  seen.has(questionKey(q)));
        anyFresh = anyFresh || fresh.length > 0;

        // Ordered list: unseen first, then seen — guarantees we always reach cat.count
        const ordered = [...fresh, ...old];

        // 4. Take exactly cat.count (or all available if fewer exist)
        deck.push(...ordered.slice(0, cat.count));
    });

    // If no fresh questions remain at all, reset seen pool so next exam starts fresh again
    if (!anyFresh) {
        clearMockSeen();
        toast('Przerobiłeś już wszystkie pytania — pula została zresetowana!');
    }

    if (deck.length === 0) {
        showError('Brak pytań w bazie do utworzenia egzaminu próbnego.');
        navigate('tests');
        return;
    }

    clearMockSession();
    state.mock.active = true;
    state.mock.questions = deck;
    state.mock.answers = deck.map(() => []);
    state.mock.index = 0;
    state.mock.startedAt = Date.now();
    state.mock.endsAt = state.mock.startedAt + MOCK_EXAM_MINUTES * 60 * 1000;
    state.mock.finishedSummary = null;

    navigate('mock-run');
    renderMockQuestion();
    startMockTimer();
    saveMockSession();
}

function abortMockExam() {
    if (!confirm('Wyjść z egzaminu? Postęp i zegar zostaną zapisane — możesz wrócić później.')) return;
    persistMockAnswer();
    saveMockSession();
    stopMockTimer();
    state.mock.active = false;
    toast('Egzamin zapisany — wróć kiedy chcesz');
    navigate('tests');
}

function startMockTimer() {
    stopMockTimer();
    updateMockTimer();
    let tickCount = 0;
    state.mock.timerId = setInterval(() => {
        updateMockTimer();
        tickCount += 1;
        // Persist remaining time every 10 seconds so resume reflects current state
        if (state.mock.active && tickCount % 10 === 0) saveMockSession();
    }, 1000);
}
function stopMockTimer() {
    if (state.mock.timerId) {
        clearInterval(state.mock.timerId);
        state.mock.timerId = null;
    }
}
function updateMockTimer() {
    const remaining = Math.max(0, state.mock.endsAt - Date.now());
    const mm = Math.floor(remaining / 60000);
    const ss = Math.floor((remaining % 60000) / 1000);
    const el = $('#mockTimer');
    el.textContent = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    el.classList.remove('timer-pill--warn', 'timer-pill--danger');
    if (remaining < 5 * 60 * 1000 && remaining >= 60 * 1000) el.classList.add('timer-pill--warn');
    else if (remaining < 60 * 1000) el.classList.add('timer-pill--danger');

    if (remaining === 0) {
        stopMockTimer();
        toast('Czas minął — egzamin zakończony');
        mockSubmit(true);
    }
}

function renderMockQuestion() {
    const q = state.mock.questions[state.mock.index];
    const total = state.mock.questions.length;
    $('#mockCounter').textContent = `Pytanie ${state.mock.index + 1} / ${total}`;
    $('#mockCatBadge').textContent = q.categoryLabel || '';
    $('#mockProgress').style.width = `${((state.mock.index + 1) / total) * 100}%`;

    $('#mockQuestion').innerHTML = q.questionText;
    const optsBox = $('#mockOptions');
    optsBox.innerHTML = '';
    const saved = state.mock.answers[state.mock.index] || [];

    q.options.forEach((opt, i) => {
        const lbl = document.createElement('label');
        lbl.className = 'option';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = i;
        cb.className = 'mock-input';
        if (saved.includes(i)) cb.checked = true;
        cb.addEventListener('change', persistMockAnswer);
        const sp = document.createElement('span');
        sp.textContent = opt;
        lbl.appendChild(cb);
        lbl.appendChild(sp);
        optsBox.appendChild(lbl);
    });

    // Buttons
    $('#mockPrevBtn').disabled = state.mock.index === 0;
    $('#mockPrevBtn').style.opacity = state.mock.index === 0 ? .5 : 1;
    if (state.mock.index === total - 1) {
        $('#mockNextBtn').classList.add('hidden');
        $('#mockSkipBtn').classList.add('hidden');
        $('#mockSubmitBtn').classList.remove('hidden');
    } else {
        $('#mockNextBtn').classList.remove('hidden');
        $('#mockSkipBtn').classList.remove('hidden');
        $('#mockSubmitBtn').classList.add('hidden');
    }
}

function persistMockAnswer() {
    const inputs = $$('.mock-input');
    state.mock.answers[state.mock.index] = inputs
        .filter(i => i.checked)
        .map(i => Number(i.value));
    saveMockSession();
}

function mockGoPrev() {
    persistMockAnswer();
    if (state.mock.index > 0) {
        state.mock.index -= 1;
        renderMockQuestion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
function mockGoNext() {
    persistMockAnswer();
    if (state.mock.index < state.mock.questions.length - 1) {
        state.mock.index += 1;
        renderMockQuestion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function mockSubmit(forced) {
    persistMockAnswer();

    if (!forced) {
        const unanswered = state.mock.answers.filter(a => !a || a.length === 0).length;
        if (unanswered > 0) {
            if (!confirm(`Pominąłeś ${unanswered} pytań. Zakończyć egzamin?`)) return;
        }
    }

    stopMockTimer();
    state.mock.active = false;

    // Compute results per question and per category
    const total = state.mock.questions.length;
    let score = 0;
    const perCat = {};
    EXAM_CATEGORIES.forEach(c => { perCat[c.id] = { label: c.label, total: 0, correct: 0 }; });

    const breakdown = state.mock.questions.map((q, i) => {
        const sel = state.mock.answers[i] || [];
        const correctSet = new Set(q.correctIndexes);
        const selSet = new Set(sel);
        const ok = correctSet.size === selSet.size && [...correctSet].every(x => selSet.has(x));
        if (ok) score += 1;
        if (perCat[q.categoryId]) {
            perCat[q.categoryId].total += 1;
            if (ok) perCat[q.categoryId].correct += 1;
        }
        // Stats + error pool
        if (q.sourceFolderId) recordStat(q.sourceFolderId, ok);
        if (ok) removeError(q);
        else recordError(q, q.sourceFolderId, q.sourceFolderTitle);

        return { ok, sel, q };
    });

    state.mock.finishedSummary = { score, total, perCat, breakdown };
    // Persist seen questions so they don't repeat in future exams
    const seenNow = loadMockSeen();
    state.mock.questions.forEach(q => seenNow.add(questionKey(q)));
    saveMockSeen(seenNow);
    clearMockSession();
    renderMockResult();
    navigate('mock-end');
}

function renderMockResult() {
    const { score, total, perCat, breakdown } = state.mock.finishedSummary;
    const pct = Math.round((score / total) * 100);
    $('#mockResultScore').textContent = score;
    $('#mockResultTotal').textContent = total;
    $('#mockResultSummary').textContent = `${score} / ${total} poprawnych odpowiedzi · ${pct}%`;
    $('#mockResultKicker').textContent = pct >= 70 ? 'Bardzo dobrze!' : pct >= 50 ? 'Jest nad czym pracować' : 'Wymagana powtórka';

    // Category results
    const cats = $('#mockCatResults');
    cats.innerHTML = '';
    Object.values(perCat).forEach(c => {
        if (c.total === 0) return;
        const p = Math.round((c.correct / c.total) * 100);
        const color = p >= 70 ? 'var(--success)' : p >= 50 ? 'var(--warning)' : 'var(--danger)';
        const div = document.createElement('div');
        div.className = 'cat-result';
        div.innerHTML = `
            <div class="cat-result__label"></div>
            <div class="cat-result__score">
                <span class="cr-num"></span><span class="cat-result__score-sep"> / </span><span class="cr-tot"></span>
            </div>
            <div class="cat-result__bar"><div class="cat-result__bar-fill" style="width:${p}%; background:${color};"></div></div>
        `;
        div.querySelector('.cat-result__label').textContent = c.label;
        div.querySelector('.cr-num').textContent = c.correct;
        div.querySelector('.cr-tot').textContent = c.total;
        cats.appendChild(div);
    });

    // Wrong answers list
    const list = $('#mockEndResults');
    list.innerHTML = '';
    const letters = ['a','b','c','d','e','f'];
    breakdown.forEach((b, i) => {
        if (b.ok) return;
        const item = document.createElement('div');
        item.className = 'result-item result-item--fail';
        item.innerHTML = `
            <div class="result-item__header">
                <span class="result-item__badge">✗</span>
                <span class="result-item__num">Pyt. ${i + 1}</span>
                <span class="result-item__question"></span>
            </div>
        `;
        item.querySelector('.result-item__question').innerHTML = b.q.questionText.replace(/<br>/g, ' ');
        const opts = document.createElement('div');
        opts.className = 'result-item__options';
        b.q.options.forEach((opt, oi) => {
            const row = document.createElement('div');
            const isCorrect = b.q.correctIndexes.includes(oi);
            const wasSel = b.sel.includes(oi);
            row.className = 'result-opt' +
                (isCorrect ? ' result-opt--correct' : '') +
                (wasSel && !isCorrect ? ' result-opt--wrong' : '');
            row.textContent = `${letters[oi]}) ${opt}`;
            opts.appendChild(row);
        });
        item.appendChild(opts);
        list.appendChild(item);
    });
}

/* ──────────────────────────────────────────────────────────
   HEATMAP
   ────────────────────────────────────────────────────────── */
function colorForPct(pct) {
    if (pct === null) return { color: 'var(--surface-3)', opacity: 0 };
    // 0-49 red, 50-69 amber, 70-100 green; intensity scales with attempts
    let color;
    if (pct >= 70) color = '#10b981';
    else if (pct >= 50) color = '#f59e0b';
    else color = '#ef4444';
    return { color, opacity: 0.18 + (Math.min(pct, 100) / 100) * 0.32 };
}

function openHeatmap() {
    renderHeatmap();
    navigate('heatmap');
}

function renderHeatmap() {
    const stats = loadStats();

    // Per-category aggregates
    const catWrap = $('#heatmapCategories');
    catWrap.innerHTML = '';
    EXAM_CATEGORIES.forEach(cat => {
        let attempted = 0, correct = 0;
        cat.folderIds.forEach(fid => {
            const s = stats[fid];
            if (s) { attempted += s.attempted; correct += s.correct; }
        });
        const pct = attempted ? Math.round((correct / attempted) * 100) : null;
        const { color } = colorForPct(pct);

        const card = document.createElement('div');
        card.className = 'heatmap-cat';
        card.innerHTML = `
            <div class="heatmap-cat__head">
                <span class="heatmap-cat__title"></span>
                <span class="heatmap-cat__pct"></span>
            </div>
            <div class="heatmap-cat__bar"><div class="heatmap-cat__bar-fill" style="width:${pct ?? 0}%; background:${color};"></div></div>
            <div class="heatmap-cat__meta"></div>
        `;
        card.querySelector('.heatmap-cat__title').textContent = cat.label;
        card.querySelector('.heatmap-cat__pct').textContent = pct === null ? '—' : `${pct}%`;
        card.querySelector('.heatmap-cat__meta').textContent = attempted
            ? `${correct} / ${attempted} poprawnych`
            : 'Brak prób — rozwiąż jakiś test';
        catWrap.appendChild(card);
    });

    // Per-folder grid
    const grid = $('#heatmapGrid');
    grid.innerHTML = '';
    state.folders.forEach(folder => {
        const s = stats[folder.id];
        const attempted = s ? s.attempted : 0;
        const correct = s ? s.correct : 0;
        const pct = attempted ? Math.round((correct / attempted) * 100) : null;
        const { color, opacity } = colorForPct(pct);

        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.style.setProperty('--cell-color', color);
        cell.style.setProperty('--cell-opacity', opacity);
        cell.innerHTML = `
            <div class="heatmap-cell__title"></div>
            <div class="heatmap-cell__pct"></div>
            <div class="heatmap-cell__meta"></div>
        `;
        cell.querySelector('.heatmap-cell__title').textContent = folder.title;
        cell.querySelector('.heatmap-cell__pct').textContent = pct === null ? '—' : `${pct}%`;
        cell.querySelector('.heatmap-cell__meta').textContent = attempted
            ? `${correct} / ${attempted}`
            : 'brak prób';
        grid.appendChild(cell);
    });
}

/* ──────────────────────────────────────────────────────────
   ORAL SIMULATOR
   ────────────────────────────────────────────────────────── */
function buildOralPool() {
    // Combine: curated topics + all trainer items across all materials
    const pool = [];
    ORAL_TOPICS.forEach(t => {
        pool.push({ topic: t.topic, answer: t.answer, source: 'baza tematów' });
    });
    MATERIALS.forEach(m => {
        const items = loadTrainerData(m.id) || [];
        items.forEach(it => {
            pool.push({ topic: it.q, answer: it.a, source: m.title });
        });
    });
    return pool;
}

// ── Oral session persistence ───────────────────────────────
function saveOralSession() {
    if (!state.oral.deck || state.oral.deck.length === 0) return;
    try {
        localStorage.setItem(STORAGE.ORAL_SESSION, JSON.stringify({
            deck: state.oral.deck,
            known: state.oral.known,
            total: state.oral.total,
            timerSelect: $('#oralTimerSelect').value,
            savedAt: Date.now()
        }));
    } catch (_) {}
}
function loadOralSession() {
    try {
        const raw = localStorage.getItem(STORAGE.ORAL_SESSION);
        return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
}
function clearOralSession() {
    localStorage.removeItem(STORAGE.ORAL_SESSION);
}

function openOralSim() {
    navigate('oral-sim');

    // Resume banner if a saved session has remaining items
    const saved = loadOralSession();
    const banner = $('#oralResumeBanner');
    if (saved && saved.deck && saved.deck.some(it => it.status !== 'known')) {
        const remaining = saved.deck.filter(it => it.status !== 'known').length;
        $('#oralResumeInfo').textContent =
            `Pozostało ${remaining} z ${saved.total} tematów · oznaczone „umiem": ${saved.known}`;
        banner.classList.remove('hidden');
        // Don't auto-start; user picks
        $('#oralEmpty').classList.add('hidden');
        $('#oralBody').classList.add('hidden');
    } else {
        banner.classList.add('hidden');
        startOralSim();
    }
}

function resumeOralSession() {
    const saved = loadOralSession();
    if (!saved) { startOralSim(); return; }
    state.oral.deck = saved.deck;
    state.oral.known = saved.known || 0;
    state.oral.total = saved.total || saved.deck.length;
    state.oral.index = 0;
    state.oral.revealed = false;
    if (saved.timerSelect) $('#oralTimerSelect').value = saved.timerSelect;
    $('#oralResumeBanner').classList.add('hidden');
    $('#oralBody').classList.remove('hidden');
    $('#oralEmpty').classList.add('hidden');
    nextOralTopic();
}

function startOralSim() {
    stopOralTimer();
    clearOralSession();
    $('#oralResumeBanner').classList.add('hidden');
    const pool = buildOralPool();
    const empty = pool.length === 0;
    $('#oralEmpty').classList.toggle('hidden', !empty);
    $('#oralBody').classList.toggle('hidden', empty);
    if (empty) return;

    state.oral.deck = shuffleArray(pool).map(it => ({ it, status: 'pending' }));
    state.oral.index = 0;
    state.oral.known = 0;
    state.oral.total = state.oral.deck.length;
    state.oral.revealed = false;
    nextOralTopic();
}

function nextOralTopic() {
    stopOralTimer();
    state.oral.revealed = false;
    $('#oralAnswer').classList.add('hidden');
    $('#oralRate').classList.add('hidden');
    $('#oralRevealBtn').classList.remove('hidden');

    const remaining = state.oral.deck.filter(it => it.status !== 'known');
    if (remaining.length === 0) {
        $('#oralTopic').textContent = 'Świetnie! Wszystkie tematy oznaczone jako „umiem".';
        $('#oralSource').textContent = '';
        $('#oralCounter').textContent = `Temat ${state.oral.total} / ${state.oral.total}`;
        $('#oralRevealBtn').classList.add('hidden');
        $('#oralTimerWrap').style.visibility = 'hidden';
        return;
    }
    state.oral.current = remaining[0];
    $('#oralTopic').textContent = state.oral.current.it.topic;
    $('#oralSource').textContent = state.oral.current.it.source ? `Źródło: ${state.oral.current.it.source}` : '';
    $('#oralAnswer').textContent = state.oral.current.it.answer;
    const idx = state.oral.total - remaining.length;
    $('#oralCounter').textContent = `Temat ${idx + 1} / ${state.oral.total}`;
    $('#oralKnown').textContent = `Umiem: ${state.oral.known}`;
    $('#oralTimerWrap').style.visibility = 'visible';

    // Start timer if set
    const sec = parseInt($('#oralTimerSelect').value, 10) || 0;
    if (sec > 0) {
        state.oral.timeLeft = sec;
        renderOralTimer(sec, sec);
        state.oral.timerId = setInterval(() => {
            state.oral.timeLeft -= 1;
            renderOralTimer(state.oral.timeLeft, sec);
            if (state.oral.timeLeft <= 0) {
                stopOralTimer();
                if (!state.oral.revealed) oralReveal();
            }
        }, 1000);
    } else {
        $('#oralTimerWrap').style.visibility = 'hidden';
    }
}

function renderOralTimer(left, total) {
    const C = 339.292;
    const ratio = total ? Math.max(0, left / total) : 0;
    const offset = C * (1 - ratio);
    const fg = $('#oralRingFg');
    fg.style.strokeDashoffset = offset;
    fg.classList.remove('is-warn', 'is-danger');
    if (ratio < 0.33) fg.classList.add('is-danger');
    else if (ratio < 0.5) fg.classList.add('is-warn');
    $('#oralTimerText').textContent = Math.max(0, Math.ceil(left));
}

function stopOralTimer() {
    if (state.oral.timerId) {
        clearInterval(state.oral.timerId);
        state.oral.timerId = null;
    }
}

function oralReveal() {
    stopOralTimer();
    state.oral.revealed = true;
    $('#oralAnswer').classList.remove('hidden');
    $('#oralRevealBtn').classList.add('hidden');
    $('#oralRate').classList.remove('hidden');
    $('#oralTimerWrap').style.visibility = 'hidden';
}

function oralRate(known) {
    if (!state.oral.current) return;
    if (known) {
        state.oral.current.status = 'known';
        state.oral.known += 1;
    } else {
        state.oral.deck = state.oral.deck.filter(it => it !== state.oral.current).concat([state.oral.current]);
    }

    const remaining = state.oral.deck.filter(it => it.status !== 'known');
    if (remaining.length === 0) clearOralSession();
    else saveOralSession();

    nextOralTopic();
}

function oralReset() {
    // Restart the timer for current topic when user changes the duration
    if (state.oral.current && !state.oral.revealed) {
        stopOralTimer();
        const sec = parseInt($('#oralTimerSelect').value, 10) || 0;
        if (sec > 0) {
            state.oral.timeLeft = sec;
            renderOralTimer(sec, sec);
            $('#oralTimerWrap').style.visibility = 'visible';
            state.oral.timerId = setInterval(() => {
                state.oral.timeLeft -= 1;
                renderOralTimer(state.oral.timeLeft, sec);
                if (state.oral.timeLeft <= 0) {
                    stopOralTimer();
                    if (!state.oral.revealed) oralReveal();
                }
            }, 1000);
        } else {
            $('#oralTimerWrap').style.visibility = 'hidden';
        }
    }
}

/* ──────────────────────────────────────────────────────────
   DIALOG MODE
   ────────────────────────────────────────────────────────── */
function loadDialogSession(id) {
    try {
        const raw = localStorage.getItem(STORAGE.DIALOG_SESSION(id));
        return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
}
function saveDialogSession(id, data) {
    try { localStorage.setItem(STORAGE.DIALOG_SESSION(id), JSON.stringify(data)); } catch (_) {}
}
function clearDialogSession(id) {
    localStorage.removeItem(STORAGE.DIALOG_SESSION(id));
}

function openDialogList() {
    const list = $('#dialogList');
    list.innerHTML = '';
    const done = loadDialogDone();
    DIALOG_SCRIPTS.forEach((dlg, idx) => {
        const saved = loadDialogSession(dlg.id);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'dialog-card';
        const inProgress = saved && saved.index < dlg.steps.length;

        let progressBadge = '';
        if (inProgress) {
            progressBadge = `<span class="dialog-card__progress">W trakcie · pyt. ${saved.index + 1} / ${dlg.steps.length}</span>`;
        } else if (done[dlg.id]) {
            progressBadge = `<span class="dialog-card__progress dialog-card__progress--done">Przerobione</span>`;
        }

        card.innerHTML = `
            <div class="dialog-card__icon">${idx + 1}</div>
            <div class="dialog-card__title"></div>
            <div class="dialog-card__intro"></div>
            <div class="dialog-card__meta"></div>
            ${progressBadge}
        `;
        card.querySelector('.dialog-card__title').textContent = dlg.title;
        card.querySelector('.dialog-card__intro').textContent = dlg.intro;
        card.querySelector('.dialog-card__meta').textContent = `${dlg.steps.length} pytań`;
        card.addEventListener('click', () => openDialog(dlg.id));
        list.appendChild(card);
    });
    navigate('dialog');
}

function loadDialogDone() {
    try {
        const raw = localStorage.getItem(STORAGE.DIALOG_DONE);
        return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
}
function saveDialogDone(map) {
    try { localStorage.setItem(STORAGE.DIALOG_DONE, JSON.stringify(map)); } catch (_) {}
}

function openDialog(scriptId) {
    const dlg = DIALOG_SCRIPTS.find(d => d.id === scriptId);
    if (!dlg) return;
    state.dialog.scriptId = dlg.id;
    state.dialog.script = dlg;

    // Resume saved progress
    const saved = loadDialogSession(scriptId);
    if (saved && saved.index < dlg.steps.length && (saved.index > 0 || (saved.history && saved.history.length > 0))) {
        const cont = confirm(`Masz zapisany postęp w „${dlg.title}" (pyt. ${saved.index + 1} / ${dlg.steps.length}).\n\nKontynuować?`);
        if (cont) {
            state.dialog.index = saved.index;
            state.dialog.known = saved.known || 0;
            state.dialog.history = saved.history || [];
        } else {
            clearDialogSession(scriptId);
            state.dialog.index = 0;
            state.dialog.known = 0;
            state.dialog.history = [];
        }
    } else {
        state.dialog.index = 0;
        state.dialog.known = 0;
        state.dialog.history = [];
    }
    state.dialog.revealed = false;

    $('#dialogTitle').textContent = dlg.title;
    navigate('dialog-run');
    renderDialogStep();
}

function renderDialogStep() {
    const dlg = state.dialog.script;
    const total = dlg.steps.length;
    const cur = dlg.steps[state.dialog.index];
    state.dialog.revealed = false;

    $('#dialogCounter').textContent = `Pytanie ${state.dialog.index + 1} / ${total}`;
    $('#dialogKnown').textContent = `Umiem: ${state.dialog.known}`;
    $('#dialogProgress').style.width = `${(state.dialog.index / total) * 100}%`;

    $('#dialogQuestion').textContent = cur.q;
    $('#dialogAnswer').textContent = cur.a;
    $('#dialogAnswerBubble').classList.add('hidden');
    $('#dialogRevealBtn').classList.remove('hidden');
    $('#dialogRateYes').classList.add('hidden');
    $('#dialogRateNo').classList.add('hidden');

    // Stream of past answers
    const stream = $('#dialogStream');
    stream.innerHTML = '';
    state.dialog.history.forEach(h => {
        const qb = document.createElement('div');
        qb.className = 'dialog-bubble dialog-bubble--examiner dialog-bubble--past';
        qb.innerHTML = `<span class="dialog-bubble__role">Egzaminator</span><p class="dialog-bubble__text"></p>`;
        qb.querySelector('p').textContent = h.q;
        stream.appendChild(qb);
        const ab = document.createElement('div');
        ab.className = 'dialog-bubble dialog-bubble--you dialog-bubble--past';
        ab.innerHTML = `<span class="dialog-bubble__role">${h.known ? 'Umiem ✓' : 'Powtórz'}</span><p class="dialog-bubble__text"></p>`;
        ab.querySelector('p').textContent = h.a;
        stream.appendChild(ab);
    });
    stream.scrollTop = stream.scrollHeight;
}

function dialogReveal() {
    state.dialog.revealed = true;
    $('#dialogAnswerBubble').classList.remove('hidden');
    $('#dialogRevealBtn').classList.add('hidden');
    $('#dialogRateYes').classList.remove('hidden');
    $('#dialogRateNo').classList.remove('hidden');
}

function dialogRate(known) {
    if (!state.dialog.revealed) return;
    const dlg = state.dialog.script;
    const cur = dlg.steps[state.dialog.index];
    state.dialog.history.push({ q: cur.q, a: cur.a, known });
    if (known) state.dialog.known += 1;

    if (state.dialog.index < dlg.steps.length - 1) {
        state.dialog.index += 1;
        // Persist progress
        saveDialogSession(dlg.id, {
            index: state.dialog.index,
            known: state.dialog.known,
            history: state.dialog.history,
            savedAt: Date.now()
        });
        renderDialogStep();
    } else {
        // Done — clear saved progress, mark as done
        clearDialogSession(dlg.id);
        const done = loadDialogDone();
        done[dlg.id] = Date.now();
        saveDialogDone(done);

        $('#endTitle').textContent = 'Dialog zakończony';
        $('#endSummary').textContent = `${dlg.title} · oznaczone jako „umiem": ${state.dialog.known} / ${dlg.steps.length}`;
        $('#endScore').textContent = state.dialog.known;
        $('#endTotal').textContent = dlg.steps.length;
        $('#endResults').innerHTML = '';
        navigate('end');
    }
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
