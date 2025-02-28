// 初始数据（如果本地存储为空）
const defaultData = {
    prompts: [
        { id: Date.now(), title: 'English Analysis Assistant', content: `你是一个专业的考研英文老师，接下来我会发文章给你。
你要帮我做几件事情：
1. 用中文回答问题；
2. 用精简的语言总结文章的主要内容；
3. 分析文章中出现的比较特别或者困难的英文单词，每篇文章至少找八个单词；同时要求单词分析需要包含词义、音标、文中用法（中英文）、同义词和反义词；
4. 分析文章中出现的长难句，并分析这些句子的语法，每篇文章至少找四个句子；同时需要给出原文、句子主干、修饰成分（拆分成状语、宾语等成分）、模仿造句以及翻译；
5. 如果文章过长，比如大于1500个词，可以适当增加困难单词和长难句的数量；
6. 输出格式参考：文章总结：xxxxxx
单词分析：
1. example_word
  音标：xxxxxxx
  英文：xxxxxxx
  词义：xxxxx
  文中用法：xxxxxxx
  同义词：xxxxxxx
  反义词：xxxxxxx
...
...
长难句分析：
  原文：
  主干：xxxxxxx
  修饰成分：
    xxxxxxx（定语从句...）
    xxxxxxx（宾语补充）
    xxxxxxx（伴随状语）
    xxxxxxx（结果状语）
  模仿造句：
    xxxxxxx
  翻译：xxxxxxx`, category: 'writing', modified: '2025-02-28' },
        { id: Date.now() + 1, title: 'Creative Writing Assistant', content: 'You are a creative writing assistant helping with story development, character creation, and plot...', category: 'writing', modified: '2025-02-27' },
        { id: Date.now() + 2, title: 'Code Review Expert', content: 'Act as a senior developer conducting thorough code reviews. Focus on best practices...', category: 'development', modified: '2025-02-28' },
        { id: Date.now() + 3, title: 'UI/UX Design Consultant', content: 'You are an experienced UI/UX designer helping with interface design, user experience improvements...', category: 'design', modified: '2025-02-28' }
    ]
};

// 加载数据
function loadData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['promptsData'], (result) => {
            if (result.promptsData) {
                resolve(result.promptsData);
            } else {
                chrome.storage.local.set({ promptsData: defaultData }, () => {
                    resolve(defaultData);
                });
            }
        });
    });
}

// 保存数据
function saveData(data) {
    chrome.storage.local.set({ promptsData: data }, () => {
        console.log('数据已保存');
    });
}

// 渲染 Tab 和提示词
function renderTabs(data) {
    const tabsContainer = document.querySelector('.category-tabs');
    tabsContainer.innerHTML = '';
    ['all', 'writing', 'development', 'design'].forEach(category => {
        const tab = document.createElement('button');
        tab.className = `tab ${category === 'all' ? 'active' : ''}`;
        tab.dataset.category = category;
        tab.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        tabsContainer.appendChild(tab);

        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderPrompts(data, category === 'all' ? null : category);
        });
    });
}

