const state = {
    manifest: null,
    questions: [],
    selectedFolder: null,
    currentQuestionIndex: 0,
    score: 0
};

const elements = {
    setup: document.getElementById('setup'),
    quiz: document.getElementById('quiz'),
    endScreen: document.getElementById('endScreen'),
    folderGrid: document.getElementById('folderGrid'),
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
    finalScore: document.getElementById('finalScore'),
    finalTotal: document.getElementById('finalTotal'),
    endSummary: document.getElementById('endSummary')
};

document.addEventListener('DOMContentLoaded', init);
elements.checkBtn.addEventListener('click', checkAnswer);
elements.nextBtn.addEventListener('click', goToNextQuestion);
elements.backToListBtn.addEventListener('click', showSetupScreen);
elements.retryBtn.addEventListener('click', retrySelectedTest);
elements.restartBtn.addEventListener('click', showSetupScreen);

// ── PDF modal ──────────────────────────────────────────
const pdfModal      = document.getElementById('pdfModal');
const pdfFrame      = document.getElementById('pdfFrame');
const pdfModalTitle = document.getElementById('pdfModalTitle');
const pdfModalClose = document.getElementById('pdfModalClose');

document.querySelectorAll('.material-card').forEach((btn) => {
    btn.addEventListener('click', () => {
        const src   = btn.dataset.pdf;
        const title = btn.querySelector('h3').textContent;
        pdfModalTitle.textContent = title;
        pdfFrame.src = src;
        pdfModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });
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

function init() {
    setStatus('Ładowanie listy testów...');
    hideError();

    try {
        state.manifest = loadManifest();
        renderFolderTiles(state.manifest.folders);
        renderExternalLinks();
        setStatus('');
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

        // Header (always visible, clickable)
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

        // Body (hidden by default)
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

function startQuiz(folderId) {
    const folder = state.manifest.folders.find((item) => item.id === folderId);

    if (!folder) {
        showError('Nie znaleziono wybranego testu.');
        return;
    }

    setStatus(`Otwieranie testu „${folder.title}”...`);
    hideError();

    try {
        const questions = loadQuestions(folder);

        if (questions.length === 0) {
            throw new Error('Brak poprawnie wczytanych pytań.');
        }

        state.selectedFolder = folder;
        state.questions = shuffleArray(questions);
        state.currentQuestionIndex = 0;
        state.score = 0;

        elements.selectedTestName.textContent = folder.title;
        showQuizScreen();
        showQuestion();
    } catch (error) {
        console.error(`Nie udało się przygotować testu ${folder.title}:`, error);
        showError(`Nie udało się otworzyć testu „${folder.title}”. Sprawdź, czy plik tests/tests-data.js został poprawnie wygenerowany.`);
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
        const trimmed = line.trim();
        if (trimmed.length > 0) {
            lines.push(trimmed);
        }
    }

    if (lines.length < 2) {
        return [];
    }

    const questionBlocks = [];
    let currentBlock = [];

    for (const line of lines) {
        if (isAnswerKey(line) && currentBlock.length > 0) {
            questionBlocks.push(currentBlock);
            currentBlock = [line];
            continue;
        }

        currentBlock.push(line);
    }

    if (currentBlock.length > 0) {
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

    const keyLine = lines[0];
    if (!isAnswerKey(keyLine)) {
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

    for (let index = 1; index < lines.length; index += 1) {
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

    inputs.forEach((input, index) => {
        const isChecked = input.checked;
        const isCorrect = question.correctIndexes.includes(index);

        if (isChecked) {
            anythingChecked = true;
        }

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
        inputs.forEach((input) => {
            input.disabled = false;
        });
        return;
    }

    if (isPerfect) {
        state.score += 1;
        elements.scoreText.textContent = `Poprawne: ${state.score}`;
    }

    elements.checkBtn.classList.add('hidden');
    elements.nextBtn.classList.remove('hidden');
}

function goToNextQuestion() {
    state.currentQuestionIndex += 1;

    if (state.currentQuestionIndex < state.questions.length) {
        showQuestion();
        return;
    }

    elements.finalScore.textContent = state.score;
    elements.finalTotal.textContent = state.questions.length;
    elements.endSummary.textContent = `Przerobiłeś wszystkie pytania z testu „${state.selectedFolder.title}”.`;

    showEndScreen();
}

function retrySelectedTest() {
    if (!state.selectedFolder) {
        showSetupScreen();
        return;
    }

    startQuiz(state.selectedFolder.id);
}

const materialsSection    = document.getElementById('materials');
const externalLinksSection = document.getElementById('externalLinksSection');

function showSetupScreen() {
    elements.setup.classList.remove('hidden');
    elements.quiz.classList.add('hidden');
    elements.endScreen.classList.add('hidden');
    elements.selectedTestName.textContent = '';
    materialsSection.classList.remove('hidden');
    externalLinksSection.classList.remove('hidden');
}

function showQuizScreen() {
    elements.setup.classList.add('hidden');
    elements.quiz.classList.remove('hidden');
    elements.endScreen.classList.add('hidden');
    materialsSection.classList.add('hidden');
    externalLinksSection.classList.add('hidden');
}

function showEndScreen() {
    elements.setup.classList.add('hidden');
    elements.quiz.classList.add('hidden');
    elements.endScreen.classList.remove('hidden');
    materialsSection.classList.add('hidden');
    externalLinksSection.classList.add('hidden');
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
