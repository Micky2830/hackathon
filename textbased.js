// Challenge data
let challenges = [];

// Fetch challenges from JSON file
fetch('real.json')
    .then(response => response.json())
    .then(data => {
        challenges = data;
        initQuestionList();
    })
    .catch(error => console.error('Error loading questions:', error));


// State management
let currentQuestion = 0;
let startTime = null;
let timerInterval = null;
let completedQuestions = new Set();
let currentOutput = "";
let hasRunCode = false;
let currentMatchPercentage = 0;
let isCorrect = false;
let currentCode = "";
let currentTestCase = null;
let passCount = 0;
let currentLanguage = "python";

const languageFiles = {
    "python": "main.py",
    "javascript": "index.js",
    "java": "Main.java",
    "c": "main.c",
    "cpp": "main.cpp",
    "csharp": "HelloWorld.cs",
    "nodejs": "index.js",
    "lua": "main.lua",
    "r": "main.r",
    "ruby": "main.rb",
    "php": "main.php"
};

// DOM Elements
const startScreen = document.getElementById('startScreen');
const languageSelect = document.getElementById('languageSelect');
const challengeContent = document.getElementById('challengeContent');
const completionScreen = document.getElementById('completionScreen');
const questionList = document.getElementById('questionList');
const questionContent = document.getElementById('questionContent');
const timerDisplay = document.getElementById('timerDisplay');
const outputArea = document.getElementById('outputArea');
const matchPercentage = document.getElementById('matchPercentage');
const btnStart = document.getElementById('btnStart');
const btnRun = document.getElementById('btnRun');
const btnSubmit = document.getElementById('btnSubmit');
const btnRestart = document.getElementById('btnRestart');
const iframe = document.getElementById('oc-editor');

// check output
// window.onmessage = function (event) {
//     if (event.data && event.data.language) {
//         console.log(event.data);
//     }
// };


// Initialize question list
// Initialize question list
function initQuestionList() {
    questionList.innerHTML = '';

    const levels = ['easy', 'normal', 'hard'];
    const levelTitles = {
        'easy': 'Easy',
        'normal': 'Normal',
        'hard': 'Hard'
    };

    // Group challenges by level
    const groupedChallenges = {
        'easy': [],
        'normal': [],
        'hard': []
    };

    challenges.forEach((challenge, index) => {
        if (groupedChallenges[challenge.level]) {
            groupedChallenges[challenge.level].push({ ...challenge, originalIndex: index });
        }
    });

    levels.forEach(level => {
        if (groupedChallenges[level].length > 0) {
            // Create Header
            const header = document.createElement('h6');
            header.className = 'level-header';
            header.textContent = levelTitles[level];
            questionList.appendChild(header);

            // Create Grid Container
            const grid = document.createElement('div');
            grid.className = 'question-grid';

            groupedChallenges[level].forEach(item => {
                const btn = document.createElement('div');
                btn.className = `question-btn btn-${level}`;
                btn.textContent = item.id;
                btn.dataset.index = item.originalIndex;

                btn.addEventListener('click', () => {
                    if (!completedQuestions.has(item.originalIndex)) {
                        showQuestion(item.originalIndex);
                    }

                });

                grid.appendChild(btn);
            });

            questionList.appendChild(grid);
        }
    });

    updateQuestionList();
}

// Update question list styling
function updateQuestionList() {
    const items = document.querySelectorAll('.question-btn');
    items.forEach(item => {
        const index = parseInt(item.dataset.index);
        item.classList.remove('active', 'completed');

        if (index === currentQuestion) {
            item.classList.add('active');
        } else if (completedQuestions.has(index)) {
            item.classList.add('completed');
        }
    });
}

// Show question
function showQuestion(index) {
    currentQuestion = index;
    const challenge = challenges[index];

    questionContent.innerHTML = `
        <h4>Question ${challenge.id}: ${challenge.title}</h4>
        <p>${challenge.description}</p>
    `;

    // Get starter code for current language
    // Fallback to python or empty string if not found
    if (typeof challenge.starterCode === 'object') {
        currentCode = challenge.starterCode[currentLanguage] || "";
    } else {
        currentCode = challenge.starterCode; // Legacy support or default
    }

    const fileName = languageFiles[currentLanguage] || "main.py";

    // Load starter code into iframe
    setTimeout(() => {
        iframe.contentWindow.postMessage({
            eventType: 'populateCode',
            language: currentLanguage,
            files: [
                {
                    name: fileName,
                    content: currentCode
                }
            ],
            stdin: challenge.testCases[0].stdin
        }, '*');
    }, 500);

    outputArea.value = ' ';
    matchPercentage.textContent = 'Match: 0%';
    matchPercentage.className = 'match-percentage match-none';
    hasRunCode = false;
    btnSubmit.disabled = false;
    currentMatchPercentage = 0;
    isCorrect = false;
    currentTestCase = null;
    updateQuestionList();
}

// Start timer
function startTimer() {
    startTime = new Date();
    timerInterval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - startTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        timerDisplay.textContent = `Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} `;
    }, 1000);
}

