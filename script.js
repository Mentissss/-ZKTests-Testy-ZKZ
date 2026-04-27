const state = {
    manifest: null,
    questions: [],
    selectedFolder: null,
    currentQuestionIndex: 0,
    score: 0,
    results: [],          // per-question results for summary
    pendingFolderId: null // folder waiting for continue/fresh decision
};

const elements = {
    setup: document.getElementById('setup'),
    quiz: document.getElementById('quiz'),
    endScreen: document.getElementById('endScreen'),
    continueScreen: document.getElementById('continueScreen'),
    folderGrid: document.getElementById('folderGrid'),
    specialFolderGrid: document.getElementById('specialFolderGrid'), // DODANE: Nowy grid na testy
    loadingMsg: document.getElementById('loadingMsg'),
    errorMsg: document.getElementById('errorMsg'),
    selectedTestName: document.getElementById('selectedTestName'),
    progressText: document.getElementById('progressText'),
    scoreText: document.getElementById('scoreText'),
    questionTitle: document.getElementById('questionTitle'),
    optionsContainer: document.getElementById('optionsContainer'),
    checkBtn: document.getElementById('checkBtn'),
    nextBtn: document.getElementById('nextBtn'),
    backToListBtn: document.getElementById('backToListBtn'),
    retryBtn: document.getElementById('retryBtn'),
    restartBtn: document.getElementById('restartBtn'),
    restartQuizBtn: document.getElementById('restartQuizBtn'),
    finalScore: document.getElementById('finalScore'),
    finalTotal: document.getElementById('finalTotal'),
    endSummary: document.getElementById('endSummary'),
    resultsList: document.getElementById('resultsList'),
    continueBtn: document.getElementById('continueBtn'),
    freshStartBtn: document.getElementById('freshStartBtn'),
    cancelContinueBtn: document.getElementById('cancelContinueBtn'),
    continueInfo: document.getElementById('continueInfo'),
    ttsBtn: document.getElementById('ttsBtn'),
    ttsVoiceSelect: document.getElementById('ttsVoiceSelect'),
    ttsPreviewBtn: document.getElementById('ttsPreviewBtn')
};

document.addEventListener('DOMContentLoaded', init);
elements.checkBtn.addEventListener('click', checkAnswer);
elements.nextBtn.addEventListener('click', goToNextQuestion);
elements.backToListBtn.addEventListener('click', showSetupScreen);
elements.retryBtn.addEventListener('click', retrySelectedTest);
elements.restartBtn.addEventListener('click', showSetupScreen);
elements.restartQuizBtn.addEventListener('click', () => {
    if (state.selectedFolder) startFreshQuiz(state.selectedFolder.id);
});
elements.continueBtn.addEventListener('click', onContinueSession);
elements.freshStartBtn.addEventListener('click', () => {
    if (state.pendingFolderId) startFreshQuiz(state.pendingFolderId);
});
elements.cancelContinueBtn.addEventListener('click', showSetupScreen);
elements.ttsBtn.addEventListener('click', toggleTTS);
elements.ttsVoiceSelect.addEventListener('change', () => {
    localStorage.setItem(TTS_VOICE_KEY, elements.ttsVoiceSelect.value);
    stopTTS();
});
elements.ttsPreviewBtn.addEventListener('click', previewVoice);

// ── PDF modal ──────────────────────────────────────────
const pdfModal      = document.getElementById('pdfModal');
const pdfFrame      = document.getElementById('pdfFrame');
const pdfModalTitle = document.getElementById('pdfModalTitle');
const pdfModalClose = document.getElementById('pdfModalClose');
const pdfOpenLink   = document.getElementById('pdfOpenLink');
const pdfFallback   = document.getElementById('pdfFallback');

document.querySelectorAll('.material-card').forEach((btn) => {
    btn.addEventListener('click', () => {
        const src   = btn.dataset.pdf;
        const title = btn.querySelector('h3').textContent;
        pdfModalTitle.textContent = title;
        pdfOpenLink.href = src;
        pdfFallback.classList.add('hidden');
        pdfFrame.classList.remove('hidden');
        pdfFrame.src = src;
        pdfModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });
});

// Fallback: jeśli iframe nie załaduje PDF, pokaż komunikat z linkiem
pdfFrame.addEventListener('error', () => {
    pdfFrame.classList.add('hidden');
    pdfFallback.classList.remove('hidden');
});
// Dodatkowe zabezpieczenie: sprawdź czy iframe załadował coś sensownego
pdfFrame.addEventListener('load', () => {
    try {
        // Jeśli src jest pusty, nic nie rób
        if (!pdfFrame.src || pdfFrame.src === window.location.href) return;
        pdfFallback.classList.add('hidden');
        pdfFrame.classList.remove('hidden');
    } catch (_) {
        pdfFrame.classList.add('hidden');
        pdfFallback.classList.remove('hidden');
    }
});

function closePdfModal() {
    pdfModal.classList.add('hidden');
    pdfFrame.src = '';
    document.body.style.overflow = '';
}

pdfModalClose.addEventListener('click', closePdfModal);
pdfModal.querySelector('.pdf-modal__backdrop').addEventListener('click', closePdfModal);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pdfModal.classList.contains('hidden')) {
        closePdfModal();
    }
});

