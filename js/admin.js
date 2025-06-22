document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const adminPanel = document.getElementById('admin-panel');
    const loginBtn = document.getElementById('login-btn');
    const passwordInput = document.getElementById('admin-password');
    const loginError = document.getElementById('login-error');
    const correctPassword = 'storyadmin580';

    // --- Authentication ---
    if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
        showAdminPanel();
    }

    loginBtn.addEventListener('click', () => {
        if (passwordInput.value === correctPassword) {
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            showAdminPanel();
        } else {
            loginError.textContent = 'Incorrect password.';
            passwordInput.style.border = '1px solid red';
        }
    });

    function showAdminPanel() {
        loginScreen.style.display = 'none';
        adminPanel.style.display = 'block';
        loadDataAndInitialize();
    }

    // --- Admin Panel Logic ---
    const storyForm = document.getElementById('story-form');
    const storyIdInput = document.getElementById('story-id');
    const titleInput = document.getElementById('story-title-input');
    const authorInput = document.getElementById('story-author-input');
    const thumbnailInput = document.getElementById('story-thumbnail-input');
    const tagsInput = document.getElementById('story-tags-input');
    const descriptionInput = document.getElementById('story-description-input');
    const chaptersContainer = document.getElementById('chapters-container');
    const addChapterBtn = document.getElementById('add-chapter-btn');
    const clearFormBtn = document.getElementById('clear-form-btn');
    const existingStoriesList = document.getElementById('existing-stories-list');
    const exportBtn = document.getElementById('export-json-btn');
    const exportModal = document.getElementById('export-modal');
    const jsonOutput = document.getElementById('json-output');
    const copyJsonBtn = document.getElementById('copy-json-btn');
    const closeExportModalBtn = document.querySelector('#export-modal .close-btn');

    let storiesData = [];
    let nextChapterId = 0;

    function loadDataAndInitialize() {
        const localData = localStorage.getItem('storiesData');
        if (localData) {
            storiesData = JSON.parse(localData);
            renderStoryList();
        } else {
            fetch('../data/storyData.json')
                .then(res => res.json())
                .then(data => {
                    storiesData = data;
                    saveToLocalStorage();
                    renderStoryList();
                });
        }
        addChapterField(); // Add the first chapter field by default
    }

    function saveToLocalStorage() {
        localStorage.setItem('storiesData', JSON.stringify(storiesData));
    }

    function renderStoryList() {
        existingStoriesList.innerHTML = '';
        storiesData.forEach(story => {
            const item = document.createElement('div');
            item.className = 'story-item';
            item.innerHTML = `
                <span>${story.title}</span>
                <div class="story-item-actions">
                    <button class="edit-btn" data-id="${story.id}">Edit</button>
                    <button class="delete-btn" data-id="${story.id}">Delete</button>
                </div>
            `;
            existingStoriesList.appendChild(item);
        });
    }

    function addChapterField(title = '', content = '') {
        const chapterId = nextChapterId++;
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'chapter-field-group';
        fieldGroup.id = `chapter-${chapterId}`;
        fieldGroup.innerHTML = `
            <button type="button" class="remove-chapter-btn" data-id="${chapterId}">×</button>
            <label>Chapter Title:</label>
            <input type="text" class="chapter-title" value="${title}" required>
            <label>Chapter Content (HTML allowed):</label>
            <textarea class="chapter-content" rows="8" required>${content}</textarea>
        `;
        chaptersContainer.appendChild(fieldGroup);
    }
    
    function clearForm() {
        storyForm.reset();
        storyIdInput.value = '';
        chaptersContainer.innerHTML = '';
        addChapterField();
    }

    // Event Listeners
    addChapterBtn.addEventListener('click', () => addChapterField());
    
    chaptersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-chapter-btn')) {
            const chapterId = e.target.dataset.id;
            document.getElementById(`chapter-${chapterId}`).remove();
        }
    });

    clearFormBtn.addEventListener('click', clearForm);

    storyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const chapters = [];
        document.querySelectorAll('.chapter-field-group').forEach(group => {
            chapters.push({
                title: group.querySelector('.chapter-title').value,
                content: group.querySelector('.chapter-content').value,
            });
        });
        
        const story = {
            id: storyIdInput.value ? parseInt(storyIdInput.value) : Date.now(),
            title: titleInput.value,
            author: authorInput.value,
            thumbnail: thumbnailInput.value,
            tags: tagsInput.value.split(',').map(tag => tag.trim()),
            description: descriptionInput.value,
            popularity: Math.floor(Math.random() * 30) + 70, // Random popularity
            createdAt: new Date().toISOString(),
            chapters: chapters
        };

        if (storyIdInput.value) { // Editing existing
            const index = storiesData.findIndex(s => s.id === story.id);
            storiesData[index] = story;
        } else { // Adding new
            storiesData.push(story);
        }
        
        saveToLocalStorage();
        renderStoryList();
        clearForm();
        alert('Story saved successfully! Remember to export and update your JSON file.');
    });

    existingStoriesList.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.classList.contains('edit-btn')) {
            const story = storiesData.find(s => s.id === id);
            storyIdInput.value = story.id;
            titleInput.value = story.title;
            authorInput.value = story.author;
            thumbnailInput.value = story.thumbnail;
            tagsInput.value = story.tags.join(', ');
            descriptionInput.value = story.description;
            chaptersContainer.innerHTML = '';
            story.chapters.forEach(ch => addChapterField(ch.title, ch.content));
            window.scrollTo(0,0);
        }
        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this story?')) {
                storiesData = storiesData.filter(s => s.id !== id);
                saveToLocalStorage();
                renderStoryList();
            }
        }
    });

    exportBtn.addEventListener('click', () => {
        const dataToExport = JSON.stringify(storiesData, null, 2);
        jsonOutput.value = dataToExport;
        exportModal.style.display = 'block';
    });

    copyJsonBtn.addEventListener('click', () => {
        jsonOutput.select();
        document.execCommand('copy');
        alert('Copied to clipboard!');
    });
    
    closeExportModalBtn.addEventListener('click', () => {
        exportModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target == exportModal) {
            exportModal.style.display = 'none';
        }
    });
});
