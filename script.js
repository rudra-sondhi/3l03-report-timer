// Constants and data structures
const SECTIONS = [
    { id: 'abstract', name: 'Abstract', weight: 0.5, color: '#FF6B6B' },
    { id: 'introduction', name: 'Introduction', weight: 3.5, color: '#4ECDC4' },
    { id: 'results', name: 'Results', weight: 5, color: '#FFE66D' },
    { id: 'discussion', name: 'Discussion', weight: 5, color: '#1A535C' },
    { id: 'conclusions', name: 'Conclusions', weight: 0.5, color: '#FF9F1C' },
    { id: 'experimental', name: 'Experimental', weight: 3.5, color: '#6A0572' },
    { id: 'references', name: 'References', weight: 2, color: '#7B68EE' }
];

const DEADLINE = new Date('April 16, 2025 11:59:00');
const START_DATE = new Date('April 13, 2025'); // Today
const LOCAL_STORAGE_PROGRESS_KEY = 'report-progress-data';
const LOCAL_STORAGE_TODOS_KEY = 'report-todos-data';
const LOCAL_STORAGE_NOTES_KEY = 'report-notes-data';
const LOCAL_STORAGE_HISTORY_KEY = 'report-progress-history';

// For progress timeline graph
let progressChart;

// DOM elements
const sectionsGrid = document.querySelector('.sections-grid');
const overallProgressBar = document.getElementById('overall-progress-bar');
const overallProgressValue = document.getElementById('overall-progress-value');
const progressSegments = document.getElementById('progress-segments');
const progressLegend = document.getElementById('progress-legend');
const todoInput = document.getElementById('todo-input');
const sectionSelect = document.getElementById('section-select');
const addTodoBtn = document.getElementById('add-todo');
const todoList = document.getElementById('todo-list');
const filterButtons = document.querySelectorAll('.filter-btn');
const notesArea = document.getElementById('notes-area');
const progressGraph = document.getElementById('progress-graph');
const graphTooltip = document.getElementById('graph-tooltip');

// State management
let progressData = {};
let progressHistory = [];
let todos = [];
let currentFilter = 'all';

// Initialize the application
function initApp() {
    loadDataFromLocalStorage();
    renderSections();
    updateOverallProgress();
    renderProgressSegments();
    initTodoListeners();
    renderTodos();
    initCountdown();
    initProgressGraph();
    
    // Save notes when user types
    notesArea.addEventListener('input', () => {
        localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, notesArea.value);
    });
    
    // Add emoji to section titles
    addEmojiToSectionTitles();
}

// Local storage functions
function loadDataFromLocalStorage() {
    // Load progress data
    const savedProgress = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY);
    if (savedProgress) {
        progressData = JSON.parse(savedProgress);
    } else {
        // Initialize with default values
        SECTIONS.forEach(section => {
            progressData[section.id] = 0;
        });
    }
    
    // Load todos
    const savedTodos = localStorage.getItem(LOCAL_STORAGE_TODOS_KEY);
    if (savedTodos) {
        todos = JSON.parse(savedTodos);
    }
    
    // Load notes
    const savedNotes = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
    if (savedNotes) {
        notesArea.value = savedNotes;
    }
    
    // Load progress history
    const savedHistory = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    if (savedHistory) {
        progressHistory = JSON.parse(savedHistory);
    } else {
        // Initialize with current progress
        const today = new Date().toISOString().split('T')[0];
        const overallProgress = calculateOverallProgress();
        progressHistory = [{ date: today, progress: overallProgress }];
        saveProgressHistoryToLocalStorage();
    }
}

function saveProgressToLocalStorage() {
    localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(progressData));
    
    // Update progress history when progress changes
    const today = new Date().toISOString().split('T')[0];
    const overallProgress = calculateOverallProgress();
    
    // Check if we already have an entry for today
    const existingEntryIndex = progressHistory.findIndex(entry => entry.date === today);
    
    if (existingEntryIndex !== -1) {
        progressHistory[existingEntryIndex].progress = overallProgress;
    } else {
        progressHistory.push({ date: today, progress: overallProgress });
    }
    
    saveProgressHistoryToLocalStorage();
    
    // Update the progress graph
    updateProgressGraph();
}