// 渲染提示词
function renderPrompts(data, filterCategory) {
    const container = document.querySelector('.prompts-container');
    container.innerHTML = '';
    const filteredPrompts = filterCategory ? data.prompts.filter(p => p.category === filterCategory) : data.prompts;

    filteredPrompts.sort((a, b) => {
        const sortBy = document.querySelector('.sort-select').value;
        if (sortBy === 'date') return new Date(b.modified) - new Date(a.modified);
        if (sortBy === 'alpha') return a.title.localeCompare(b.title);
        return 0; // 默认按日期排序
    }).forEach(prompt => {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        card.draggable = true;
        card.dataset.id = prompt.id;
        card.innerHTML = `
            <div class="prompt-title">${prompt.title}</div>
            <div class="prompt-content">${prompt.content.substring(0, 100) + (prompt.content.length > 100 ? '...' : '')}</div>
            <div class="prompt-meta">
                <span>${prompt.category}</span>
                <span>Modified: ${prompt.modified}</span>
            </div>
            <div class="prompt-actions">
                <button class="action-btn copy-btn" data-id="${prompt.id}">📋</button>
                <button class="action-btn edit-btn" data-id="${prompt.id}">✏️</button>
                <button class="action-btn delete-btn" data-id="${prompt.id}">🗑️</button>
            </div>
        `;
        container.appendChild(card);
    });

    // 拖放功能
    let draggedItem = null;
    document.querySelectorAll('.prompt-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedItem = card;
            setTimeout(() => card.style.opacity = '0.5', 0);
        });
        card.addEventListener('dragend', () => {
            draggedItem.style.opacity = '1';
            draggedItem = null;
        });
        card.addEventListener('dragover', (e) => e.preventDefault());
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedItem !== card) {
                const containers = Array.from(document.querySelectorAll('.prompts-container'));
                const fromIndex = containers.indexOf(draggedItem.parentNode);
                const toIndex = containers.indexOf(card.parentNode);
                if (fromIndex !== toIndex) {
                    containers[toIndex].insertBefore(draggedItem, card);
                    saveOrder(data);
                }
            }
        });
    });

    // 事件委托
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.action-btn');
        const card = e.target.closest('.prompt-card');
        
        if (btn) {
            const id = btn.dataset.id;
            const prompt = data.prompts.find(p => p.id == id);
            if (btn.classList.contains('copy-btn')) {
                copyText(prompt.content);
            } else if (btn.classList.contains('edit-btn')) {
                editPrompt(prompt);
            } else if (btn.classList.contains('delete-btn')) {
                deletePrompt(id, data);
            }
        } else if (card) {
            const id = card.dataset.id;
            const prompt = data.prompts.find(p => p.id == id);
            copyText(prompt.content);
        }
    });
}

// 复制功能
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
}

// 编辑提示词
function editPrompt(prompt) {
    const modal = document.getElementById('manage-modal');
    modal.style.display = 'block';
    document.getElementById('prompt-title').value = prompt.title;
    document.getElementById('prompt-content').value = prompt.content;
    document.getElementById('category-select').value = prompt.category;
    updateCharCount();
    
    // 移除旧的事件监听器
    const saveButton = document.getElementById('save-prompt');
    const newSaveButton = saveButton.cloneNode(true);
    saveButton.parentNode.replaceChild(newSaveButton, saveButton);
    
    // 添加新的事件监听器
    newSaveButton.addEventListener('click', () => saveEditedPrompt(prompt.id));
}

// 保存编辑后的提示词
function saveEditedPrompt(id) {
    loadData().then(data => {
        const prompt = data.prompts.find(p => p.id == id);
        if (!prompt) {
            showNotification('Prompt not found', 'error');
            return;
        }
        const newTitle = document.getElementById('prompt-title').value;
        const newContent = document.getElementById('prompt-content').value;
        const newCategory = document.getElementById('category-select').value;
        
        if (!newTitle || !newContent) {
            showNotification('Title and content are required', 'error');
            return;
        }
        
        prompt.title = newTitle;
        prompt.content = newContent;
        prompt.category = newCategory;
        prompt.modified = new Date().toISOString().split('T')[0];
        
        saveData(data);
        window.currentData = data;  // 更新当前数据
        renderPrompts(data, document.querySelector('.tab.active').dataset.category === 'all' ? null : document.querySelector('.tab.active').dataset.category);
        closeModal();
        showNotification('Prompt updated successfully');
        
        // 清空搜索框
        document.querySelector('.search-bar').value = '';
    });
}

// 删除提示词
function deletePrompt(id, data) {
    const prompt = data.prompts.find(p => p.id == id);
    data.prompts = data.prompts.filter(p => p.id != id);
    saveData(data);
    window.currentData = data;  // 更新当前数据
    renderPrompts(data);
    showNotification(`Deleted "${prompt.title}"`);
    
    // 清空搜索框
    document.querySelector('.search-bar').value = '';
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('manage-modal');
    modal.style.display = 'none';
    document.getElementById('prompt-title').value = '';
    document.getElementById('prompt-content').value = '';
    updateCharCount();
}