// ── DODANE: DANE TESTÓW SPECJALNYCH ────────────────────
const SPECIAL_TESTS_DATA = [
    {
        id: 'sp_procedury',
        title: 'Procedury celne',
        files: [{
            name: 'Procedury celne.txt',
            content: `1. W Polsce procedura odwoławcza została określona w:\nPrawie Celnym przez odwołanie do odpowiednich przepisów Ordynacji Podatkowej;\nKodeksie Postępowania Administracyjnego;\nPrawie Administracyjnym.\nX100\n\n2. Decyzje „z urzędu” są wydawane:\nNa wniosek zgłaszającego;\nBez uprzedniego wniosku osoby zainteresowanej;\nZarówno na wniosek jak i bez uprzedniego wniosku osoby zainteresowanej.\nX010\n\n3. Decyzja niekorzystna to:\nDecyzja wydawana na wniosek w pełni go uwzględniająca;\nTylko i wyłącznie decyzja wydana z urzędu\nDecyzja wydana na wniosek nie w pełni go uwzględniająca\nX001\n\n4. Organ celny, wszczynając postępowanie z urzędu:\nWydaje postanowienie o wszczęciu postępowania\nWydaje powiadomienie o wszczęciu postępowania\nNie wydaje żadnego odrębnego aktu administracyjnego o wszczęciu postępowania\nX001\n\n5. Odwołanie od decyzji przysługuje:\nTylko w przypadku decyzji niekorzystnych;\nNiezależnie od rodzaju wydanego rozstrzygnięcia;\nWyłącznie przypadku decyzji wydawanych „na wniosek zainteresowanego”\nX010\n\n6. Przed wydaniem decyzji niekorzystnej organy celne dają wnioskodawcy możliwość przedstawienia stanowiska w terminie:\n14 dni;\n7 dni;\n30 dni.\nX001\n\n7. Odwołanie od decyzji składa się:\nw każdym państwie członkowskim UE;\nw państwie członkowskim, w którym decyzja została wydana\njedynie w Brukseli.\nX010\n\n8. Wydanie decyzji i powiadomienie o niej winno nastąpić w terminie:\n120 dni od daty przyjęcia wniosku;\n30 dni od daty przyjęcia wniosku;\n90 ,dni od daty przyjęcia wniosku.\nX100\n\n9. Publiczna usługa hybrydowa w zakresie doręczeń\njest realizowana prze InPost;\njest realizowana przez Pocztę Polska;\njest aktualnie niedostępna.\nX010\n\n10. Podstawowa forma doręczeń to:\nDoręczenie korespondencji na adres elektroniczny\nDoręczenie w ramach publicznej usługi hybrydowej\nDoręczenie przez awizo.\nX100\n\n11. Niedopełnienie obowiązku zgłoszenia przywozu do Polski środków pieniężnych\nNie podlega żadnej karze;\nPodlega karze grzywny za przestępstwo lub wykroczenie skarbowe;\nPodlega karze ograniczenia wolności.\nX010\n\n12. Decyzja zaczyna obowiązywać:\nZ dniem jej doręczenia lub uznania za doręczoną;\nPo 14 dniach od doręczenia;\nCo do zasady po 30 dniach.\nX100\n\n13. Odwołanie o decyzji w zakresie prawa celnego wnosi się:\nW terminie 30 dni od doręczenia jej stronie;\nW terminie 14 dni od doręczenia jej stronie;\nW terminie 7 dni od doręczenia jej stronie\nX010\n\n14. W Polsce do postępowania w sprawach celnych stosuje się przepisy:\nUstawy Ordynacja podatkowa;\nUstawy Kodeks Postępowania Administracyjnego;\nTylko i wyłącznie Unijnego Kodeksu Celnego\nX100`
        }]
    },
    {
        id: 'sp_pochodzenie',
        title: 'Pochodzenie towarów',
        files: [{
            name: 'Pochodzenie towarów.txt',
            content: `1. Pochodzenie towaru udokumentowane poprzez przedstawienie niepreferencyjnego świadectwa pochodzenia pozwala:\nSkorzystać z obniżonej stawki celnej\nSkorzystać z zerowej stawki celnej\nZastosować stawkę celną „erga omnes”.\nX001\n\n2. Strefy wolnego handlu pozwalają na:\nZastosowanie preferencji wynikających ze wzajemnych umów handlowych\nZastosowanie preferencji wynikających z jednostronnych uzgodnień UE\nZastosowanie preferencji na podstawie świadectwa ATR.\nX100\n\n3. Preferencje wynikające z unii celnej oparte są na:\nPochodzeniu towarów\nStatusie celnym towarów\nPochodzeniu i statusie celnym\nX010\n\n4. Ważność świadectwa ATR wynosi:\n4 miesiące\n90 dni\n2 lata\nX100\n\n5. UE zawarła unię celną z:\nTurcją, Andorą i San Marino\nJedynie z Turcją\nTurcją i Szwajcarią\nX100\n\n6. Upoważniony eksporter:\nSporządza deklarację pochodzenia, tylko wtedy gdy wartość towaru przekracza 4000 EUR;\nNie jest związany żadnym limitem wartości produktów pochodzących\nSporządza deklarację o pochodzeniu niepreferencyjnym.\nX010\n\n7. Ogólne zasady pochodzenia preferencyjnego obejmują:\nZasadę bezpośredniego transportu, tożsamości, terytorialności i dokumentowania pochodzenia\nTylko zasadę bezpośredniego transportu i terytorialności\nJedynie zasadę dokumentowania i tożsamości.\nX100\n\n8. REX to :\nsystem zarejestrowanych eksporterów min. w ramach Ogólnego Systemu Preferencji (GSP)\nskrót dot. zasady bezpośredniego transportu\nprodukty całkowicie uzyskane\nX100\n\n9. Świadectwo o niemaniplulowaniu towarem:\nsłuży potwierdzeniu zachowania dozoru celnego dla towarów transportowanych między stronami umowy o wolnym handlu\ndokumentuje preferencyjne pochodzenie towaru\npotwierdza status celny towaru.\nX100\n\n10. „Wystarczające przetwarzanie lub obróbka” to procesy, którym poddawane są:\ntowary unijne by uzyskać status nieunijnych\ntowary niepochodzące by uzyskać status pochodzących\ntowary z krajów trzecich by uzyskać status unijny\nX010\n\n11. EUR 1, EUR-MED to dowody pochodzenia stosowane:\nw GSP\nW strefach wolnego handlu\nW unii celnej\nX010\n\n12. Preferencje jednostronne (GSP) przyznawane są:\nJedynie krajom Afryki\nKrajom rozwijającym się i najsłabiej rozwiniętym\nTurcji, San Marino i Andorze\nX010\n\n13. Umowy o wolnym handlu:\nTo negocjowany, wzajemny system preferencji\nTo przyznawany system preferencji jednostronnych\nOpierają się na unii celnej\nX100\n\n14. Stawka celna stosowana w oparciu o KNU to:\nStawka celna konwencyjna\nStawka celna preferencyjna\nStawka celna obniżona\nX100\n\n15. WIP w Polsce wydaje:\nKażdy NUCS\nDyrektor Krajowej Informacji Skarbowej\nMinister Finansów\nX010\n\n16. Deklaracja o pochodzeniu towaru może być wystawiona :\nJedynie przez upoważnionego eksportera\nTylko i wyłącznie przez nieupoważnionego eksportera\nZarówno przez upoważnionego jak i przez nieupoważnionego eksportera\nX001`
        }]
    },
    {
        id: 'sp_taryfa',
        title: 'Nomenklatura taryfowa',
        files: [{
            name: 'Nomenklatura taryfowa.txt',
            content: `1. Nomenklatura taryfowa zbudowana jest z:\na) Stawek celnych, wykazu alfabetycznego towarów,\nb) Tylko wykazu alfabetycznego towarów,\nc) Sekcji, działów, pozycji i podpozycji.\nX001\n\n2. Pozycja HS jest określona na poziomie:\na) 4 cyfr,\nb) 6 cyfr,\nc) 10 cyfr.\nX100\n\n3. Oznaczenie AD F/M oznacza we Wspólnej Taryfie Celnej:\na) Dodatkowe cło za cukier,\nb) Dodatkowe cło za mąkę;\nc) Dodatkowe cło za alkohol.\nX010\n\n4. Skrót CN oznacza:\na) Nomenklatura Scalona,\nb) System Zharmonizowany,\nc) Ogólne Reguły Interpretacji Nomenklatury Scalonej.\nX100\n\n5. Dla towaru, o wartości poniżej 700 EUR, o charakterze niehandlowym, przewożonego w bagażu podróżnego stosuje się:\na) Stawkę celną procentową w zależności od kodu towaru;\nb) Ryczałtową stawkę celną w wysokości 2,5 % od wartości\nc) Stawkę celną kwotowa w zależności od masy towaru.\nX010\n\n6. WIT to decyzja organu celnego dot. taryfikacji wydawana w Polsce przez:\na) Dyrektorów Izby Administracji Skarbowej;\nb) Naczelników Urzędów Celno-Skarbowych;\nc) Dyrektora Krajowej Informacji Skarbowej.\nX001\n\n7. Dodatkowe cło za cukier we Wspólnej Taryfie Celnej jest oznaczone skrótem:\na) EA\nb) AD S/Z\nc) AD F/M.\nX010\n\n8. Futerał na broń (pistolet), przewożony wraz z tym pistoletem, nadający się do długotrwałego użytkowania klasyfikuje się:\na) Jako opakowanie jednorazowego użytku;\nb) Wraz z towarem, do pozycji dla pistoletów;\nc) Zgodnie z regułą reguła ORINS 5B.\nX010\n\n9. Reguła 5 ORINS służy do:\na) Klasyfikacji opakowań przewożonych wraz z towarem\nb) Klasyfikacji towaru do odpowiednich podpozycji CN;\nc) Klasyfikacji mieszanin.\nX100\n\n10. Wyroby niegotowe, mające zasadniczy charakter wyrobu gotowego klasyfikuje się zgodnie z :\na) 2a ORINS;\nb) 4 ORINS;\nc) 6 ORINS.\nX100\n\n11. Nomenklatura taryfowa dzieli się na:\na) 5 sekcji;\nb) 21 sekcji;\nc) 99 sekcji.\nX010\n\n12. Do specjalnego użytku przez właściwe organy unijne zarezerwowany jest:\na) Dział 77;\nb) Dział 98 i 99\nc) Dział 102.\nX010\n\n13. Kod CN jest określany przez:\na) 4 cyfry, gdzie dwie pierwsze cyfry to numer działu;\nb) 8 cyfr ;\nc) 2 cyfry, które odnoszą się do numeru działu\nX010\n\n14. Załącznik I do Rozp. Rady 2658/87:\na) Jest publikowany corocznie, nie później niż do 31 października danego roku\nb) Jest aktualizowany raz na 10 lat;\nc) Nie podlega corocznym przeglądom ani aktualizacji.\nX100\n\n15. Element rolny w Taryfie Celnej określany jest:\na) HS\nb) CN\nc) EA.\nX001\n\n16. Tytuły sekcji, działów, poddziałów, przy klasyfikacji towarów mają znaczenie:\na) Prawne;\nb) Wyłącznie orientacyjne;\nc) Najważniejsze.\nX010\n\n17. System ISZTAR:\na) Zawiera nomenklaturę towarową, stawki celne, dane krajowe w zakresie podatków, ograniczenia w imporcie i eksporcie;\nb) Zawiera tylko dodatkowe kody TARIC, np. kody Meursinga;\nc) Zawiera jedynie nomenklaturę TARIC\nX100\n\n18. TARIC to Zintegrowana Taryfa Wspólnot Europejskich która jest:\na) Źródłem prawa UE w zakresie taryfikacji;\nb) Internetową bazą danych prowadzoną przez DG TAXUD,\nc) bazą danych ustanowioną przez Polskie Ministerstwo Finansów.\nX010\n\n19. W nomenklaturze taryfowej ma zastosowanie tzw. zasada stopnia przetworzenia która:\na) Dotyczy tylko towarów rolnych;\nb) Oznacza drogę towaru od surowca, przez półprodukt do produktu gotowego;\nc) Odnosi się do reguł pochodzenia towaru.\nX010\n\n20. Wyroby niekompletne, niegotowe, rozmontowane lub niezmontowane klasyfikuje się:\na) Zgodnie z regułą 2A ORINS;\nb) Jako części towaru gotowego;\nc) W zależności od jego zasadniczego składnika/komponentu\nX100\n\n21. Części ogólnego użytku\na) Klasyfikuje się jako części jednego konkretnego, głównego towaru;\nb) Do własnych pozycji, np.: gwoździe, zatrzaski;\nc) Są nieistotne w procesie klasyfikacji towarowej.\nX010\n\n22. Maszyna, składająca się z kilku maszyn, przeznaczonych do pełnienia dwóch lub więcej funkcji wzajemnie uzupełniających się, taryfikowana jest:\na) Do pozycji zarezerwowanej dla maszyny występującej w nazwie jako główna\nb) Do pozycji odpowiedniej dla maszyny wykonującej podstawową funkcję;\nc) Do pozycji maszyny występującej jako pierwsza we wspólnej taryfie celnej\nX010\n\n23. W procesie klasyfikacji taryfowej zawsze korzystamy z :\na) Pierwszej Ogólnej Reguły Interpretacyjnej\nb) Z każdej reguły ORINS;\nc) Tylko jednej reguły, która odpowiada naszemu towarowi\nX100`
        }]
    },
    {
        id: 'sp_wartosc',
        title: 'Wartość celna',
        files: [{
            name: 'Wartość celna.txt',
            content: `1. Wartość celna stanowi podstawę:\na) obliczenia cła;\nb) ustalenia statusu celnego towaru;\nc) ustalenia preferencyjnego pochodzenia towaru.\nX100\n\n2. UKC wprowadza kolejność stosowania metod ustalania wartości celnej. Wyjątkiem są:\na) metoda wartości transakcyjnej i towarów identycznych, stosowane zamiennie\nb) metoda dedukcyjna i wartości kalkulowanej, których kolejność może być odwrócona\nc) metoda towarów identycznych i podobnych, których kolejność może być odwrócona.\nX010\n\n3. O podmiotach powiązanych mówimy, gdy:\na) są członkami tej samej rodziny;\nb) gdy kupują towar u tego samego producenta;\nc) są przewoźnikiem i odbiorca towaru.\nX100\n\n4. Do wartości transakcyjnej dodaje się:\na) koszty transportu po ich wprowadzeniu na obszar UE;\nb) prowizje i koszty pośrednictwa;\nc) koszty prac badawczych, inżynieryjnych, przywożonych towarów prowadzone po ich wprowadzeniu na obszar UE.\nX010\n\n5. Do wartości transakcyjnej nie wlicza się:\na) kosztów pośrednictwa;\nb) kosztów transportu po ich wprowadzeniu na obszar celny UE;\nc) kosztów transportu do miejsca wprowadzenia towaru na obszar celny UE.\nX010\n\n6. Reguły INCOTERMS regulują:\na) podział kosztów i ryzyka dostawy między sprzedającym, a kupującym;\nb) podział kosztów między przewoźnikiem, a producentem towaru;\nc) kwestie klasyfikacji towarowej\nX100\n\n7. Podstawą do zakwestionowania zadeklarowanej wartości może być:\na) wątpliwość co do wiarygodności i autentyczności dokumentów, np. faktury;\nb) brak preferencyjnego dowodu pochodzenia towaru;\nc) pewność, że zadeklarowana wartość stanowi całkowitą zapłacona kwotę za towar.\nX100\n\n8. Zgodnie z Rozp. Delegowanym 2015/2446:\na) istnieje 5 metod zastępczych ustalania wartości celnej ;\nb) istnieje 6 metod ustalania wartości celnej towaru;\nc) metody ustalania wartości celnej wskazano w UKC, nie w Rozp. Delegowanym\nX001\n\n9. Którą z poniższych metod ustalania wartości celnej towaru stosuje się w pierwszej kolejności:\na) metoda dedukcyjna;\nb) metoda towarów identycznych;\nc) metoda towarów podobnych\nX010\n\n10. Gdy sprzedaż lub cena towaru są uzależnione od warunków lub świadczeń, których wartości nie można ustalić:\na) nie ma możliwości zastosowania wartości transakcyjnej;\nb) stosuje się metodę ostatniej szansy,\nc) nie można zaimportować towaru.\nX100\n\n11. Honoraria, tantiemy, opłaty licencyjne są dodawane do wartości transakcyjnej:\na) gdy sprzedający domaga się od kupującego takiej płatności jako warunek sprzedaży;\nb) gdy towary mogą być sprzedane bez płatności tych honorariów;\nc) tylko, gdy są wymagane na terenie UE.\nX100\n\n12. Przeliczenia kursu waluty na PLN, na potrzeby ustalenia wartości celnej, dokonuje się na podstawie:\na) kursów dziennych walut obcych;\nb) bieżących kursów średnich walut obcych ogłaszanych przez NBP;\nc) kursów dziennych z dnia przyjęcia zgłoszenia w procedurze dopuszczenia do obrotu.\nX010\n\n13. Koszty robocizny związanej z pakowaniem towaru mogą stanowić element dodawany do wartości transakcyjnej:\na) nie, nigdy\nb) tak, to jeden z możliwych elementów doliczanych do ceny faktycznie zapłaconej lub należnej;\nc) tak, ale tylko w przypadku szklanych butelek.\nX010\n\n14. W sytuacji zakwestionowania wartości transakcyjnej:\na) należy unieważnić zgłoszenie;\nb) wartość celną należy ustalić metodami zastępczymi ustalania wartości celnej;\nc) należy jedynie dokonać weryfikacji faktur w kraju wystawienia.\nX010`
        }]
    }
];