function saveProgressHistoryToLocalStorage() {
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(progressHistory));
}

function saveTodosToLocalStorage() {
    localStorage.setItem(LOCAL_STORAGE_TODOS_KEY, JSON.stringify(todos));
}

function calculateOverallProgress() {
    let totalWeight = 0;
    let weightedProgress = 0;
    
    SECTIONS.forEach(section => {
        totalWeight += section.weight;
        weightedProgress += (progressData[section.id] || 0) * section.weight;
    });
    
    return Math.round(weightedProgress / totalWeight);
}

// Render UI functions
function renderSections() {
    sectionsGrid.innerHTML = '';
    
    SECTIONS.forEach(section => {
        const progress = progressData[section.id] || 0;
        
        const sectionEl = document.createElement('div');
        sectionEl.className = 'section-item';
        sectionEl.style.borderLeft = `5px solid ${section.color}`;
        sectionEl.innerHTML = `
            <div class="section-header">
                <div class="section-title">${section.name}</div>
                <div class="section-percentage">
                    <input type="number" min="0" max="100" value="${progress}" 
                           data-section="${section.id}" class="progress-input">
                    <span>%</span>
                </div>
            </div>
            <div class="section-tasks">
                <span class="completed-tasks">
                    ${countCompletedTasksForSection(section.name)}
                </span>
                /
                <span class="total-tasks">
                    ${countTotalTasksForSection(section.name)}
                </span>
                tasks
            </div>
            <div class="section-progress">
                <div class="section-progress-bar" style="width: ${progress}%; background: ${section.color}"></div>
            </div>
        `;
        
        sectionsGrid.appendChild(sectionEl);
        
        // Add event listener for progress input
        const input = sectionEl.querySelector('.progress-input');
        input.addEventListener('change', () => {
            const value = parseInt(input.value);
            if (isNaN(value) || value < 0) {
                input.value = 0;
                progressData[section.id] = 0;
            } else if (value > 100) {
                input.value = 100;
                progressData[section.id] = 100;
            } else {
                progressData[section.id] = value;
            }
            
            updateSectionProgress(section.id, progressData[section.id], section.color);
            updateOverallProgress();
            saveProgressToLocalStorage();
        });
    });
}

function updateSectionProgress(sectionId, progress, color) {
    const sectionEl = document.querySelector(`.section-item [data-section="${sectionId}"]`).closest('.section-item');
    const progressBar = sectionEl.querySelector('.section-progress-bar');
    progressBar.style.width = `${progress}%`;
    if (color) {
        progressBar.style.backgroundColor = color;
    }
}

// Function to add emoji to section headers
function addEmojiToSectionTitles() {
    const emojis = {
        '📊': 'Overall Progress',
        '📝': 'Section Progress',
        '📈': 'Progress Timeline',
        '✅': 'To-Do List'
    };
    
    document.querySelectorAll('h2').forEach(header => {
        const headerText = header.textContent.trim();
        if (!header.querySelector('.emoji') && Object.values(emojis).includes(headerText)) {
            const emoji = Object.keys(emojis).find(key => emojis[key] === headerText);
            if (emoji) {
                const emojiSpan = document.createElement('span');
                emojiSpan.className = 'emoji';
                emojiSpan.textContent = emoji;
                header.prepend(emojiSpan);
                header.innerHTML = header.innerHTML.replace(headerText, ` ${headerText}`);
            }
        }
    });
}

function updateOverallProgress() {
    const overallPercentage = calculateOverallProgress();
    
    overallProgressBar.style.width = `${overallPercentage}%`;
    overallProgressValue.textContent = `${overallPercentage}%`;
    
    // Update the progress segments
    renderProgressSegments();
}