// 显示通知
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 2000);
}

// 字符计数
function updateCharCount() {
    const content = document.getElementById('prompt-content').value;
    document.querySelector('.char-count').textContent = `${content.length} characters`;
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    let currentData;  // 添加一个变量来保存当前数据
    
    loadData().then(data => {
        currentData = data;
        renderTabs(currentData);
        renderPrompts(currentData);

        // 添加取消按钮事件监听器
        document.getElementById('cancel-modal').addEventListener('click', closeModal);

        // 搜索功能
        const searchBar = document.querySelector('.search-bar');
        searchBar.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredData = {
                prompts: currentData.prompts.filter(prompt => 
                    prompt.title.toLowerCase().includes(searchTerm) || 
                    prompt.content.toLowerCase().includes(searchTerm)
                )
            };
            renderPrompts(filteredData);
        });

        // 排序功能
        const sortSelect = document.querySelector('.sort-select');
        sortSelect.addEventListener('change', (e) => {
            const sortType = e.target.value;
            let sortedPrompts = [...currentData.prompts];
            
            switch(sortType) {
                case 'date':
                    sortedPrompts.sort((a, b) => new Date(b.modified) - new Date(a.modified));
                    break;
                case 'alpha':
                    sortedPrompts.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'freq':
                    sortedPrompts.sort((a, b) => (b.copyCount || 0) - (a.copyCount || 0));
                    break;
            }
            
            renderPrompts({ prompts: sortedPrompts });
        });

        document.querySelector('.sort-select').addEventListener('change', () => renderPrompts(currentData, document.querySelector('.tab.active').dataset.category === 'all' ? null : document.querySelector('.tab.active').dataset.category));
        document.querySelector('.add-btn').addEventListener('click', () => {
            document.getElementById('prompt-title').value = '';
            document.getElementById('prompt-content').value = '';
            document.getElementById('category-select').value = 'writing';
            document.getElementById('manage-modal').style.display = 'block';
            updateCharCount();
            
            // 移除旧的事件监听器
            const saveButton = document.getElementById('save-prompt');
            const newSaveButton = saveButton.cloneNode(true);
            saveButton.parentNode.replaceChild(newSaveButton, saveButton);
            
            // 添加新的事件监听器
            newSaveButton.addEventListener('click', () => {
                const newPrompt = {
                    id: Date.now(),
                    title: document.getElementById('prompt-title').value,
                    content: document.getElementById('prompt-content').value,
                    category: document.getElementById('category-select').value,
                    modified: new Date().toISOString().split('T')[0]
                };
                
                if (!newPrompt.title || !newPrompt.content) {
                    showNotification('Title and content are required', 'error');
                    return;
                }
                
                currentData.prompts.push(newPrompt);
                saveData(currentData);
                renderPrompts(currentData);
                closeModal();
                showNotification('Prompt added successfully');
                
                // 清空搜索框
                searchBar.value = '';
            });
        });
    });
});

// 添加新提示词
function addPrompt() {
    loadData().then(data => {
        const newPrompt = {
            id: Date.now(),
            title: document.getElementById('prompt-title').value,
            content: document.getElementById('prompt-content').value,
            category: document.getElementById('category-select').value,
            modified: new Date().toISOString().split('T')[0]
        };
        if (!newPrompt.title || !newPrompt.content) {
            showNotification('Title and content are required', 'error');
            return;
        }
        data.prompts.push(newPrompt);
        saveData(data);
        renderPrompts(data);
        closeModal();
        showNotification('Prompt added successfully');
    });
}

// 保存拖放顺序
function saveOrder(data) {
    const newOrder = Array.from(document.querySelectorAll('.prompt-card')).map(card => parseInt(card.dataset.id));
    data.prompts.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
    saveData(data);
}

// 暗黑模式切换
const toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    document.querySelectorAll('.prompt-card, .modal-content, .manage-btn').forEach(el => el.classList.toggle('dark-mode'));
};
document.addEventListener('keydown', (e) => {
    if (e.key === 'd' && e.ctrlKey) toggleDarkMode();
});