function init() {
    setStatus('Ładowanie listy testów...');
    hideError();

    try {
        if (!window.ZKTEST_DATA) {
            window.ZKTEST_DATA = { folders: [] };
        }
        state.manifest = loadManifest();

        // 1. Dodanie testów specjalnych do systemu (aby działały jak zwykłe testy)
        SPECIAL_TESTS_DATA.forEach(folder => {
            if (!state.manifest.folders.find(f => f.id === folder.id)) {
                const questions = loadQuestions(folder);
                folder.questionCount = questions.length;
                state.manifest.folders.push(folder);
            }
        });

        // 2. Renderowanie nowych testów specjalnych
        renderSpecialFolders(SPECIAL_TESTS_DATA);

        // 3. Renderowanie standardowych testów (bez testów specjalnych)
        const normalFolders = state.manifest.folders.filter(f => !f.id.startsWith('sp_'));
        renderFolderTiles(normalFolders);
        
        renderExternalLinks();
        setStatus('');
        // Initialize TTS voices if possible
        if ('speechSynthesis' in window) populateVoiceSelect();
    } catch (error) {
        console.error('Nie udało się wczytać bazy testów:', error);
        showError('Nie udało się wczytać bazy testów. Uruchom build-manifest.ps1, aby odtworzyć plik tests/tests-data.js.');
        setStatus('');
    }
}