function renderProgressSegments() {
    progressSegments.innerHTML = '';
    progressLegend.innerHTML = '';
    
    let totalWeight = SECTIONS.reduce((sum, section) => sum + section.weight, 0);
    let currentPosition = 0;
    
    // Create a flex container for the legend items
    const legendContainer = document.createElement('div');
    legendContainer.className = 'progress-legend-container';
    progressLegend.appendChild(legendContainer);
    
    SECTIONS.forEach(section => {
        const segmentWidth = (section.weight / totalWeight) * 100;
        const completionPercentage = progressData[section.id] || 0;
        
        // Create segment for the progress bar
        const segment = document.createElement('div');
        segment.className = 'progress-segment';
        segment.style.width = `${segmentWidth}%`;
        segment.style.left = `${currentPosition}%`;
        
        // Create the filled part of the segment
        const filledSegment = document.createElement('div');
        filledSegment.className = 'segment-fill';
        filledSegment.style.width = `${completionPercentage}%`;
        filledSegment.style.backgroundColor = section.color;
        segment.appendChild(filledSegment);
        
        // Add tooltip
        segment.title = `${section.name}: ${completionPercentage}% complete`;
        
        progressSegments.appendChild(segment);
        
        // Create legend item
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="legend-color" style="background-color: ${section.color}"></span>
            <span class="legend-text">${section.name}</span>
        `;
        legendContainer.appendChild(legendItem);
        
        currentPosition += segmentWidth;
    });
}

function countTotalTasksForSection(sectionName) {
    return todos.filter(todo => todo.section === sectionName).length;
}

function countCompletedTasksForSection(sectionName) {
    return todos.filter(todo => todo.section === sectionName && todo.completed).length;
}

// Todo list functions
function initTodoListeners() {
    addTodoBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
    
    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            
            // Update active class
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            renderTodos();
        });
    });
}

function addTodo() {
    const text = todoInput.value.trim();
    const section = sectionSelect.value;
    
    if (text && section) {
        const newTodo = {
            id: Date.now(),
            text,
            section,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        todos.push(newTodo);
        saveTodosToLocalStorage();
        
        todoInput.value = '';
        sectionSelect.selectedIndex = 0;
        
        renderTodos();
        renderSections(); // Update task counts
        
        todoInput.focus();
    } else {
        alert('Please enter a task and select a section');
    }
}

function renderTodos() {
    todoList.innerHTML = '';
    
    // Filter todos based on current filter
    let filteredTodos = todos;
    if (currentFilter === 'active') {
        filteredTodos = todos.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filteredTodos = todos.filter(todo => todo.completed);
    }
    
    // Sort todos: completed at the bottom, then by creation date (newest first)
    filteredTodos.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    filteredTodos.forEach(todo => {
        const todoEl = document.createElement('li');
        todoEl.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        todoEl.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <span class="todo-text">${todo.text}</span>
            <span class="todo-section">${todo.section}</span>
            <button class="todo-delete">×</button>
        `;
        
        // Add event listeners
        const checkbox = todoEl.querySelector('.todo-checkbox');
        checkbox.addEventListener('change', () => {
            todo.completed = checkbox.checked;
            todoEl.classList.toggle('completed', todo.completed);
            saveTodosToLocalStorage();
            renderSections(); // Update task counts
        });
        
        const deleteBtn = todoEl.querySelector('.todo-delete');
        deleteBtn.addEventListener('click', () => {
            todos = todos.filter(t => t.id !== todo.id);
            saveTodosToLocalStorage();
            renderTodos();
            renderSections(); // Update task counts
        });
        
        todoList.appendChild(todoEl);
    });
    
    // Show message if no todos
    if (filteredTodos.length === 0) {
        const emptyEl = document.createElement('li');
        emptyEl.className = 'todo-empty';
        emptyEl.textContent = currentFilter === 'all' 
            ? 'No tasks added yet. Add your first task above!' 
            : currentFilter === 'active'
                ? 'No remaining tasks. Good job!' 
                : 'No completed tasks yet.';
        todoList.appendChild(emptyEl);
    }
}