// Stop timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Format final time
function getFinalTime() {
    if (!startTime) return "--";
    const elapsed = Math.floor((new Date() - startTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} `;
}

// Calculate match percentage using Levenshtein distance or simple char matching
function calculateMatchPercentage(output, expected) {
    if (!output || !expected) return 0;

    const outputStr = output.trim();
    const expectedStr = expected.trim();

    if (outputStr === expectedStr) return 100;

    let matches = 0;
    const len = Math.max(outputStr.length, expectedStr.length);

    for (let i = 0; i < Math.min(outputStr.length, expectedStr.length); i++) {
        if (outputStr[i] === expectedStr[i]) {
            matches++;
        }
    }

    return Math.floor((matches / len) * 100);
}

// Check if answer is correct using the 'result.output' from iframe
function isAnswerCorrect(output, expectedOutput) {
    return output.trim() === expectedOutput.trim();
}


// Update match percentage display
function updateMatchDisplay(percentage, isCorrect) {
    matchPercentage.textContent = `Match: ${percentage}%`;

    if (isCorrect) {
        matchPercentage.className = 'match-percentage match-100';
    } else if (percentage > 0) {
        matchPercentage.className = 'match-percentage match-partial';
    } else {
        matchPercentage.className = 'match-percentage match-none';
    }
}

// Event listeners
btnStart.addEventListener('click', () => {
    currentLanguage = languageSelect.value;

    // Update iframe src with selected language
    const newSrc = `https://onecompiler.com/embed/${currentLanguage}?listenToEvents=true&codeChangeEvent=true&hideResult=true&hideStdin=true&hideLanguageSelection=true&hideNew=true&hideRun=true&hideResult=true`;
    iframe.src = newSrc;

    startScreen.style.display = 'none';
    challengeContent.style.display = 'flex';
    startTimer();
    showQuestion(0);
});

// Run next test case
function runNextTestCase(code) {
    if (currentTestIndex < testQueue.length) {
        currentTestCase = testQueue[currentTestIndex];

        console.log(`Running test case ${currentTestIndex + 1}/${testQueue.length} with stdin:`, currentTestCase.stdin);

        const fileName = languageFiles[currentLanguage] || "main.py";

        // Update stdin and code using populateCode to ensure stdin is updated
        iframe.contentWindow.postMessage({
            eventType: 'populateCode',
            language: currentLanguage,
            files: [
                {
                    name: fileName,
                    content: code
                }
            ],
            stdin: currentTestCase.stdin
        }, '*');

        // Trigger run after a short delay
        setTimeout(() => {
            iframe.contentWindow.postMessage({
                eventType: 'triggerRun'
            }, '*');
        }, 200);
    }
    else {
        // All test cases completed
        const percentage = Math.floor((passCount / testQueue.length) * 100);
        updateMatchDisplay(percentage, percentage === 100);

        // Enable submit button if code has been run (regardless of result)
        btnSubmit.disabled = false;
        btnRun.disabled = false;
    }
}

btnRun.addEventListener('click', () => {
    const currentChallenge = challenges[currentQuestion];
    testQueue = currentChallenge.testCases;
    currentTestIndex = 0;
    passCount = 0;

    // Reset display
    outputArea.value = 'Running tests...';
    matchPercentage.textContent = 'Running...';
    matchPercentage.className = 'match-percentage';
    btnSubmit.disabled = true;
    btnRun.disabled = true;

    runNextTestCase(currentCode);
});

btnSubmit.addEventListener('click', () => {
    if (!hasRunCode) return;  // must run code before submitting
    
    // Mark this question as completed
    completedQuestions.add(currentQuestion);
    updateQuestionList();

    // Check if everything is done
    if (completedQuestions.size === challenges.length) {
        stopTimer();
        completionScreen.style.display = 'flex';
        document.getElementById('finalTime').textContent = `Final Time: ${getFinalTime()} `;
    } else {
        alert("✔ Question submitted! You may choose another question.");
    }
});


btnRestart.addEventListener('click', () => {
    completionScreen.style.display = 'none';
    startScreen.style.display = 'flex';
    currentQuestion = 0;
    completedQuestions.clear();
    currentOutput = "";
    hasRunCode = false;
    currentMatchPercentage = 0;
    isCorrect = false;
    currentTestCase = null;
    timerDisplay.textContent = "Time: 00:00:00";
    initQuestionList();
});

// Listen for messages from iframe
window.addEventListener('message', function (e) {
    const data = e.data;
    console.log(data)

    // Check if it's a code change event
    if (data.action === 'codeUpdate' && data.files && data.files.length > 0) {
        currentCode = data.files[0].content;

    }

    // Check if it's a run complete event from the iframe
    if (data.action === 'runComplete' && data.result && data.result.output !== undefined) {
        currentOutput = data.result.output.trim();
        outputArea.value = currentOutput;

        // Update code capture area
        if (currentCode) {
            document.getElementById('parent-code-capture').value = currentCode;
        }

        hasRunCode = true;

        // Check if answer is correct for current test case
        if (currentTestCase) {
            const expectedOutput = currentTestCase.stdout;
            const isCaseCorrect = isAnswerCorrect(currentOutput, expectedOutput);

            if (isCaseCorrect) {
                passCount++;
            }

            // Move to next test case
            currentTestIndex++;
            setTimeout(() => {
                runNextTestCase(currentCode);
            }, 1);


        } else {
            // Fallback
            updateMatchDisplay(0, false);
        }


        if (isCorrect && !completedQuestions.has(currentQuestion)) {
            const items = document.querySelectorAll('.question-btn');
            // We need to find the button with the correct dataset index
            items.forEach(item => {
                if (parseInt(item.dataset.index) === currentQuestion) {
                    item.classList.add('completed');
                }
            });
        }
    }
});

// Initialize
// Initialize handled in fetch
// initQuestionList();