function loadManifest() {
    const manifest = window.ZKTEST_DATA;

    if (!manifest || !Array.isArray(manifest.folders) || manifest.folders.length === 0) {
        throw new Error('Brak danych testów w window.ZKTEST_DATA.');
    }

    return manifest;
}

const EXTERNAL_LINKS = [
    {
        category: 'Podatki i prawo podatkowe',
        links: [
            { title: 'System podatkowy - test',         url: 'https://docs.google.com/forms/d/e/1FAIpQLSdnC0eIeiGGS8WB6bIuvL2vjaldRbLj0MQm3QXEqAXFabOHtQ/viewform' },
            { title: 'Podatki 1',                       url: 'https://docs.google.com/forms/d/e/1FAIpQLSc7gzAz6A0xhI_qOtuH_49K8_srYu5F4UBB3jfekf8JS1cnPw/viewform' },
            { title: 'Podatki 2',                       url: 'https://docs.google.com/forms/d/e/1FAIpQLSemqr5ZoDMlyAoExbtPdFLzM4mkr65g4MKDbAF6AYjO3PnKWw/viewform' },
            { title: 'Prawo Podatkowe zbiór z kartek',  url: 'https://docs.google.com/forms/d/e/1FAIpQLScYY3FVX2oJrh7WjhbDOkXELepED9pGhtl9eAcivrWMM2l-FQ/viewform' },
        ]
    },
    {
        category: 'Karny i KKS',
        links: [
            { title: 'Karny',                url: 'https://docs.google.com/forms/d/e/1FAIpQLSfrrhE6z5ftwFCIDBiU3ILtl0m-GYs2ZEbfP2W3FpzP_CKbGQ/viewform' },
            { title: 'ZKZ Test 2',           url: 'https://docs.google.com/forms/d/e/1FAIpQLSc18ILi74wkbRQUQVbu_DvjXq8rZnRcdDGM1ibev5IWfjJgZQ/viewform' },
            { title: 'ZKZ TEST 3',           url: 'https://docs.google.com/forms/d/e/1FAIpQLSd0izfPsMr5wG9eZXRFQZNaBibqD3V_SEbrI4xkNUOhfwXHyA/viewform' },
            { title: 'ZKZ TEST 4',           url: 'https://docs.google.com/forms/d/e/1FAIpQLSfnvWngpXliewjznj_U_0-HIfBKlsAl-tMpgfYLKi3PeLmP5g/viewform' },
            { title: 'TEST 2 (02/2025)',      url: 'https://docs.google.com/forms/d/e/1FAIpQLSfDvLvGWCMz3ikF7ZlwzPoIqfy6EJgPeL77fWj3w6EtMRZPvQ/viewform' },
            { title: 'TEST 4',               url: 'https://docs.google.com/forms/d/e/1FAIpQLSfqj6HsqC-zTZCcnIt8jQ5EO_TRa44VRENBeqB9AZzKIsajKg/viewform' },
            { title: 'ZKZ TEST 6',           url: 'https://docs.google.com/forms/d/e/1FAIpQLSccQszO4BqBzhV14_GWLhsM-xu9zPvCt3k1nxzniTK9yVJG9Q/viewform' },
            { title: 'TEST 7',               url: 'https://docs.google.com/forms/d/e/1FAIpQLSeG8FCoJL-41cVH5eEe6N4RPKfshlTKE9mcV_hQIQXXgFBKhg/viewform' },
            { title: 'TEST 9',               url: 'https://docs.google.com/forms/d/e/1FAIpQLSflah2TsDHh_KpG3pC18-m1rT8smxXK6GjUlgEZ9KmNQXZcPA/viewform' },
            { title: 'ZKZ TEST 10',          url: 'https://docs.google.com/forms/d/e/1FAIpQLSfSD7ByYEeVvRpmnIlRGAX-mpA9AAy9e0McJVmcfR7_GDrJTw/viewform' },
            { title: 'ZKZ TEST 11',          url: 'https://docs.google.com/forms/d/e/1FAIpQLSchEhGDlnxd9X7QRYz29sNb0SAVViB8RAVEmYNfccLSSbwjzQ/viewform' },
            { title: 'ZKZ TEST Podsumowanie',url: 'https://docs.google.com/forms/d/e/1FAIpQLSdBH-D85ZXNrqc9JWlXl2WuO2Oztyq7GlOT-6cC7TQqop5RIg/viewform' },
            { title: 'KKS',                  url: 'https://docs.google.com/forms/d/e/1FAIpQLSdn3HSfEKF3jxC0HCUAlLTqBIieyWT7ks3G9iINgiYWBJz24A/viewform' },
            { title: 'KKS dodatkowe - test', url: 'https://docs.google.com/forms/d/e/1FAIpQLSfNliI3zqCJIhnE14CL9BwMrMXSXmQt-XPugHMEnfOuyZ9BXA/viewform' },
        ]
    },
    {
        category: 'Ograniczenia',
        links: [
            { title: 'Ograniczenia część 1', url: 'https://docs.google.com/forms/d/e/1FAIpQLSdh93loTvC9F9QPF3kOZNkkI7IA0vVaUIYlmTfT1AwMmNHl-w/viewform' },
            { title: 'Ograniczenia część 2', url: 'https://docs.google.com/forms/d/e/1FAIpQLSegSbyiIUcGwz7P4zJOtfPypoXu9L-qxCO8nAJuTj3xcfuX3Q/viewform' },
        ]
    },
    {
        category: 'Komunikacja',
        links: [
            { title: 'Komunikacja - test', url: 'https://docs.google.com/forms/d/e/1FAIpQLSfgTkSYSXf7UJyDnWlfuHKtK5LaQQaq0pAKi-ndgAog0zGKhA/viewform' },
        ]
    },
    {
        category: 'Kontrola',
        links: [
            { title: 'Kontrola - test', url: 'https://docs.google.com/forms/d/e/1FAIpQLScKKl7gn2K4zOIIPjQNPVP9IQKYzx4xEpy-x0S_DRp3bUhvQw/viewform' },
        ]
    },
    {
        category: 'Akcyza',
        links: [
            { title: 'Akcyza - test', url: 'https://docs.google.com/forms/d/e/1FAIpQLSe2McMym6LLbRUi0DiQdF759Qv3-FBA9pKbWSlztjNrdQDnrQ/viewform' },
        ]
    },
    {
        category: 'Prawo celne i procedury celne',
        links: [
            { title: 'Procedury Celne - zagadnienia ogólne',              url: 'https://docs.google.com/forms/d/e/1FAIpQLSfEY7iGXj36I57RccJD_ssDbFDwQT0OvSV3s-j-nn9AwxrelQ/viewform' },
            { title: 'Prawo Celne - Postępowanie Celne i Prawo Dewizowe', url: 'https://docs.google.com/forms/d/e/1FAIpQLSewSLlE7f7xm6fRyBUUNnk0ixhwYGq0Ay0qnKvIrYgdYlrLdg/viewform' },
            { title: 'Procedury celne - test',                            url: 'https://docs.google.com/forms/d/e/1FAIpQLScNbbzhfKdUNFfzOaC_vIBFDpobA149kolKcUwWHzWkIhLGBw/viewform' },
            { title: 'Test - Prawo celne',                                url: 'https://docs.google.com/forms/d/e/1FAIpQLSd6_ASDPE6mK7IyZ027nCF5mRFWzO9pE_mmBPo_dqD4t9lbmA/viewform' },
        ]
    },
    {
        category: 'Taryfa',
        links: [
            { title: 'Prawo Celne - Środki Taryfowe', url: 'https://docs.google.com/forms/d/e/1FAIpQLScUIGzsccDAYjqER28yWkVhOHqRHl4Rbcn2dIvkS7no317n8g/viewform' },
            { title: 'TEST - ZKZ - Taryfa',           url: 'https://docs.google.com/forms/d/e/1FAIpQLSdSmswk2vb8MaoPKm_ATTEc8w9psTVoOyU9qS_lYkexZb1SYg/viewform' },
        ]
    },
    {
        category: 'Wartość celna',
        links: [
            { title: 'Prawo Celne - Wartość celna towarów', url: 'https://docs.google.com/forms/d/e/1FAIpQLSeV5URw6zArpFWrC-5ukim8WnQ-AeQt8cawhiIpqmHi4U72ug/viewform' },
            { title: 'Test Wartość Celna ZKZ',              url: 'https://docs.google.com/forms/d/e/1FAIpQLSdP05TMx5Ajwf5_u4zLQudIkWxxiE48PcV3ioxksy12yl5xnA/viewform' },
        ]
    },
    {
        category: 'Pochodzenie towaru i preferencje',
        links: [
            { title: '151–181',                                      url: 'https://docs.google.com/forms/d/e/1FAIpQLSfHbxeLXtYmw0lgfpyF-4b8iaNixn-TR1EUpy1yyIQV634bJQ/viewform' },
            { title: 'TEST - ZKZ - Pochodzenie towaru / Zwalczanie', url: 'https://docs.google.com/forms/d/e/1FAIpQLSdl3tRebRuNisNHg_ceuTrG46SiYLv8Vi--RzGk5Zs9MjRHmQ/viewform' },
        ]
    },
    {
        category: 'Mieszane',
        links: [
            { title: 'Testor ZKZ', url: 'https://docs.google.com/forms/d/e/1FAIpQLSfJx0g9dsoFXLspX-vKCVQOyHlbUgFBns3K2ur_G3py1hODMw/viewform' },
        ]
    },
];