// Countdown function
function initCountdown() {
    function updateCountdown() {
        const now = new Date();
        const diff = DEADLINE - now;
        
        if (diff <= 0) {
            // Deadline has passed
            document.getElementById('days').querySelector('.countdown-value').textContent = '0';
            document.getElementById('hours').querySelector('.countdown-value').textContent = '0';
            document.getElementById('minutes').querySelector('.countdown-value').textContent = '0';
            document.getElementById('seconds').querySelector('.countdown-value').textContent = '0';
            document.querySelector('.countdown-message').textContent = 'Deadline has passed!';
            document.querySelector('.countdown-message').style.color = '#e74c3c';
            return;
        }
        
        // Calculate time components
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        // Update DOM
        document.getElementById('days').querySelector('.countdown-value').textContent = days;
        document.getElementById('hours').querySelector('.countdown-value').textContent = hours;
        document.getElementById('minutes').querySelector('.countdown-value').textContent = minutes;
        document.getElementById('seconds').querySelector('.countdown-value').textContent = seconds;
        
        // Change color based on urgency
        const countdown = document.querySelector('.countdown');
        if (diff < 24 * 60 * 60 * 1000) { // Less than 24 hours
            countdown.style.backgroundColor = '#fff9f3';
            document.querySelector('.countdown-message').style.color = '#e67e22';
        }
        if (diff < 6 * 60 * 60 * 1000) { // Less than 6 hours
            countdown.style.backgroundColor = '#fff5f5';
            document.querySelector('.countdown-message').style.color = '#e74c3c';
        }
    }
    
    // Update immediately and then every second
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Progress graph functions
function initProgressGraph() {
    const ctx = document.createElement('canvas');
    ctx.id = 'progress-chart';
    progressGraph.appendChild(ctx);
    
    // Calculate dates between start and deadline
    const dateLabels = generateDateLabels(START_DATE, DEADLINE);
    
    // Calculate ideal progress line (linear from 0% to 100%)
    const idealProgress = dateLabels.map((date, index) => {
        return Math.round((index / (dateLabels.length - 1)) * 100);
    });
    
    // Prepare actual progress data
    const actualProgressData = prepareProgressData(dateLabels);
    
    // Create the chart
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dateLabels.map(formatDateLabel),
            datasets: [
                {
                    label: 'Your Progress',
                    data: actualProgressData,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Target Progress',
                    data: idealProgress,
                    borderColor: '#e74c3c',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}%`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Completion (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
    
    // Add mouse hover effects for the chart
    ctx.addEventListener('mousemove', (event) => {
        const points = progressChart.getElementsAtEventForMode(event, 'index', { intersect: false }, true);
        
        if (points.length) {
            const firstPoint = points[0];
            const label = progressChart.data.labels[firstPoint.index];
            const value = progressChart.data.datasets[firstPoint.datasetIndex].data[firstPoint.index];
            
            // Position and show tooltip
            graphTooltip.style.opacity = 1;
            graphTooltip.style.left = event.offsetX + 'px';
            graphTooltip.style.top = event.offsetY + 'px';
            graphTooltip.textContent = `${label}: ${value}%`;
        } else {
            graphTooltip.style.opacity = 0;
        }
    });
    
    ctx.addEventListener('mouseleave', () => {
        graphTooltip.style.opacity = 0;
    });
}

function updateProgressGraph() {
    if (!progressChart) return;
    
    const dateLabels = generateDateLabels(START_DATE, DEADLINE);
    const actualProgressData = prepareProgressData(dateLabels);
    
    progressChart.data.datasets[0].data = actualProgressData;
    progressChart.update();
}

function generateDateLabels(startDate, endDate) {
    const dateLabels = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
        dateLabels.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dateLabels;
}

function prepareProgressData(dateLabels) {
    // Create a map of dates to progress
    const progressMap = {};
    progressHistory.forEach(entry => {
        progressMap[entry.date] = entry.progress;
    });
    
    // Fill in the progress data for each date
    const progressData = [];
    let lastProgress = 0;
    
    dateLabels.forEach(date => {
        if (progressMap[date] !== undefined) {
            lastProgress = progressMap[date];
        }
        
        // For future dates, use last known progress
        const dateObj = new Date(date);
        const today = new Date();
        if (dateObj > today) {
            progressData.push(null);
        } else {
            progressData.push(lastProgress);
        }
    });
    
    return progressData;
}

function formatDateLabel(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);