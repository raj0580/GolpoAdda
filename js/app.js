document.addEventListener('DOMContentLoaded', () => {
    // Global function to fetch data. Caching it for performance.
    let storyDataCache = null;
    const fetchStories = async () => {
        if (storyDataCache) {
            return storyDataCache;
        }
        try {
            const response = await fetch('./data/storyData.json');
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            const data = await response.json();
            storyDataCache = data;
            return data;
        } catch (error) {
            console.error("Failed to fetch story data:", error);
            return null;
        }
    };

    // Router: Check which page we are on and run the appropriate function
    const storyListContainer = document.getElementById('story-list-container');
    const storyContentContainer = document.getElementById('story-content-container');

    if (storyListContainer) {
        // We are on the Homepage (index.html)
        initHomepage(fetchStories);
    } else if (storyContentContainer) {
        // We are on the Story Page (story.html)
        initStoryPage(fetchStories);
    }
});

// ===================================================================
// HOMEPAGE LOGIC (for index.html)
// ===================================================================
async function initHomepage(fetchStories) {
    const stories = await fetchStories();
    if (!stories) {
        document.getElementById('story-list-container').innerHTML = "<p>গল্প লোড করতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।</p>";
        return;
    }

    const storyListContainer = document.getElementById('story-list-container');
    const searchBar = document.getElementById('search-bar');
    const filterSort = document.getElementById('filter-sort');
    const filterTag = document.getElementById('filter-tag');
    
    let allTags = new Set();
    stories.forEach(story => story.tags.forEach(tag => allTags.add(tag)));
    
    allTags.forEach(tag => {
        filterTag.innerHTML += `<option value="${tag}">${tag}</option>`;
    });

    const renderStories = (storyList) => {
        storyListContainer.innerHTML = '';
        if (storyList.length === 0) {
            storyListContainer.innerHTML = '<p>কোনো গল্প পাওয়া যায়নি।</p>';
            return;
        }
        storyList.forEach((story, index) => {
            storyListContainer.innerHTML += `
                <div class="story-card">
                    <a href="story.html?id=${story.id}" class="card-link-wrapper">
                        <img src="${story.thumbnail}" alt="${story.title}" loading="lazy">
                        <div class="story-card-content">
                            <h3>${story.title}</h3>
                            <div class="tags-container">
                                ${story.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                            <p>${story.description}</p>
                        </div>
                    </a>
                </div>
            `;
            // Ad injection
            if ((index + 1) % 4 === 0) {
                 storyListContainer.innerHTML += `<div class="story-card card-ad"><div class="ad-container"><script type="text/javascript"> atOptions = { 'key' : '4e2abba58d7e187c65c198085a724e40', 'format' : 'iframe', 'height' : 300, 'width' : 160, 'params' : {} }; </script> <script type="text/javascript" src="//www.highperformanceformat.com/4e2abba58d7e187c65c198085a724e40/invoke.js"></script></div></div>`;
            }
        });
    };

    const applyFilters = () => {
        let filtered = [...stories];
        const term = searchBar.value.toLowerCase();
        const tag = filterTag.value;
        const sort = filterSort.value;
        
        if (term) {
            filtered = filtered.filter(s => s.title.toLowerCase().includes(term) || s.tags.some(t => t.toLowerCase().includes(term)));
        }
        if (tag !== 'all') {
            filtered = filtered.filter(s => s.tags.includes(tag));
        }
        if (sort === 'popular') {
            filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        } else { // 'latest'
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        renderStories(filtered);
    };

    searchBar.addEventListener('input', applyFilters);
    filterTag.addEventListener('change', applyFilters);
    filterSort.addEventListener('change', applyFilters);
    
    // Initial render
    applyFilters();
}

// ===================================================================
// STORY PAGE LOGIC (for story.html)
// ===================================================================
async function initStoryPage(fetchStories) {
    const stories = await fetchStories();
    const storyContentContainer = document.getElementById('story-content-container');
    const urlParams = new URLSearchParams(window.location.search);
    const storyId = parseInt(urlParams.get('id'));
    let currentChapterIndex = parseInt(urlParams.get('c') || 0);

    if (!storyId || !stories) {
        storyContentContainer.innerHTML = '<h1>গল্পটি খুঁজে পাওয়া যায়নি।</h1><a href="index.html">হোমপেজে ফিরে যান</a>';
        return;
    }

    const story = stories.find(s => s.id === storyId);
    if (!story) {
        storyContentContainer.innerHTML = '<h1>এই আইডি দিয়ে কোনো গল্প খুঁজে পাওয়া যায়নি।</h1>';
        return;
    }
    
    // Update page metadata
    document.title = `${story.title} - গল্পের আসর`;
    document.querySelector('meta[name="description"]').content = story.description;

    // Render the basic structure of the story page
    const renderStructure = () => {
        storyContentContainer.innerHTML = `
            <div id="story-header">
                <h1 id="story-title">${story.title}</h1>
                <p class="author">লেখক: <span id="story-author">${story.author}</span></p>
                <div id="story-tags" class="tags-container">
                    ${story.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
            <div class="story-controls">
                <div class="chapter-selector">
                    <label for="chapter-dropdown">অধ্যায়:</label>
                    <select id="chapter-dropdown"></select>
                </div>
                <div class="story-actions">
                     <button id="bookmark-btn" class="action-btn" title="বুকমার্ক করুন"><i class="far fa-bookmark"></i></button>
                </div>
            </div>
            <article id="story-content-area" class="story-content-area"></article>
            <div class="chapter-navigation">
                <a href="#" id="prev-chapter" class="nav-button disabled"><i class="fas fa-arrow-left"></i> পূর্ববর্তী</a>
                <a href="#" id="next-chapter" class="nav-button">পরবর্তী <i class="fas fa-arrow-right"></i></a>
            </div>
            <div class="share-section">
                <h3>গল্পটি শেয়ার করুন:</h3>
                <div class="share-buttons">
                    <a href="#" id="share-facebook" target="_blank" class="share-btn facebook"><i class="fab fa-facebook-f"></i> Facebook</a>
                    <a href="#" id="share-whatsapp" target="_blank" class="share-btn whatsapp"><i class="fab fa-whatsapp"></i> WhatsApp</a>
                    <a href="#" id="share-twitter" target="_blank" class="share-btn twitter"><i class="fab fa-twitter"></i> Twitter</a>
                </div>
            </div>
            <div class="ad-container sidebar-ad"><h3>বিজ্ঞাপন</h3><script type="text/javascript">atOptions={'key':'4e2abba58d7e187c65c198085a724e40','format':'iframe','height':300,'width':160,'params':{}};</script><script type="text/javascript" src="//www.highperformanceformat.com/4e2abba58d7e187c65c198085a724e40/invoke.js"></script></div>
            <div id="disqus_thread"></div>
        `;
    };
    
    renderStructure();
    
    const chapterDropdown = document.getElementById('chapter-dropdown');
    story.chapters.forEach((ch, index) => {
        chapterDropdown.innerHTML += `<option value="${index}">${ch.title}</option>`;
    });

    const loadChapter = (index) => {
        if (index < 0 || index >= story.chapters.length) return;
        currentChapterIndex = index;
        const chapter = story.chapters[index];
        document.getElementById('story-content-area').innerHTML = `<h2>${chapter.title}</h2><div>${chapter.content}</div>`;
        chapterDropdown.value = index;

        // Update navigation buttons
        const prevBtn = document.getElementById('prev-chapter');
        const nextBtn = document.getElementById('next-chapter');
        prevBtn.classList.toggle('disabled', index === 0);
        nextBtn.classList.toggle('disabled', index === story.chapters.length - 1);
        
        // Update URL
        const newUrl = `story.html?id=${storyId}&c=${index}`;
        history.pushState({path: newUrl}, '', newUrl);
        window.scrollTo(0, 0);
    };

    document.getElementById('prev-chapter').addEventListener('click', e => { e.preventDefault(); loadChapter(currentChapterIndex - 1); });
    document.getElementById('next-chapter').addEventListener('click', e => { e.preventDefault(); loadChapter(currentChapterIndex + 1); });
    chapterDropdown.addEventListener('change', e => loadChapter(parseInt(e.target.value)));
    
    // Reading progress bar
    window.addEventListener('scroll', () => {
        const bar = document.getElementById('reading-progress-bar');
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = scrollableHeight > 0 ? `${(window.scrollY / scrollableHeight) * 100}%` : '0%';
    });

    // Share buttons setup
    const shareUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent(`"${story.title}" - একটি অসাধারণ বাংলা গল্প পড়ুন: `);
    document.getElementById('share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
    document.getElementById('share-whatsapp').href = `https://api.whatsapp.com/send?text=${shareText}${shareUrl}`;
    document.getElementById('share-twitter').href = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;

    // Load initial chapter
    loadChapter(currentChapterIndex);
}