const FOLDER_ICON_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 7a2 2 0 0 1 2-2h4.586a1 1 0 0 1 .707.293L11.707 6.7A1 1 0 0 0 12.414 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
</svg>`;

const ARROW_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="9 18 15 12 9 6"/>
</svg>`;

const EXTERNAL_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
  <polyline points="15 3 21 3 21 9"/>
  <line x1="10" y1="14" x2="21" y2="3"/>
</svg>`;

// ── DODANE: Funkcja rysująca nowe kafle w oddzielnej sekcji
function renderSpecialFolders(folders) {
    const grid = elements.specialFolderGrid;
    if (!grid) return;
    grid.innerHTML = '';

    folders.forEach((folder) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'folder-card';
        button.addEventListener('click', () => startQuiz(folder.id));

        const iconWrap = document.createElement('div');
        iconWrap.className = 'folder-icon';
        iconWrap.innerHTML = FOLDER_ICON_SVG;

        const body = document.createElement('div');
        body.className = 'folder-card__body';

        const title = document.createElement('h3');
        title.textContent = folder.title;

        const description = document.createElement('p');
        description.textContent = `${folder.questionCount} pytań`;

        body.appendChild(title);
        body.appendChild(description);

        const arrow = document.createElement('span');
        arrow.className = 'folder-card__arrow';
        arrow.innerHTML = ARROW_SVG;

        button.appendChild(iconWrap);
        button.appendChild(body);
        button.appendChild(arrow);
        grid.appendChild(button);
    });
}

function renderFolderTiles(folders) {
    elements.folderGrid.innerHTML = '';

    const generalPattern = /^Test[_\s]?\d+$/i;
    const thematic = folders.filter((f) => !generalPattern.test(f.id));
    const general  = folders.filter((f) =>  generalPattern.test(f.id));

    const groups = [
        { label: 'Tematyka', items: thematic },
        { label: 'Ogólne',   items: general  }
    ];

    groups.forEach((group) => {
        if (group.items.length === 0) {
            return;
        }

        const column = document.createElement('div');
        column.className = 'folder-column';

        const heading = document.createElement('h3');
        heading.className = 'folder-column__heading';
        heading.textContent = group.label;
        column.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'folder-column__grid';

        group.items.forEach((folder) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'folder-card';
            button.addEventListener('click', () => startQuiz(folder.id));

            const iconWrap = document.createElement('div');
            iconWrap.className = 'folder-icon';
            iconWrap.innerHTML = FOLDER_ICON_SVG;

            const body = document.createElement('div');
            body.className = 'folder-card__body';

            const title = document.createElement('h3');
            title.textContent = folder.title;

            const description = document.createElement('p');
            description.textContent = `${folder.questionCount} pytań`;

            body.appendChild(title);
            body.appendChild(description);

            const arrow = document.createElement('span');
            arrow.className = 'folder-card__arrow';
            arrow.innerHTML = ARROW_SVG;

            button.appendChild(iconWrap);
            button.appendChild(body);
            button.appendChild(arrow);
            grid.appendChild(button);
        });

        column.appendChild(grid);
        elements.folderGrid.appendChild(column);
    });
}

const CHEVRON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

function renderExternalLinks() {
    const section = document.getElementById('externalLinksSection');
    if (!section) return;

    const accordion = section.querySelector('.links-accordion');
    accordion.innerHTML = '';

    EXTERNAL_LINKS.forEach((group) => {
        const item = document.createElement('div');
        item.className = 'accordion-item';

        const header = document.createElement('button');
        header.type = 'button';
        header.className = 'accordion-header';

        const headerLeft = document.createElement('span');
        headerLeft.className = 'accordion-header__left';

        const dot = document.createElement('span');
        dot.className = 'accordion-dot';

        const title = document.createElement('span');
        title.className = 'accordion-header__title';
        title.textContent = group.category;

        const count = document.createElement('span');
        count.className = 'accordion-header__count';
        count.textContent = `${group.links.length}`;

        headerLeft.appendChild(dot);
        headerLeft.appendChild(title);
        headerLeft.appendChild(count);

        const chevron = document.createElement('span');
        chevron.className = 'accordion-chevron';
        chevron.innerHTML = CHEVRON_SVG;

        header.appendChild(headerLeft);
        header.appendChild(chevron);

        const body = document.createElement('div');
        body.className = 'accordion-body';

        const inner = document.createElement('div');
        inner.className = 'accordion-body-inner';

        group.links.forEach((link) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'link-item';
            btn.addEventListener('click', () => { window.location.href = link.url; });

            const iconWrap = document.createElement('span');
            iconWrap.className = 'link-item__icon';
            iconWrap.innerHTML = EXTERNAL_ICON_SVG;

            const label = document.createElement('span');
            label.className = 'link-item__label';
            label.textContent = link.title;

            const arrow = document.createElement('span');
            arrow.className = 'link-item__arrow';
            arrow.innerHTML = ARROW_SVG;

            btn.appendChild(iconWrap);
            btn.appendChild(label);
            btn.appendChild(arrow);
            inner.appendChild(btn);
        });

        body.appendChild(inner);

        header.addEventListener('click', () => {
            const isOpen = item.classList.contains('is-open');
            item.classList.toggle('is-open', !isOpen);
        });

        item.appendChild(header);
        item.appendChild(body);
        accordion.appendChild(item);
    });
}

// ── Session persistence ────────────────────────────────
function sessionKey(folderId) { return `zktest_v1_${folderId}`; }

function saveSession() {
    if (!state.selectedFolder) return;
    try {
        localStorage.setItem(sessionKey(state.selectedFolder.id), JSON.stringify({
            folderId: state.selectedFolder.id,
            questions: state.questions,
            currentQuestionIndex: state.currentQuestionIndex,
            score: state.score,
            results: state.results
        }));
    } catch (_) { /* ignore quota errors */ }
}

function loadSession(folderId) {
    try {
        const raw = localStorage.getItem(sessionKey(folderId));
        return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
}

function clearSession(folderId) {
    localStorage.removeItem(sessionKey(folderId));
}

// ── TTS ────────────────────────────────────────────────
let ttsVoices = [];
let ttsSpeaking = false;
let currentAudio = null;
const TTS_VOICE_KEY = 'zktest_tts_voice';
const FAKE_GOOGLE_VOICE = { name: 'Google (Online - naturalny)', lang: 'pl-PL', isGoogleOnline: true };

function voiceQualityScore(v) {
    if (v.isGoogleOnline) return 90; 
    const name = v.name.toLowerCase();
    if (/natural/.test(name))  return 100;
    if (/neural/.test(name))   return 95;
    if (/online/.test(name))   return 85;
    if (/google/.test(name))   return 70;
    if (/zofia|marek|agnieszka|krzysztof/.test(name)) return 60;
    if (/paulina/.test(name))  return 10;
    return 30;
}

function getAllPolishVoices() {
    const voices = ttsVoices
        .filter((v) => v.lang.startsWith('pl'))
        .sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a));
    
    voices.unshift(FAKE_GOOGLE_VOICE);
    return voices.sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a));
}

function formatVoiceLabel(v) {
    if (v.isGoogleOnline) return `☁️ ${v.name}`;
    const score = voiceQualityScore(v);
    const prefix = score >= 95 ? '⭐ ' : score >= 70 ? '✓ ' : '';
    return `${prefix}${v.name}`;
}

function populateVoiceSelect() {
    const sel = elements.ttsVoiceSelect;
    if (!sel) return;
    const voices = getAllPolishVoices();
    const saved = localStorage.getItem(TTS_VOICE_KEY);

    sel.innerHTML = '';

    voices.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = formatVoiceLabel(v);
        sel.appendChild(opt);
    });

    if (saved && voices.some((v) => v.name === saved)) {
        sel.value = saved;
    } else {
        sel.value = voices[0].name;
    }
}

function getSelectedVoice() {
    const name = elements.ttsVoiceSelect && elements.ttsVoiceSelect.value;
    if (name === FAKE_GOOGLE_VOICE.name) return FAKE_GOOGLE_VOICE;
    return ttsVoices.find((v) => v.name === name) || getAllPolishVoices()[0] || null;
}

if ('speechSynthesis' in window) {
    ttsVoices = speechSynthesis.getVoices();
    speechSynthesis.addEventListener('voiceschanged', () => {
        ttsVoices = speechSynthesis.getVoices();
        populateVoiceSelect();
    });
}

// ── Obejście: Głos Online Google ───────────────────────
async function speakGoogleOnline(text) {
    const chunks = [];
    let str = text.replace(/\s+/g, ' ').trim();
    while (str.length > 0) {
        if (str.length <= 150) {
            chunks.push(str);
            break;
        }
        let splitAt = str.lastIndexOf(' ', 150);
        if (splitAt === -1) splitAt = 150;
        chunks.push(str.substring(0, splitAt));
        str = str.substring(splitAt).trim();
    }

    let i = 0;
    return new Promise((resolve) => {
        function playNext() {
            if (i >= chunks.length || !ttsSpeaking) {
                setTTSState(false);
                resolve();
                return;
            }
            const chunk = encodeURIComponent(chunks[i]);
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=pl&client=tw-ob&q=${chunk}`;
            const audio = new Audio(url);
            currentAudio = audio;

            audio.onended = () => { i++; playNext(); };
            audio.onerror = () => { setTTSState(false); resolve(); };
            audio.play().catch((err) => { 
                console.error("Błąd odtwarzania chmury:", err);
                setTTSState(false); 
                resolve(); 
            });
        }
        playNext();
    });
}

function speakBrowser(text) {
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'pl-PL';
    utt.rate = 0.95;
    utt.pitch = 1.0;
    const voice = getSelectedVoice();
    if (voice && !voice.isGoogleOnline) utt.voice = voice;
    utt.onend = () => setTTSState(false);
    utt.onerror = () => setTTSState(false);
    speechSynthesis.speak(utt);
}

function buildQuestionText(question) {
    const letters = ['a', 'b', 'c', 'd', 'e', 'f'];
    const qText = question.questionText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const optsText = question.options.map((o, i) => `${letters[i]}... ${o}`).join('. ');
    return `${qText}. ${optsText}.`;
}

async function toggleTTS() {
    if (ttsSpeaking) { stopTTS(); return; }
    const question = state.questions[state.currentQuestionIndex];
    if (!question) return;

    const text = buildQuestionText(question);
    setTTSState(true);

    try {
        const voice = getSelectedVoice();
        if (voice && voice.isGoogleOnline) {
            await speakGoogleOnline(text);
        } else if ('speechSynthesis' in window) {
            speakBrowser(text);
        }
    } catch (err) {
        console.error('TTS error:', err);
        alert('Błąd odtwarzania głosu: ' + err.message);
        setTTSState(false);
    }
}

function setTTSState(speaking) {
    ttsSpeaking = speaking;
    elements.ttsBtn.classList.toggle('btn-tts--active', speaking);
    elements.ttsBtn.title = speaking ? 'Zatrzymaj' : 'Przeczytaj pytanie';
}

function stopTTS() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    setTTSState(false);
}

// ── Preview ────────────────────────────────────────────
const PREVIEW_TEXT = 'Witaj! To jest próbka głosu. Sprawdź czy brzmi naturalnie i odpowiada Twoim preferencjom.';

async function previewVoice() {
    stopTTS();
    setTTSState(true);
    try {
        const voice = getSelectedVoice();
        if (voice && voice.isGoogleOnline) {
            await speakGoogleOnline(PREVIEW_TEXT);
        } else {
            speakBrowser(PREVIEW_TEXT);
        }
    } catch (err) {
        alert('Błąd podglądu: ' + err.message);
        setTTSState(false);
    }
}

// ── Quiz start ─────────────────────────────────────────
function startQuiz(folderId) {
    const saved = loadSession(folderId);
    if (saved && saved.currentQuestionIndex < saved.questions.length) {
        state.pendingFolderId = folderId;
        elements.continueInfo.textContent =
            `Pytanie ${saved.currentQuestionIndex + 1} / ${saved.questions.length} · Poprawne: ${saved.score}`;
        showContinueScreen();
        return;
    }
    startFreshQuiz(folderId);
}

function onContinueSession() {
    const folderId = state.pendingFolderId;
    if (!folderId) return;
    const saved = loadSession(folderId);
    if (!saved) { startFreshQuiz(folderId); return; }

    const folder = state.manifest.folders.find((f) => f.id === folderId);
    if (!folder) return;

    state.selectedFolder = folder;
    state.questions = saved.questions;
    state.currentQuestionIndex = saved.currentQuestionIndex;
    state.score = saved.score;
    state.results = saved.results || [];
    state.pendingFolderId = null;

    elements.selectedTestName.textContent = folder.title;
    showQuizScreen();
    showQuestion();
}

function startFreshQuiz(folderId) {
    const folder = state.manifest.folders.find((item) => item.id === folderId);
    if (!folder) { showError('Nie znaleziono wybranego testu.'); return; }

    clearSession(folderId);
    setStatus(`Otwieranie testu „${folder.title}”...`);
    hideError();

    try {
        const questions = loadQuestions(folder);
        if (questions.length === 0) throw new Error('Brak pytań.');

        state.selectedFolder = folder;
        state.questions = shuffleArray(questions);
        state.currentQuestionIndex = 0;
        state.score = 0;
        state.results = [];
        state.pendingFolderId = null;

        elements.selectedTestName.textContent = folder.title;
        showQuizScreen();
        showQuestion();
    } catch (error) {
        console.error(error);
        showError(`Nie udało się otworzyć testu „${folder.title}”.`);
    } finally {
        setStatus('');
    }
}

function loadQuestions(folder) {
    return folder.files.reduce((allQuestions, fileMeta) => {
        const questionsFromFile = parseQuestionsFromFile(fileMeta.content, fileMeta.name);
        return allQuestions.concat(questionsFromFile);
    }, []);
}

function parseQuestionsFromFile(text, filename) {
    if (typeof text !== 'string' || !text.trim()) {
        return [];
    }

    const rawLines = text.split(/\r?\n/);
    const lines = [];

    for (const line of rawLines) {
        let trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith('klucz:')) {
            trimmed = trimmed.replace(/^klucz:\s*/i, '').trim();
        }

        if (trimmed.length > 0) {
            lines.push(trimmed);
        }
    }

    const questionBlocks = [];
    let currentBlock = [];

    // Zaktualizowana logika obsługująca OBA formaty: klucz na początku i na końcu bloku
    for (const line of lines) {
        if (isAnswerKey(line)) {
            if (currentBlock.length === 0) {
                // Stary format: klucz znajduje się na samej górze
                currentBlock.push(line);
            } else if (currentBlock.some(l => isAnswerKey(l))) {
                // Stary format: w bloku jest już klucz, więc ten należy do następnego pytania
                questionBlocks.push(currentBlock);
                currentBlock = [line];
            } else {
                // Nowy format: w bloku nie ma jeszcze klucza, znalazł się na samym dole
                currentBlock.push(line);
                questionBlocks.push(currentBlock);
                currentBlock = [];
            }
        } else {
            currentBlock.push(line);
        }
    }
    
    // Zabezpieczenie dla ostatniego pytania w starym formacie
    if (currentBlock.length > 0 && currentBlock.some(l => isAnswerKey(l))) {
        questionBlocks.push(currentBlock);
    }

    return questionBlocks
        .map((block, index) => {
            const blockFilename = index === 0 ? filename : `${filename}#${index + 1}`;
            return parseQuestionBlock(block, blockFilename);
        })
        .filter(Boolean);
}

function parseQuestionBlock(lines, filename) {
    if (lines.length < 2) {
        return null;
    }

    let keyLine;
    
    // Dynamicznie wyciągamy klucz z góry lub z dołu
    if (isAnswerKey(lines[0])) {
        keyLine = lines.shift();
    } else if (isAnswerKey(lines[lines.length - 1])) {
        keyLine = lines.pop();
    } else {
        return null;
    }

    const correctIndexes = [];
    for (let index = 1; index < keyLine.length; index += 1) {
        if (keyLine[index] === '1') {
            correctIndexes.push(index - 1);
        }
    }

    const expectedOptionCount = keyLine.length - 1;
    const questionLines = [];
    const options = [];
    let parsingOptionsMode = false;

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];

        if (isOptionStart(line, parsingOptionsMode, questionLines.length > 0)) {
            parsingOptionsMode = true;
            options.push(stripOptionPrefix(line));
            continue;
        }

        if (parsingOptionsMode && options.length > 0) {
            options[options.length - 1] += ` ${line}`;
        } else {
            questionLines.push(line);
        }
    }

    if (options.length === 0 && questionLines.length > expectedOptionCount) {
        const fallbackQuestionLines = questionLines.slice(0, questionLines.length - expectedOptionCount);
        const fallbackOptionLines = questionLines.slice(questionLines.length - expectedOptionCount);

        if (fallbackQuestionLines.length > 0 && fallbackOptionLines.length === expectedOptionCount) {
            questionLines.length = 0;
            questionLines.push(...fallbackQuestionLines);
            options.push(...fallbackOptionLines.map(stripOptionPrefix));
        }
    }

    if (questionLines.length === 0 || options.length !== expectedOptionCount) {
        return null;
    }

    const questionText = questionLines.map((line) => `${escapeHtml(line)}<br>`).join('');
    return { questionText, options, correctIndexes, filename };
}

function isAnswerKey(line) {
    return /^X[01]+$/.test(line);
}

function isOptionStart(line, parsingOptionsMode, hasQuestionText) {
    if (/^[a-z]\s*[.)]/i.test(line)) {
        return true;
    }

    if (/^[\u2022*-]\s*/.test(line)) {
        return true;
    }

    if ((parsingOptionsMode || hasQuestionText) && /^[a-e]\s+[^\s]/i.test(line)) {
        return true;
    }

    if ((parsingOptionsMode || hasQuestionText) && /^\d+\s*[.)]\s*/.test(line)) {
        return true;
    }

    return false;
}

function stripOptionPrefix(line) {
    return line
        .replace(/^[a-z]\s*[.)]\s*/i, '')
        .replace(/^[\u2022*-]\s*/u, '')
        .replace(/^\d+\s*[.)]\s*/u, '')
        .replace(/^[a-e]\s+/i, '')
        .trim();
}

function showQuestion() {
    stopTTS();
    const question = state.questions[state.currentQuestionIndex];

    elements.progressText.textContent = `Pytanie: ${state.currentQuestionIndex + 1} / ${state.questions.length}`;
    elements.scoreText.textContent = `Poprawne: ${state.score}`;
    elements.questionTitle.innerHTML = question.questionText;
    elements.optionsContainer.innerHTML = '';

    question.options.forEach((optionText, index) => {
        const label = document.createElement('label');
        label.className = 'option';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = index;
        input.className = 'answer-input';

        const span = document.createElement('span');
        span.textContent = optionText;

        label.appendChild(input);
        label.appendChild(span);
        elements.optionsContainer.appendChild(label);
    });

    elements.checkBtn.classList.remove('hidden');
    elements.nextBtn.classList.add('hidden');
}

function checkAnswer() {
    const question = state.questions[state.currentQuestionIndex];
    const inputs = document.querySelectorAll('.answer-input');
    let isPerfect = true;
    let anythingChecked = false;
    const selectedIndexes = [];

    inputs.forEach((input, index) => {
        const isChecked = input.checked;
        const isCorrect = question.correctIndexes.includes(index);
        if (isChecked) { anythingChecked = true; selectedIndexes.push(index); }
        input.disabled = true;
        if (isChecked && isCorrect) {
            input.parentElement.classList.add('correct');
        } else if (isChecked && !isCorrect) {
            input.parentElement.classList.add('incorrect');
            isPerfect = false;
        } else if (!isChecked && isCorrect) {
            input.parentElement.classList.add('missed');
            isPerfect = false;
        }
    });

    if (!anythingChecked) {
        alert('Zaznacz chociaż jedną odpowiedź przed sprawdzeniem.');
        inputs.forEach((input) => { input.disabled = false; });
        return;
    }

    if (isPerfect) {
        state.score += 1;
        elements.scoreText.textContent = `Poprawne: ${state.score}`;
    }

    // Record result for summary
    state.results.push({
        questionIndex: state.currentQuestionIndex,
        correct: isPerfect,
        selectedIndexes,
        correctIndexes: question.correctIndexes,
        questionText: question.questionText,
        options: question.options
    });

    saveSession();
    elements.checkBtn.classList.add('hidden');
    elements.nextBtn.classList.remove('hidden');
}

function goToNextQuestion() {
    state.currentQuestionIndex += 1;
    saveSession();

    if (state.currentQuestionIndex < state.questions.length) {
        showQuestion();
        return;
    }

    // Done — clear session and show summary
    clearSession(state.selectedFolder.id);
    elements.finalScore.textContent = state.score;
    elements.finalTotal.textContent = state.questions.length;
    elements.endSummary.textContent = `${state.selectedFolder.title} · ${state.score} / ${state.questions.length} poprawnych`;
    renderSummary();
    showEndScreen();
}

function renderSummary() {
    const list = elements.resultsList;
    list.innerHTML = '';
    const letters = ['a', 'b', 'c', 'd', 'e', 'f'];

    state.results.forEach((res, i) => {
        const item = document.createElement('div');
        item.className = `result-item ${res.correct ? 'result-item--ok' : 'result-item--fail'}`;

        // Header row
        const header = document.createElement('div');
        header.className = 'result-item__header';

        const badge = document.createElement('span');
        badge.className = 'result-item__badge';
        badge.textContent = res.correct ? '✓' : '✗';

        const num = document.createElement('span');
        num.className = 'result-item__num';
        num.textContent = `Pytanie ${i + 1}`;

        const qtext = document.createElement('span');
        qtext.className = 'result-item__question';
        qtext.innerHTML = res.questionText.replace(/<br>/g, ' ');

        header.appendChild(badge);
        header.appendChild(num);
        header.appendChild(qtext);
        item.appendChild(header);

        // Options (only for incorrect)
        if (!res.correct) {
            const opts = document.createElement('div');
            opts.className = 'result-item__options';
            res.options.forEach((opt, oi) => {
                const row = document.createElement('div');
                const isCorrect = res.correctIndexes.includes(oi);
                const wasSelected = res.selectedIndexes.includes(oi);
                row.className = 'result-opt' +
                    (isCorrect ? ' result-opt--correct' : '') +
                    (wasSelected && !isCorrect ? ' result-opt--wrong' : '');
                row.textContent = `${letters[oi]}) ${opt}`;
                opts.appendChild(row);
            });
            item.appendChild(opts);
        }

        list.appendChild(item);
    });
}

function retrySelectedTest() {
    if (!state.selectedFolder) { showSetupScreen(); return; }
    startFreshQuiz(state.selectedFolder.id);
}

// ── ZMIANA TUTAJ: Dodana sekcja z testami specjalnymi do sterowania oknami ──
const materialsSection     = document.getElementById('materials');
const externalLinksSection = document.getElementById('externalLinksSection');
const specialTestsSection  = document.getElementById('specialTestsSection');

const ALL_SCREENS = () => [
    elements.setup, elements.quiz, elements.endScreen,
    elements.continueScreen, materialsSection, externalLinksSection, specialTestsSection
];

function showSetupScreen() {
    stopTTS();
    ALL_SCREENS().forEach((s) => {
        if(s) s.classList.add('hidden');
    });
    elements.setup.classList.remove('hidden');
    materialsSection.classList.remove('hidden');
    externalLinksSection.classList.remove('hidden');
    if (specialTestsSection) specialTestsSection.classList.remove('hidden');
    elements.selectedTestName.textContent = '';
}

function showContinueScreen() {
    ALL_SCREENS().forEach((s) => {
        if(s) s.classList.add('hidden');
    });
    elements.continueScreen.classList.remove('hidden');
}

function showQuizScreen() {
    ALL_SCREENS().forEach((s) => {
        if(s) s.classList.add('hidden');
    });
    elements.quiz.classList.remove('hidden');
}

function showEndScreen() {
    stopTTS();
    ALL_SCREENS().forEach((s) => {
        if(s) s.classList.add('hidden');
    });
    elements.endScreen.classList.remove('hidden');
}

function setStatus(message) {
    elements.loadingMsg.textContent = message;
}

function showError(message) {
    elements.errorMsg.textContent = message;
    elements.errorMsg.classList.remove('hidden');
}

function hideError() {
    elements.errorMsg.textContent = '';
    elements.errorMsg.classList.add('hidden');
}

function shuffleArray(items) {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
}

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}