document.addEventListener('DOMContentLoaded', () => {

    // --- Client-side Data Store (Simulates a Database) ---
    let users = {};
    let currentUser = null;
    let postsData = {};
    let lostFoundData = {};
    let currentChatUserId = null;
    let chatData = {};
    let replyingToMessageId = null;
    let reportedContent = {};

    // --- State for new features ---
    let currentFilter = { category: 'all', tag: null };
    let currentSort = 'recent';
    
    // --- Modal Variables ---
    const reportModal = document.getElementById('report-modal');
    const reportForm = document.getElementById('report-form');
    const cancelReportBtn = document.getElementById('cancel-report-btn');
    const reportContentId = document.getElementById('report-content-id');
    const reportContentType = document.getElementById('report-content-type');


    // --- Functions to save and load data from localStorage ---
    function saveData() {
        localStorage.setItem('communityHubUsers', JSON.stringify(users));
        localStorage.setItem('communityHubCurrentUser', JSON.stringify(currentUser));
        localStorage.setItem('communityHubPosts', JSON.stringify(postsData));
        localStorage.setItem('communityHubLostFound', JSON.stringify(lostFoundData));
        localStorage.setItem('communityHubChat', JSON.stringify(chatData));
        localStorage.setItem('communityHubReported', JSON.stringify(reportedContent));
    }

    function loadData() {
        const savedUsers = localStorage.getItem('communityHubUsers');
        const savedCurrentUser = localStorage.getItem('communityHubCurrentUser');
        const savedPosts = localStorage.getItem('communityHubPosts');
        const savedLostFound = localStorage.getItem('communityHubLostFound');
        const savedChat = localStorage.getItem('communityHubChat');
        const savedReported = localStorage.getItem('communityHubReported');
        
        if (savedUsers) users = JSON.parse(savedUsers);
        if (savedCurrentUser) currentUser = JSON.parse(savedCurrentUser);

        initializeUsers();

        if (savedPosts) {
            postsData = JSON.parse(savedPosts);
        } else {
            initializePosts();
        }

        if (savedLostFound) {
            lostFoundData = JSON.parse(savedLostFound);
        } else {
            initializeLostAndFound();
        }

        if (savedChat) {
            chatData = JSON.parse(savedChat);
        } else {
            initializeChat();
        }

        if (savedReported) reportedContent = JSON.parse(savedReported);
    }
    
    // --- Page Reset and Navigation ---
    const pageSections = document.querySelectorAll('.page-section');
    
    document.addEventListener('click', e => {
        const targetElement = e.target.closest('[data-target]');
        if (targetElement) {
            e.preventDefault();
            const targetId = targetElement.getAttribute('data-target');
            showPage(targetId);
        }
         const userProfileBtn = e.target.closest('.view-user-profile-btn');
        if (userProfileBtn) {
            e.preventDefault();
            const userEmail = userProfileBtn.dataset.userEmail;
            if (userEmail) {
                renderUserProfilePage(userEmail);
            }
        }
    });
    
    function resetCreatePage() {
        // Reset General Form
        const formGeneral = document.getElementById('form-general-post').querySelector('form');
        formGeneral.reset();
        document.getElementById('post-photo').value = null;
        const postPreview = document.getElementById('post-photo-preview');
        postPreview.innerHTML = '';
        postPreview.classList.add('hidden');

        // Reset Event Form
        const formEvent = document.getElementById('form-event').querySelector('form');
        formEvent.reset();
        document.getElementById('event-photo').value = null;
        const eventPreview = document.getElementById('event-photo-preview');
        eventPreview.innerHTML = '';
        eventPreview.classList.add('hidden');

        // Reset Lost & Found Form
        const formLF = document.getElementById('form-lost-found').querySelector('form');
        formLF.reset();
        document.getElementById('item-photo').value = null;
        const itemPreview = document.getElementById('item-photo-preview');
        itemPreview.innerHTML = '';
        itemPreview.classList.add('hidden');

        // Reset Poll Creator
        document.getElementById('add-poll-btn').classList.remove('hidden');
        document.getElementById('poll-creator-container').classList.add('hidden');
        document.getElementById('poll-options-inputs').innerHTML = '';
        
        // Reset active button to General Post
        document.getElementById('select-general-post').click();
    }
    
    const showPage = (pageId) => {
        if (!currentUser && !['page-login', 'page-signup'].includes(pageId)) {
            pageId = 'page-login';
        }
        
        if (pageId === 'page-admin' && currentUser?.role !== 'admin') {
            showPage('page-home'); // Redirect non-admins
            return;
        }

        pageSections.forEach(section => {
            section.id === pageId ? section.classList.remove('hidden') : section.classList.add('hidden');
        });
        
        const pagesWithNavBar = [
            'page-posts', 'page-create', 'page-lost-found', 'page-chat', 'page-help',
            'page-comments', 'page-my-posts', 'page-profile', 'page-achievements',
            'page-ai-chat', 'page-user-profile', 'page-admin'
        ];
        const secondaryNavbar = document.getElementById('secondary-navbar');
        if (currentUser && pagesWithNavBar.includes(pageId)) {
            secondaryNavbar.classList.remove('hidden');
        } else {
            secondaryNavbar.classList.add('hidden');
        }

        const secondaryNavLinks = secondaryNavbar.querySelectorAll('.nav-link');
        secondaryNavLinks.forEach(link => link.classList.remove('active'));

        let activePage = pageId;
        if (['page-comments', 'page-my-posts', 'page-user-profile'].includes(pageId)) {
            activePage = 'page-posts';
        } else if (['page-profile', 'page-achievements', 'page-ai-chat', 'page-admin'].includes(pageId)) {
             activePage = pageId === 'page-ai-chat' ? 'page-help' : null;
        }
        
        if(activePage) {
            const activeLink = secondaryNavbar.querySelector(`.nav-link[data-target="${activePage}"]`);
            if(activeLink) activeLink.classList.add('active');
        }

        if (pageId === 'page-create') resetCreatePage();
        if (pageId === 'page-chat' && currentUser) {
            if (currentChatUserId === null || !chatData[currentChatUserId]) {
                activateChat('user-0');
            }
            renderUserList();
        }
        if (pageId === 'page-ai-chat') startNewAiConversation();
        if (pageId === 'page-lost-found') renderLostAndFound();
        if (pageId === 'page-posts') renderPosts();
        if (pageId === 'page-profile') renderProfilePage();
        if (pageId === 'page-my-posts') renderMyPosts();
        if (pageId === 'page-achievements') renderAchievementsPage();
        if (pageId === 'page-admin') renderAdminPanel();

        window.scrollTo(0, 0);
    };

    // --- Auth UI Management ---
    const headerGuestView = document.getElementById('header-guest-view');
    const headerAuthView = document.getElementById('header-auth-view');
    const headerUserName = document.getElementById('header-user-name');
    const headerAvatar = document.getElementById('header-avatar');
    const mainNavLinks = document.getElementById('main-nav-links');
    const commentFormAvatar = document.getElementById('comment-form-avatar');

    function showAuthenticatedUI() {
        headerGuestView.classList.add('hidden');
        headerAuthView.classList.remove('hidden');
        headerAuthView.classList.add('flex');
        headerUserName.textContent = currentUser.name;
        document.getElementById('dropdown-user-name').textContent = currentUser.name;
        document.getElementById('dropdown-user-email').textContent = currentUser.email;
        document.getElementById('dropdown-user-username').textContent = `@${currentUser.username}`;

        if (currentUser.picture) {
            headerAvatar.innerHTML = `<img src="${currentUser.picture}" alt="Your avatar" class="avatar-img">`;
            commentFormAvatar.innerHTML = `<img src="${currentUser.picture}" alt="Your avatar" class="avatar-img">`;
        } else {
            headerAvatar.innerHTML = ``;
            headerAvatar.classList.add('bg-sky-500');
            commentFormAvatar.innerHTML = ``;
            commentFormAvatar.classList.add('bg-sky-500');
        }

        const adminPanelLink = document.getElementById('admin-panel-link');
        if (currentUser.role === 'admin') {
            adminPanelLink.classList.remove('hidden');
        } else {
            adminPanelLink.classList.add('hidden');
        }

        mainNavLinks?.classList.remove('hidden');
        mainNavLinks?.classList.add('grid');
    }

    function showGuestUI() {
        headerGuestView.classList.remove('hidden');
        headerAuthView.classList.add('hidden');
        headerAuthView.classList.remove('flex');
        mainNavLinks?.classList.add('hidden');
        mainNavLinks?.classList.remove('grid');
        commentFormAvatar.innerHTML = ``;
        commentFormAvatar.classList.add('bg-slate-700');
    }
    
    // --- Authentication Logic ---
    function checkLoginState() {
        if (currentUser) {
            showAuthenticatedUI();
            showPage('page-home');
        } else {
            showGuestUI();
            showPage('page-login');
        }
    }

    function isUsernameTaken(username) {
        return Object.values(users).some(user => user.username && user.username.toLowerCase() === username.toLowerCase());
    }

    document.getElementById('signup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = e.target.name.value.trim();
        const username = e.target.username.value.trim().toLowerCase();
        const email = e.target.email.value.trim().toLowerCase();
        const password = e.target.password.value;
        const errorEl = document.getElementById('signup-error');

        const usernameRegex = /^[a-z0-9_]{3,15}$/;
        if (!usernameRegex.test(username)) {
            errorEl.textContent = 'Username must be 3-15 characters, lowercase letters, numbers, and underscores only.';
            errorEl.classList.remove('hidden');
            return;
        }

        if (isUsernameTaken(username)) {
            errorEl.textContent = 'This username is already taken.';
            errorEl.classList.remove('hidden');
            return;
        }

        if (users[email]) {
            errorEl.textContent = 'An account with this email already exists.';
            errorEl.classList.remove('hidden');
            return;
        }
        
        const newUser = { name, username, email, password, picture: null, role: 'user' };
        users[email] = newUser;
        currentUser = newUser;
        saveData();
        checkLoginState();
    });

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.email.value.trim().toLowerCase();
        const password = e.target.password.value;
        const errorEl = document.getElementById('login-error');

        if (users[email] && users[email].password === password) {
            currentUser = users[email];
            errorEl.classList.add('hidden');
            saveData();
            checkLoginState();
        } else {
            errorEl.textContent = 'Invalid email or password.';
            errorEl.classList.remove('hidden');
        }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('communityHubCurrentUser');
        document.getElementById('profile-dropdown-menu').classList.add('hidden');
        checkLoginState();
    });

    // --- UI Enhancements & Profile Dropdown ---
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => header.classList.toggle('bg-black/80', window.scrollY > 50));

    const profileDropdownBtn = document.getElementById('profile-dropdown-btn');
    const profileDropdownMenu = document.getElementById('profile-dropdown-menu');
    profileDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdownMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
         if (!profileDropdownBtn.contains(e.target)) {
              profileDropdownMenu.classList.add('hidden');
         }
    });
    profileDropdownMenu.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
             profileDropdownMenu.classList.add('hidden');
        }
    });

    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const isOpening = !answer.style.maxHeight || answer.style.maxHeight === "0px";
            
            document.querySelectorAll('.faq-answer').forEach(ans => {
                ans.style.maxHeight = null;
                ans.previousElementSibling.querySelector('svg').classList.remove('rotate-180');
            });

            if (isOpening) {
                answer.style.maxHeight = answer.scrollHeight + "px";
                question.querySelector('svg').classList.add('rotate-180');
            }
        });
    });

    // --- Reporting Logic ---
    function openReportModal(contentId, contentType) {
        reportContentId.value = contentId;
        reportContentType.value = contentType;
        reportModal.classList.remove('hidden');
    }

    cancelReportBtn.addEventListener('click', () => reportModal.classList.add('hidden'));

    reportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const contentId = reportContentId.value;
        const contentType = reportContentType.value;
        const reason = reportForm.querySelector('input[name="reason"]:checked').value;

        if (!currentUser || !contentId || !contentType || !reason) return;

        const reportId = `report-${Date.now()}`;
        reportedContent[reportId] = {
            id: reportId,
            contentId,
            contentType,
            reason,
            reporterEmail: currentUser.email,
            timestamp: getTimestamp(),
            status: 'pending' // pending, resolved
        };

        saveData();
        reportModal.classList.add('hidden');
        // A more subtle confirmation would be better, but alert is simple for now.
        alert('Thank you for your report. Our moderators will review it soon.');
    });

    // --- Create Page Logic ---
    const selectGeneralPostBtn = document.getElementById('select-general-post');
    const selectEventPostBtn = document.getElementById('select-event-post');
    const selectLostFoundBtn = document.getElementById('select-lost-found');
    const formGeneralPost = document.getElementById('form-general-post');
    const formEvent = document.getElementById('form-event');
    const formLostFound = document.getElementById('form-lost-found');

    function setupCreateFormToggle() {
        const buttons = [selectGeneralPostBtn, selectEventPostBtn, selectLostFoundBtn];
        const forms = [formGeneralPost, formEvent, formLostFound];

        buttons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                forms.forEach((form, formIndex) => form.classList.toggle('hidden', index !== formIndex));
                buttons.forEach((b, btnIndex) => {
                    b.classList.toggle('bg-sky-500', index === btnIndex);
                    b.classList.toggle('text-white', index === btnIndex);
                    b.classList.toggle('text-slate-400', index !== btnIndex);
                });
            });
        });
    }
    setupCreateFormToggle();

    const setupImagePreview = (inputId, previewId) => {
        const input = document.getElementById(inputId);
        const previewContainer = document.getElementById(previewId);
        input.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewContainer.innerHTML = `<div class="relative mt-4"><img src="${e.target.result}" class="rounded-lg w-full object-cover max-h-64 border border-slate-700"><button type="button" class="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 leading-none w-6 h-6 flex items-center justify-center hover:bg-black/75" onclick="this.closest('#${previewId}').innerHTML=''; document.getElementById('${inputId}').value=''; this.closest('#${previewId}').classList.add('hidden');">&times;</button></div>`;
                    previewContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    };
    setupImagePreview('post-photo', 'post-photo-preview');
    setupImagePreview('event-photo', 'event-photo-preview');
    setupImagePreview('item-photo', 'item-photo-preview');

     // --- Poll Creator UI Logic ---
    const addPollBtn = document.getElementById('add-poll-btn');
    const removePollBtn = document.getElementById('remove-poll-btn');
    const pollCreatorContainer = document.getElementById('poll-creator-container');
    const pollOptionsInputs = document.getElementById('poll-options-inputs');
    const addPollOptionBtn = document.getElementById('add-poll-option-btn');
    const MAX_POLL_OPTIONS = 4;

    function createPollOptionInput(index, isRemovable = false) {
        const placeholder = `Option ${index + 1}`;
        const removeBtnHTML = isRemovable ? `<button type="button" class="remove-poll-option-btn text-slate-500 hover:text-red-400 p-1">&times;</button>` : '';
        return `<div class="flex items-center gap-2 poll-option-input-wrapper"><input type="text" name="poll-option" class="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500" placeholder="${placeholder}" maxlength="80">${removeBtnHTML}</div>`;
    }

    function updatePollCreatorUI() {
        const optionCount = pollOptionsInputs.children.length;
        addPollOptionBtn.classList.toggle('hidden', optionCount >= MAX_POLL_OPTIONS);
    }

    function renderInitialPollOptions() {
        pollOptionsInputs.innerHTML = createPollOptionInput(0) + createPollOptionInput(1);
        updatePollCreatorUI();
    }

    addPollBtn.addEventListener('click', () => {
        addPollBtn.classList.add('hidden');
        pollCreatorContainer.classList.remove('hidden');
        if (pollOptionsInputs.children.length === 0) renderInitialPollOptions();
    });

    removePollBtn.addEventListener('click', () => {
        addPollBtn.classList.remove('hidden');
        pollCreatorContainer.classList.add('hidden');
        pollOptionsInputs.innerHTML = '';
    });

    addPollOptionBtn.addEventListener('click', () => {
        const currentOptions = pollOptionsInputs.children.length;
        if (currentOptions < MAX_POLL_OPTIONS) {
            pollOptionsInputs.insertAdjacentHTML('beforeend', createPollOptionInput(currentOptions, true));
            updatePollCreatorUI();
        }
    });

    pollOptionsInputs.addEventListener('click', e => {
        if (e.target.closest('.remove-poll-option-btn')) {
            e.target.closest('.poll-option-input-wrapper').remove();
            pollOptionsInputs.querySelectorAll('input[name="poll-option"]').forEach((input, index) => input.placeholder = `Option ${index + 1}`);
            updatePollCreatorUI();
        }
    });

    // --- Form Submission Logic ---
    formGeneralPost.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const title = e.target['post-title'].value.trim();
        const content = e.target['post-content'].value.trim();
        const category = e.target['post-category'].value;
        const tagsRaw = e.target['post-tags'].value.trim();
        const tags = tagsRaw ? tagsRaw.split(',').map(tag => tag.replace(/#/g, '').trim().toLowerCase()).filter(tag => tag) : [];
        const previewImg = document.querySelector('#post-photo-preview img');
        if (!title || !content || !category) return;
        
        const pollOptions = Array.from(document.querySelectorAll('#poll-options-inputs input')).map(input => input.value.trim()).filter(text => text.length > 0);
        let pollData = null;
        if (pollOptions.length >= 2) {
            pollData = { options: pollOptions.map(optionText => ({ text: optionText, votes: [] })) };
        }

        const postId = `post-${Date.now()}`;
        postsData[postId] = { id: postId, title, content, category, tags, poll: pollData, imageSrc: previewImg ? previewImg.src : null, timestamp: getTimestamp(), author: currentUser.name, authorEmail: currentUser.email, voteState: 'none', voteCount: 0, comments: [] };
        saveData();
        resetCreatePage();
        showPage('page-posts');
    });

    formEvent.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const title = e.target['event-title'].value.trim();
        const content = e.target['event-content'].value.trim();
        const eventDate = e.target['event-date'].value;
        const eventTime = e.target['event-time'].value;
        const eventLocation = e.target['event-location'].value.trim();
        const tagsRaw = e.target['event-tags'].value.trim();
        const tags = tagsRaw ? tagsRaw.split(',').map(tag => tag.replace(/#/g, '').trim().toLowerCase()).filter(tag => tag) : [];
        const previewImg = document.querySelector('#event-photo-preview img');
        if (!title || !content || !eventDate || !eventTime || !eventLocation) return;
        
        const postId = `post-${Date.now()}`;
        postsData[postId] = { id: postId, title, content, category: 'Event', tags, eventDate, eventTime, eventLocation, attendance: { going: [], maybe: [], notGoing: [] }, imageSrc: previewImg ? previewImg.src : null, timestamp: getTimestamp(), author: currentUser.name, authorEmail: currentUser.email, voteState: 'none', voteCount: 0, comments: [] };
        saveData();
        resetCreatePage();
        showPage('page-posts');
    });

    formLostFound.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const name = e.target['item-name'].value.trim();
        const status = e.target['item-status'].value;
        const description = e.target['item-description'].value.trim();
        const previewImg = document.querySelector('#item-photo-preview img');
        if(!name || !description) return;
        
        const itemId = `lf-${Date.now()}`;
        lostFoundData[itemId] = { id: itemId, name, status, description, imageSrc: previewImg ? previewImg.src : null, author: currentUser.name, authorEmail: currentUser.email, timestamp: getTimestamp() };
        saveData();
        resetCreatePage();
        showPage('page-lost-found');
    });
    
    // --- Rendering Functions ---
    function renderPosts() {
        const feed = document.getElementById('posts-feed');
        let postIds = Object.keys(postsData);

        if (currentFilter.category !== 'all') {
            postIds = postIds.filter(id => postsData[id].category === currentFilter.category);
        }

        const tagFilterStatusEl = document.getElementById('tag-filter-status');
        if (currentFilter.tag) {
            postIds = postIds.filter(id => postsData[id].tags && postsData[id].tags.includes(currentFilter.tag));
            tagFilterStatusEl.innerHTML = `<span>Showing <strong class="text-sky-400">${postIds.length}</strong> posts tagged with <strong class="text-sky-400">#${currentFilter.tag}</strong></span><button id="clear-tag-filter-btn" class="text-sm font-semibold hover:text-white">Clear</button>`;
            tagFilterStatusEl.classList.remove('hidden');
        } else {
            tagFilterStatusEl.classList.add('hidden');
        }

        const countTotalComments = (post) => post.comments.reduce((count, comment) => count + 1 + (comment.replies ? comment.replies.length : 0), 0);
        switch(currentSort) {
            case 'upvoted': postIds.sort((a, b) => postsData[b].voteCount - postsData[a].voteCount); break;
            case 'comments': postIds.sort((a, b) => countTotalComments(postsData[b]) - countTotalComments(postsData[a])); break;
            case 'recent': default: postIds.sort().reverse(); break;
        }
        
        feed.innerHTML = postIds.map(id => createPostCardHTML(postsData[id])).join('') || `<p class="text-slate-500 text-center col-span-full">No posts match the current filters.</p>`;
    }
    
    function renderLostAndFound() {
        const feed = document.getElementById('lost-found-feed');
        const itemIds = Object.keys(lostFoundData).sort().reverse();
        if (itemIds.length === 0) {
            feed.innerHTML = `<p class="text-slate-500 text-center col-span-full">No lost or found items have been reported yet.</p>`;
        } else {
            feed.innerHTML = itemIds.map(id => createLostFoundCardHTML(lostFoundData[id])).join('');
        }
    }

    // --- Profile Page Functions ---
    function renderProfilePage() {
        if (!currentUser) return;
        document.getElementById('profile-page-name').textContent = currentUser.name;
        document.getElementById('profile-page-email').textContent = currentUser.email;
        document.getElementById('profile-update-name').value = currentUser.name;
        
        if (currentUser.username) {
            document.getElementById('profile-page-username').textContent = `@${currentUser.username}`;
        }

        const avatarContainer = document.getElementById('profile-page-avatar');
        if (currentUser.picture) {
            avatarContainer.innerHTML = `<img src="${currentUser.picture}" alt="${currentUser.name}" class="avatar-img">`;
        } else {
            avatarContainer.innerHTML = '';
        }
    }
    
    function renderUserProfilePage(userEmail) {
        const user = users[userEmail];
        if (!user) {
            showPage('page-posts');
            return;
        }

        document.getElementById('user-profile-page-name').textContent = user.name;
        document.getElementById('user-profile-page-username').textContent = `@${user.username}`;
        const avatarContainer = document.getElementById('user-profile-page-avatar');
        if (user.picture) {
            avatarContainer.innerHTML = `<img src="${user.picture}" alt="${user.name}" class="avatar-img">`;
        } else {
            avatarContainer.innerHTML = `<div class="w-full h-full bg-pink-500 flex items-center justify-center text-white font-bold text-4xl">${user.name.charAt(0)}</div>`;
        }

        const userPostsFeed = document.getElementById('user-profile-posts-feed');
        const userPostsTitle = document.getElementById('user-profile-posts-title');
        const userPostIds = Object.keys(postsData).filter(id => postsData[id].authorEmail === userEmail).sort().reverse();
        
        userPostsTitle.textContent = `${user.name.split(' ')[0]}'s Posts`;

        if (userPostIds.length === 0) {
            userPostsFeed.innerHTML = `<p class="text-slate-400 text-center">This user hasn't posted anything yet.</p>`;
        } else {
            userPostsFeed.innerHTML = userPostIds.map(id => createPostCardHTML(postsData[id])).join('');
        }
        showPage('page-user-profile');
    }


    document.getElementById('profile-update-form').addEventListener('submit', e => {
        e.preventDefault();
        const newName = document.getElementById('profile-update-name').value.trim();
        if (!newName || !currentUser) return;
        
        const userEmail = currentUser.email;
        
        Object.values(postsData).forEach(post => {
            if (post.authorEmail === userEmail) post.author = newName;
            const updateCommentAuthor = (comments) => {
                comments.forEach(comment => {
                    if (comment.authorEmail === userEmail) comment.author = newName;
                    if (comment.replies) updateCommentAuthor(comment.replies);
                });
            };
            updateCommentAuthor(post.comments);
        });
        Object.values(lostFoundData).forEach(item => {
            if (item.authorEmail === userEmail) item.author = newName;
        });

        currentUser.name = newName;
        if (users[userEmail]) {
            users[userEmail].name = newName;
        }

        saveData();
        renderProfilePage();
        showAuthenticatedUI();
        
        const successMsg = document.getElementById('profile-update-success');
        successMsg.textContent = 'Profile updated successfully!';
        successMsg.classList.remove('hidden');
        setTimeout(() => successMsg.classList.add('hidden'), 3000);
    });
    
    document.getElementById('profile-pic-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !currentUser) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const newPicUrl = event.target.result;
            
            currentUser.picture = newPicUrl;
            if (users[currentUser.email]) {
                users[currentUser.email].picture = newPicUrl;
            }
            saveData();
            
            showAuthenticatedUI();
            renderProfilePage();
            
            const successMsg = document.getElementById('profile-update-success');
            successMsg.textContent = 'Profile picture updated!';
            successMsg.classList.remove('hidden');
            setTimeout(() => {
                successMsg.classList.add('hidden');
                successMsg.textContent = ''; 
            }, 3000);
        };
        reader.readAsDataURL(file);
    });

    function renderMyPosts() {
         const myPostsFeed = document.getElementById('my-posts-feed');
         if (!currentUser) {
              myPostsFeed.innerHTML = '';
              return;
         }
         const myPostIds = Object.keys(postsData).filter(id => postsData[id].authorEmail === currentUser.email).sort().reverse();

         if (myPostIds.length === 0) {
              myPostsFeed.innerHTML = `<div class="text-center"><p class="text-slate-400">You haven't created any posts yet.</p><a href="#" data-target="page-create" class="mt-4 shiny-button relative overflow-hidden inline-block bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-6 rounded-full">Create Your First Post</a></div>`;
         } else {
              myPostsFeed.innerHTML = myPostIds.map(id => createPostCardHTML(postsData[id])).join('');
         }
    }

    function renderAchievementsPage() {
        const listEl = document.getElementById('achievements-list');
        if (!currentUser) return;

        const userPostCount = Object.values(postsData).filter(p => p.authorEmail === currentUser.email).length;
        let userCommentCount = 0;
        Object.values(postsData).forEach(p => {
            const countComments = (comments) => {
                comments.forEach(c => {
                    if (c.authorEmail === currentUser.email) userCommentCount++;
                    if (c.replies) countComments(c.replies);
                });
            };
            countComments(p.comments);
        });

        const achievements = [
            { title: 'First Post', desc: 'Shared your first thought with the community.', unlocked: userPostCount > 0, icon: 'M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' },
            { title: 'Community Starter', desc: 'Created 5 posts and sparked conversations.', unlocked: userPostCount >= 5, icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' },
            { title: 'First Comment', desc: 'Joined the conversation by leaving a comment.', unlocked: userCommentCount > 0, icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375' },
            { title: 'Conversationalist', desc: 'Left 10 comments and replies.', unlocked: userCommentCount >= 10, icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
        ];

        listEl.innerHTML = achievements.map(ach => {
            const unlockedClass = ach.unlocked ? 'border-green-500/50 bg-green-500/10' : 'border-slate-800 opacity-60';
            const iconColor = ach.unlocked ? 'text-green-400' : 'text-slate-500';
            return `<div class="p-6 rounded-xl border ${unlockedClass} flex items-center gap-4"><div class="p-3 rounded-full bg-slate-800"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-7 h-7 ${iconColor}"><path stroke-linecap="round" stroke-linejoin="round" d="${ach.icon}" /></svg></div><div><h4 class="font-bold text-white text-lg">${ach.title}</h4><p class="text-sm text-slate-400">${ach.desc}</p></div></div>`;
        }).join('');
    }
    
    // --- Posts Feed Interactive Logic (Delegation) ---
    document.getElementById('posts-feed').addEventListener('click', handlePostCardInteraction);
    document.getElementById('my-posts-feed').addEventListener('click', handlePostCardInteraction);
    document.getElementById('user-profile-posts-feed').addEventListener('click', handlePostCardInteraction);
    document.getElementById('comments-page-post-container').addEventListener('click', handlePostCardInteraction);


    function handlePostCardInteraction(e) {
        const target = e.target;
        const postCard = target.closest('.post-card');
        if (!postCard) return;
        const postId = postCard.dataset.postId;
        const post = postsData[postId];
        if (!post) return;
        
        if (target.closest('.upvote-btn') || target.closest('.downvote-btn')) handleVote(postId, target.closest('.upvote-btn') ? 'up' : 'down');
        if (target.closest('.view-comments-btn')) showCommentsPage(postId);
        if (target.closest('.post-options-btn')) {
            e.stopPropagation();
            const dropdown = postCard.querySelector('.options-dropdown');
            const isHidden = dropdown.classList.contains('hidden');
            document.querySelectorAll('.options-dropdown').forEach(d => d.classList.add('hidden'));
            if (isHidden) dropdown.classList.remove('hidden');
        }
        
        if (target.closest('.delete-post-btn')) {
            if (confirm('Are you sure you want to delete this post? This cannot be undone.')) {
                 delete postsData[postId];
                 saveData();
                 postCard.remove();
            }
        }

        if (target.closest('.edit-post-btn')) {
            postCard.innerHTML = createPostEditFormHTML(post);
        }

        if (target.closest('.save-post-edit-btn')) {
            const newTitle = postCard.querySelector('.edit-post-title').value.trim();
            const newContent = postCard.querySelector('.edit-post-content').value.trim();
            const newCategory = postCard.querySelector('.edit-post-category').value;
            const newTagsRaw = postCard.querySelector('.edit-post-tags').value.trim();
            const newTags = newTagsRaw ? newTagsRaw.split(',').map(tag => tag.replace(/#/g, '').trim().toLowerCase()).filter(tag => tag) : [];

            if (newTitle && newContent && newCategory) {
                post.title = newTitle;
                post.content = newContent;
                post.category = newCategory;
                post.tags = newTags;
                saveData();
                postCard.outerHTML = createPostCardHTML(post);
            }
        }
        
        if (target.closest('.cancel-post-edit-btn')) {
             postCard.outerHTML = createPostCardHTML(post);
        }

        if (target.classList.contains('post-tag')) {
            e.preventDefault();
            currentFilter.category = 'all'; 
            document.getElementById('category-filter-select').value = 'all';
            currentFilter.tag = target.dataset.tag;
            showPage('page-posts');
        }

        if (target.closest('.rsvp-btn')) {
            handleRsvp(postId, target.closest('.rsvp-btn').dataset.rsvp);
        }

        if (target.closest('.poll-option-btn')) {
            const pollOptionBtn = target.closest('.poll-option-btn');
            const optionIndex = parseInt(pollOptionBtn.dataset.pollOptionIndex, 10);
            handlePollVote(postId, optionIndex);
        }

        if (target.closest('.report-btn')) {
            const btn = target.closest('.report-btn');
            openReportModal(btn.dataset.contentId, btn.dataset.contentType);
        }
    };

    document.getElementById('category-filter-select').addEventListener('change', (e) => {
        currentFilter.category = e.target.value;
        renderPosts();
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderPosts();
    });
    
    document.querySelector('.max-w-3xl.mx-auto.mb-8').addEventListener('click', (e) => {
        if (e.target.id === 'clear-tag-filter-btn') {
            currentFilter.tag = null;
            renderPosts();
        }
    });

    document.getElementById('lost-found-feed').addEventListener('click', (e) => {
        const target = e.target;
        const lfCard = target.closest('.lf-card');
        if (!lfCard) return;
        const itemId = lfCard.dataset.lfId;
        const item = lostFoundData[itemId];

        if (target.closest('.lf-options-btn')) {
             e.stopPropagation();
            const dropdown = lfCard.querySelector('.options-dropdown');
            const isHidden = dropdown.classList.contains('hidden');
            document.querySelectorAll('.options-dropdown').forEach(d => d.classList.add('hidden'));
            if (isHidden) dropdown.classList.remove('hidden');
        }

        if (target.closest('.delete-lf-btn')) {
             if (confirm('Are you sure you want to delete this item? This cannot be undone.')) {
                delete lostFoundData[itemId];
                saveData();
                lfCard.remove();
                if (Object.keys(lostFoundData).length === 0) renderLostAndFound();
             }
        }

        if (target.closest('.edit-lf-btn')) {
            lfCard.innerHTML = createLFEditFormHTML(item);
        }
        
        if(target.closest('.save-lf-edit-btn')) {
            const newName = lfCard.querySelector('.edit-lf-name').value.trim();
            const newStatus = lfCard.querySelector('.edit-lf-status').value;
            const newDescription = lfCard.querySelector('.edit-lf-description').value.trim();
            if(newName && newDescription) {
                item.name = newName;
                item.status = newStatus;
                item.description = newDescription;
                saveData();
                lfCard.outerHTML = createLostFoundCardHTML(item);
            }
        }
        
        if(target.closest('.cancel-lf-edit-btn')) {
            lfCard.outerHTML = createLostFoundCardHTML(item);
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.options-dropdown') && !e.target.closest('.post-options-btn, .lf-options-btn, .chat-options-btn')) {
            document.querySelectorAll('.options-dropdown, .chat-options-dropdown').forEach(d => d.classList.add('hidden'));
        }
    });

    function handleVote(postId, voteType) {
        const post = postsData[postId];
        const postCards = document.querySelectorAll(`.post-card[data-post-id="${postId}"]`);
        if (!post || postCards.length === 0) return;

        if (voteType === 'up') {
            if (post.voteState === 'upvoted') { post.voteCount -= 1; post.voteState = 'none'; }
            else if (post.voteState === 'downvoted') { post.voteCount += 2; post.voteState = 'upvoted'; }
            else { post.voteCount += 1; post.voteState = 'upvoted'; }
        } else {
            if (post.voteState === 'downvoted') { post.voteCount += 1; post.voteState = 'none'; }
            else if (post.voteState === 'upvoted') { post.voteCount -= 2; post.voteState = 'downvoted'; }
            else { post.voteCount -= 1; post.voteState = 'downvoted'; }
        }

        saveData();
        postCards.forEach(card => {
            card.querySelector('.vote-count').textContent = post.voteCount;
            card.querySelector('.upvote-btn').classList.toggle('text-green-500', post.voteState === 'upvoted');
            card.querySelector('.downvote-btn').classList.toggle('text-red-500', post.voteState === 'downvoted');
        });
    }

    function handleRsvp(postId, rsvpStatus) {
        const post = postsData[postId];
        if (!post || !currentUser) return;
        
        const userEmail = currentUser.email;
        const attendance = post.attendance;
        const currentStatus = ['going', 'maybe', 'notGoing'].find(status => attendance[status].includes(userEmail));

        attendance.going = attendance.going.filter(email => email !== userEmail);
        attendance.maybe = attendance.maybe.filter(email => email !== userEmail);
        attendance.notGoing = attendance.notGoing.filter(email => email !== userEmail);
        
        if (currentStatus !== rsvpStatus) {
            attendance[rsvpStatus].push(userEmail);
        }
        
        saveData();
        
        const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        if(card) card.outerHTML = createPostCardHTML(post);
    }

    function handlePollVote(postId, optionIndex) {
        const post = postsData[postId];
        if (!post || !post.poll || !currentUser) return;
        
        const userHasVoted = post.poll.options.some(option => option.votes.includes(currentUser.email));
        if (userHasVoted) return; 

        if (post.poll.options[optionIndex]) {
            post.poll.options[optionIndex].votes.push(currentUser.email);
            saveData();

            const postCards = document.querySelectorAll(`.post-card[data-post-id="${postId}"]`);
            postCards.forEach(card => {
                if (card) card.outerHTML = createPostCardHTML(post);
            });
        }
    }

    // --- Comments Page Logic ---
    const commentsPage = document.getElementById('page-comments');
    const commentsPagePostContainer = document.getElementById('comments-page-post-container');
    const commentsPageList = document.getElementById('comments-page-list');
    
    const findCommentById = (comments, id) => {
        for (const comment of comments) {
            if (comment.id === id) return comment;
            if (comment.replies) {
                const foundInReply = findCommentById(comment.replies, id);
                if (foundInReply) return foundInReply;
            }
        }
        return null;
    };
    const deleteCommentById = (comments, id) => {
        for (let i = 0; i < comments.length; i++) {
            if (comments[i].id === id) { comments.splice(i, 1); return true; }
            if (comments[i].replies && deleteCommentById(comments[i].replies, id)) return true;
        }
        return false;
    };

    function showCommentsPage(postId) {
        const post = postsData[postId];
        if (!post) return;
        commentsPage.dataset.currentPostId = postId;
        commentsPagePostContainer.innerHTML = createPostCardHTML(post, { isStatic: true });
        renderCommentsList(postId);
        showPage('page-comments');
    }

    function renderCommentsList(postId) {
        const post = postsData[postId];
        commentsPageList.innerHTML = post?.comments?.length > 0
            ? post.comments.map(comment => createCommentHTML(comment)).join('')
            : '<p class="text-slate-500 text-center">No comments yet. Be the first to reply!</p>';
    }
    
    commentsPage.addEventListener('click', (e) => {
        const target = e.target;
        const postId = commentsPage.dataset.currentPostId;
        if (!postId || !postsData[postId] || !currentUser) return;

        if (target.closest('.submit-comment-btn')) {
            const textarea = commentsPage.querySelector('#comments-page-form .comment-textarea');
            const commentText = textarea.value.trim();
            if (!commentText) return;
            const newComment = { id: `comment-${Date.now()}`, parentId: null, text: commentText, author: currentUser.name, authorEmail: currentUser.email, timestamp: getTimestamp(), isLiked: false, likeCount: 0, replies: [] };
            postsData[postId].comments.unshift(newComment);
            saveData();
            renderCommentsList(postId);
            textarea.value = '';
            const originalCard = document.querySelector(`.post-card[data-post-id="${postId}"] .comment-count`);
            if (originalCard) originalCard.textContent = postsData[postId].comments.reduce((acc, c) => acc + 1 + c.replies.length, 0);
        }
        
        const commentEl = target.closest('.comment, .reply');
        if (!commentEl) return;
        const commentId = commentEl.dataset.commentId;
        const commentData = findCommentById(postsData[postId].comments, commentId);
        if (!commentData) return;

        if (target.closest('.like-comment-btn')) {
            const likeBtn = target.closest('.like-comment-btn');
            commentData.isLiked = !commentData.isLiked;
            commentData.likeCount += commentData.isLiked ? 1 : -1;
            saveData();
            likeBtn.querySelector('.like-count').textContent = commentData.likeCount;
            likeBtn.querySelector('span:first-child').textContent = commentData.isLiked ? 'Liked' : 'Like';
            likeBtn.classList.toggle('liked', commentData.isLiked);
        }

        if (target.closest('.reply-comment-btn')) {
            document.querySelectorAll('.reply-form').forEach(form => form.remove());
            const existingForm = commentEl.querySelector('.reply-form');
            if (existingForm) return existingForm.remove();
            commentEl.querySelector('.replies-container').insertAdjacentHTML('afterend', createReplyFormHTML());
            commentEl.parentElement.querySelector('.reply-form textarea').focus();
        }

        if (target.closest('.submit-reply-btn')) {
            const replyForm = target.closest('.reply-form');
            const textarea = replyForm.querySelector('.reply-textarea');
            const replyText = textarea.value.trim();
            if (!replyText) return;
            const newReply = { id: `comment-${Date.now()}`, parentId: commentId, text: replyText, author: currentUser.name, authorEmail: currentUser.email, timestamp: getTimestamp(), isLiked: false, likeCount: 0, replies: [] };
            commentData.replies.unshift(newReply);
            saveData();
            renderCommentsList(postId);
        }

        if (target.closest('.delete-comment-btn')) {
            if (confirm('Are you sure you want to delete this comment?') && deleteCommentById(postsData[postId].comments, commentId)) {
                saveData();
                renderCommentsList(postId);
            }
        }

        if (target.closest('.edit-comment-btn')) {
            const commentTextEl = commentEl.querySelector('.comment-text');
            if (commentTextEl) {
                commentTextEl.innerHTML = `<textarea class="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" rows="3">${commentData.text}</textarea><div class="text-right mt-2"><button class="cancel-edit-comment-btn text-xs font-semibold text-slate-400 px-3 py-1 rounded-full hover:bg-slate-700">Cancel</button><button class="save-edit-comment-btn ml-2 bg-sky-500 text-white text-xs font-semibold px-3 py-1 rounded-full hover:bg-sky-600">Save</button></div>`;
            }
        }

        if (target.closest('.save-edit-comment-btn')) {
            const textarea = commentEl.querySelector('textarea');
            const newText = textarea.value.trim();
            if (newText) {
                commentData.text = newText;
                saveData();
                renderCommentsList(postId);
            }
        }

        if (target.closest('.cancel-edit-comment-btn')) {
            renderCommentsList(postId);
        }

        if (target.closest('.report-btn')) {
            const btn = target.closest('.report-btn');
            openReportModal(btn.dataset.contentId, btn.dataset.contentType);
        }
    });

    // --- Chat Page Logic ---
    const userSearchInput = document.getElementById('user-search-input');
    const chatUserList = document.getElementById('chat-user-list');
    const chatMessageForm = document.getElementById('chat-message-form');
    const chatMessagesContainer = document.getElementById('chat-messages');

    const findMessageById = (userId, messageId) => {
        if (!chatData[userId]) return null;
        return chatData[userId].messages.find(msg => msg.id === messageId);
    };

    function activateChat(userId) {
        currentChatUserId = userId;
        const conversationScreen = document.getElementById('chat-conversation-screen');
        conversationScreen.classList.remove('hidden');
        conversationScreen.classList.add('flex');
        
        const user = chatData[userId];
        document.querySelector('#chat-header h5').textContent = user.name;
        document.querySelector('#chat-header div').className = `w-10 h-10 rounded-full ${user.avatarColor} flex-shrink-0`;
        renderMessages(userId);
    }

    function renderUserList(filter = '') {
        chatUserList.innerHTML = '';
        const filteredUserIds = Object.keys(chatData).filter(userId => 
            chatData[userId].name.toLowerCase().includes(filter.toLowerCase())
        );
        if (filteredUserIds.length === 0) {
            chatUserList.innerHTML = `<p class="text-center text-slate-500 p-4">No users found.</p>`;
            return;
        }
        filteredUserIds.forEach(userId => {
            const user = chatData[userId];
            const activeClass = userId === currentChatUserId ? 'bg-sky-500/20' : 'hover:bg-slate-800/50';
            const userHtml = `<div class="chat-user-item flex items-center p-4 cursor-pointer ${activeClass}" data-user-id="${userId}"><div class="w-10 h-10 rounded-full ${user.avatarColor} flex-shrink-0 mr-3"></div><div class="flex-grow overflow-hidden"><p class="font-bold text-white truncate">${user.name}</p><p class="text-sm text-slate-400 truncate">${user.lastMessage}</p></div><div class="text-xs text-slate-500 flex-shrink-0 ml-2">${user.timestamp}</div></div>`;
            chatUserList.insertAdjacentHTML('beforeend', userHtml);
        });
    }
    
    userSearchInput.addEventListener('input', (e) => renderUserList(e.target.value));

    chatUserList.addEventListener('click', (e) => {
        const userItem = e.target.closest('.chat-user-item');
        if (userItem) {
            activateChat(userItem.dataset.userId);
            renderUserList(userSearchInput.value);
        }
    });

    function renderMessages(userId) {
        chatMessagesContainer.innerHTML = '';
        const user = chatData[userId];
        if (!user) return;
        
        user.messages.forEach(msg => {
            if (msg.deletedFor?.includes('me')) return;
            const messageHtml = createChatMessageHTML(msg, userId);
            chatMessagesContainer.insertAdjacentHTML('beforeend', messageHtml);
        });
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    chatMessagesContainer.addEventListener('click', (e) => {
        const target = e.target;
        const messageWrapper = target.closest('.chat-message-wrapper');
        if (!messageWrapper) return;
        
        const messageId = messageWrapper.dataset.messageId;
        const message = findMessageById(currentChatUserId, messageId);
        if (!message) return;

        if (target.closest('.chat-options-btn')) {
            e.stopPropagation();
            const dropdown = messageWrapper.querySelector('.chat-options-dropdown');
            const isHidden = dropdown.classList.contains('hidden');
            document.querySelectorAll('.chat-options-dropdown').forEach(d => d.classList.add('hidden'));
            if (isHidden) dropdown.classList.remove('hidden');
        }

        if (target.closest('.chat-reply-btn')) updateReplyPreview(messageId);
        if (target.closest('.chat-delete-me-btn')) {
            if (!message.deletedFor) message.deletedFor = [];
            message.deletedFor.push('me');
            saveData();
            renderMessages(currentChatUserId);
        }
        if (target.closest('.chat-delete-all-btn')) {
            message.text = 'This message was deleted';
            message.isDeleted = true;
            saveData();
            renderMessages(currentChatUserId);
        }
        if (target.closest('.chat-edit-btn')) {
            const bubble = messageWrapper.querySelector('.message-bubble-content');
            bubble.innerHTML = `<div class="flex items-center space-x-2"><textarea class="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm focus:outline-none" rows="2">${message.text}</textarea><button class="save-chat-edit-btn bg-green-500 p-2 rounded-full text-white hover:bg-green-600">&check;</button><button class="cancel-chat-edit-btn bg-red-500 p-2 rounded-full text-white hover:bg-red-600">&times;</button></div>`;
            messageWrapper.querySelector('.chat-options-btn').classList.add('hidden');
        }
        if (target.closest('.save-chat-edit-btn')) {
            const textarea = messageWrapper.querySelector('textarea');
            message.text = textarea.value.trim();
            message.isEdited = true;
            saveData();
            renderMessages(currentChatUserId);
        }
        if (target.closest('.cancel-chat-edit-btn')) renderMessages(currentChatUserId);
    });

    function updateReplyPreview(messageId = null) {
        const previewContainer = document.getElementById('chat-reply-preview');
        replyingToMessageId = messageId;

        if (!replyingToMessageId) {
            previewContainer.classList.add('hidden');
            return;
        }
        const message = findMessageById(currentChatUserId, replyingToMessageId);
        if (!message) {
            replyingToMessageId = null;
            previewContainer.classList.add('hidden');
            return;
        }
        previewContainer.innerHTML = `<p class="font-semibold text-sky-400 text-xs">Replying to ${message.sender === 'me' ? 'Yourself' : chatData[currentChatUserId].name}</p><p class="text-slate-400 truncate">${sanitize(message.text)}</p><button id="cancel-reply-btn" class="absolute top-1 right-1 text-slate-500 hover:text-white">&times;</button>`;
        previewContainer.classList.remove('hidden');
        document.getElementById('chat-message-input').focus();
        
        document.getElementById('cancel-reply-btn').onclick = () => updateReplyPreview(null);
    }

    chatMessageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-message-input');
        const text = input.value.trim();
        
        if (text && currentChatUserId) {
            const newMessage = { id: `msg-${Date.now()}`, sender: 'me', text: text, isEdited: false, isDeleted: false, replyTo: replyingToMessageId, deletedFor: [] };
            chatData[currentChatUserId].messages.push(newMessage);
            chatData[currentChatUserId].lastMessage = `You: ${text}`;
            input.value = '';
            updateReplyPreview(null);
            renderMessages(currentChatUserId);
            renderUserList(userSearchInput.value);
            saveData();

            if (currentChatUserId !== 'user-0') {
                setTimeout(() => {
                    const replies = ["Interesting.", "Got it, thanks!", "Okay, I'll look into it.", "Can you explain that a bit more?", "That makes sense."];
                    const randomReply = replies[Math.floor(Math.random() * replies.length)];
                    const reply = { id: `msg-${Date.now() + 1}`, sender: 'them', text: randomReply, isEdited: false, isDeleted: false, replyTo: null, deletedFor: [] };
                    chatData[currentChatUserId].messages.push(reply);
                    chatData[currentChatUserId].lastMessage = randomReply;
                    renderMessages(currentChatUserId);
                    renderUserList(userSearchInput.value);
                    saveData();
                }, 1500);
            }
        }
    });
    
    // --- AI CHATBOT LOGIC ---
    const aiChatContainer = document.getElementById('ai-chat-container');
    const aiChatMessages = document.getElementById('ai-chat-messages');
    const aiChatForm = document.getElementById('ai-chat-form');
    const aiChatInput = document.getElementById('ai-chat-input');
    const aiThemeToggle = document.getElementById('ai-theme-toggle');
    const aiNewConversation = document.getElementById('ai-new-conversation');
    
    function appendAiMessage(text, sender = 'bot') {
        const scrollable = aiChatMessages;
        const isAtBottom = scrollable.scrollHeight - scrollable.clientHeight <= scrollable.scrollTop + 1;
        const bubbleClass = sender === 'user' ? 'ai-user-bubble bg-sky-500 text-white self-end' : 'ai-bot-bubble bg-slate-700 self-start';
        const messageHTML = `<div class="max-w-xl w-fit p-3 rounded-xl ${bubbleClass}">${text}</div>`;
        aiChatMessages.insertAdjacentHTML('beforeend', messageHTML);
        if (isAtBottom) scrollable.scrollTop = scrollable.scrollHeight;
    }

    function showTypingIndicator() {
        const indicatorHTML = `<div id="typing-indicator" class="max-w-xl w-fit p-3 rounded-xl ai-bot-bubble bg-slate-700 self-start"><div class="flex items-center gap-1.5"><div class="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div><div class="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.2s]"></div><div class="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.4s]"></div></div></div>`;
        aiChatMessages.insertAdjacentHTML('beforeend', indicatorHTML);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }
    
    function hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    function startNewAiConversation() {
         aiChatMessages.innerHTML = '';
         setTimeout(() => appendAiMessage("Hello! I'm Echo, your personal AI assistant. How can I help you today? 🚀"), 300);
    }

    aiNewConversation.addEventListener('click', startNewAiConversation);
    aiThemeToggle.addEventListener('click', () => aiChatContainer.classList.toggle('light-theme'));

    aiChatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userText = aiChatInput.value.trim();
        if (!userText) return;
        appendAiMessage(userText, 'user');
        aiChatInput.value = '';
        showTypingIndicator();
        setTimeout(() => generateAndAppendAiResponse(userText), 1500);
    });
    
    function generateAndAppendAiResponse(userText) {
        hideTypingIndicator();
        const text = userText.toLowerCase();
        const handleMath = (t) => {
            const match = t.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/);
            if (!match) return null;
            const [, num1, operator, num2] = match;
            const n1 = parseFloat(num1), n2 = parseFloat(num2);
            let result;
            switch (operator) {
                case '+': result = n1 + n2; break;
                case '-': result = n1 - n2; break;
                case '*': result = n1 * n2; break;
                case '/': result = n2 !== 0 ? n1 / n2 : 'undefined (division by zero)'; break;
                default: return null;
            }
            return `The result of ${n1} ${operator} ${n2} is ${result}.`;
        };
        const keywordResponses = {
            'your name': "I am Echo, a helpful AI assistant!",
            'post': "You can create a new post on the 'Create' page.",
            'delete': "To delete your own post, find it and use the three-dot menu.",
            'time': `The current time is ${new Date().toLocaleTimeString()}.`,
            'date': `Today is ${new Date().toDateString()}.`,
            'joke': () => ["Why don't scientists trust atoms? Because they make up everything!", "What do you call a fake noodle? An Impasta!"][Math.floor(Math.random() * 2)],
            'weather': "I can't check live weather, but I hope it's a beautiful day!",
            'calculate': handleMath
        };
        for (const keyword in keywordResponses) {
            if (text.includes(keyword)) {
                let response = keywordResponses[keyword];
                if (typeof response === 'function') response = response(text);
                if (response) { appendAiMessage(response); return; }
            }
        }
        appendAiMessage("That's a fascinating question! I'm still learning about that topic.");
    }

    // --- HTML Creation Functions ---
    const sanitize = (str) => {
         const temp = document.createElement('div');
         temp.textContent = str;
         return temp.innerHTML;
    };
    const getTimestamp = () => new Date().toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    
    function createChatMessageHTML(msg, userId) {
        const isMyMessage = msg.sender === 'me';
        const alignment = isMyMessage ? 'justify-end' : 'justify-start';
        const bubbleColor = isMyMessage ? 'bg-sky-500 text-white' : 'bg-slate-700';
        const editedIndicator = msg.isEdited ? `<span class="text-xs text-slate-400/70 ml-2">(edited)</span>` : '';
        let replyHTML = '';
        if (msg.replyTo) {
            const originalMsg = findMessageById(userId, msg.replyTo);
            if (originalMsg) {
                const originalSender = originalMsg.sender === 'me' ? 'You' : chatData[userId].name;
                replyHTML = `<div class="border-l-2 border-sky-300 pl-2 mb-1 text-xs opacity-80"><p class="font-semibold">${originalSender}</p><p class="truncate">${sanitize(originalMsg.text)}</p></div>`;
            }
        }
        let messageContentHTML = msg.isDeleted ? `<span class="italic text-slate-400">${sanitize(msg.text)}</span>` : sanitize(msg.text).replace(/\n/g, '<br>');
        const replyBtn = `<li><button class="chat-reply-btn w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700/50 rounded-md">Reply</button></li>`;
        const editBtn = isMyMessage && !msg.isDeleted ? `<li><button class="chat-edit-btn w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700/50 rounded-md">Edit</button></li>` : '';
        const deleteMeBtn = `<li><button class="chat-delete-me-btn w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-slate-700/50 rounded-md">Delete for Me</button></li>`;
        const deleteAllBtn = isMyMessage && !msg.isDeleted ? `<li><button class="chat-delete-all-btn w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-slate-700/50 rounded-md">Delete for Everyone</button></li>` : '';
        const optionsDropdown = `<div class="chat-options-dropdown hidden absolute top-0 ${isMyMessage ? 'right-full mr-1' : 'left-full ml-1'} z-10 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1"><ul class="space-y-1">${replyBtn}${editBtn}${deleteMeBtn}${deleteAllBtn}</ul></div>`;
        return `<div class="chat-message-wrapper group" data-message-id="${msg.id}"><div class="flex items-end gap-2 relative ${alignment}">${isMyMessage ? `<div class="relative">${optionsDropdown}<button class="chat-options-btn opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-slate-700 transition-opacity">&vellip;</button></div>` : ''}<div class="${bubbleColor} p-3 rounded-lg max-w-xs md:max-w-md break-words message-bubble-content">${replyHTML}${messageContentHTML}${editedIndicator}</div>${!isMyMessage ? `<div class="relative">${optionsDropdown}<button class="chat-options-btn opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-slate-800 transition-opacity">&vellip;</button></div>` : ''}</div></div>`;
    }

    function createPollHTML(post) {
        if (!post.poll) return '';
        const poll = post.poll;
        const totalVotes = poll.options.reduce((acc, option) => acc + option.votes.length, 0);
        const userHasVoted = currentUser && poll.options.some(option => option.votes.includes(currentUser.email));
        const optionsHTML = poll.options.map((option, index) => {
            const votes = option.votes.length;
            const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(0) : 0;
            const isVotedFor = currentUser && option.votes.includes(currentUser.email);
            if (userHasVoted) {
                return `<div class="relative w-full bg-slate-800 rounded-lg p-2.5 text-sm font-medium text-white overflow-hidden"><div class="absolute top-0 left-0 h-full bg-sky-500/30" style="width: ${percentage}%;"></div><div class="relative flex justify-between"><span class="font-semibold ${isVotedFor ? 'text-sky-300' : ''}">${sanitize(option.text)} ${isVotedFor ? '&check;' : ''}</span><span>${percentage}%</span></div></div>`;
            } else {
                return `<button data-poll-option-index="${index}" class="poll-option-btn w-full text-left bg-slate-800 border border-slate-700 hover:border-sky-500 rounded-lg p-2.5 text-sm font-medium text-white transition-colors">${sanitize(option.text)}</button>`;
            }
        }).join('');
        return `<div class="mt-4 p-4 border border-slate-700 rounded-lg" data-poll-id="${post.id}"><div class="space-y-3">${optionsHTML}</div><p class="text-xs text-slate-500 mt-3">${totalVotes} vote${totalVotes !== 1 ? 's' : ''} &middot; ${userHasVoted ? "You've voted" : "Poll"}</p></div>`;
    }

    function createPostCardHTML(post, options = {}) {
        const { isStatic = false } = options;
        const authorUser = users[post.authorEmail] || { name: post.author, picture: null, email: null };
        const isOwnPost = (post.authorEmail === currentUser?.email);
        const authorActionAttr = isOwnPost ? `data-target="page-profile"` : (post.authorEmail ? `data-user-email="${sanitize(post.authorEmail)}"` : '');
        const authorClass = post.authorEmail && !isOwnPost ? 'view-user-profile-btn' : '';
        const AuthorWrapper = post.authorEmail ? 'a' : 'div';
        const authorInfoHTML = `<${AuthorWrapper} href="#" class="${authorClass} flex items-center gap-3" ${authorActionAttr}>${authorUser.picture ? `<div class="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden"><img src="${authorUser.picture}" alt="${sanitize(post.author)}" class="avatar-img"></div>` : `<div class="w-10 h-10 rounded-full flex-shrink-0 bg-pink-500 flex items-center justify-center text-white font-bold text-lg">${sanitize(post.author).charAt(0)}</div>`}<div class="flex-grow"><p class="font-semibold text-white">${sanitize(post.author)}</p><p class="text-xs text-slate-500">${post.timestamp}</p></div></${AuthorWrapper}>`;
        const categoryStyles = {'Recruitment': 'bg-blue-500/10 text-blue-400', 'Need Advice': 'bg-yellow-500/10 text-yellow-400', 'Promotion': 'bg-purple-500/10 text-purple-400', 'Awareness': 'bg-green-500/10 text-green-400', 'Discussion': 'bg-teal-500/10 text-teal-400', 'Achievements': 'bg-orange-500/10 text-orange-400', 'Event': 'bg-indigo-500/10 text-indigo-400'};
        const categoryTag = post.category ? `<span class="text-xs font-semibold px-2.5 py-1 rounded-full ${categoryStyles[post.category] || 'bg-slate-700 text-slate-300'}">${sanitize(post.category)}</span>` : '';
        const tagsHTML = post.tags && post.tags.length > 0 ? `<div class="mt-4 flex flex-wrap gap-2">${post.tags.map(tag => `<a href="#" class="post-tag text-xs font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full hover:bg-sky-500/20" data-tag="${sanitize(tag)}">#${sanitize(tag)}</a>`).join('')}</div>` : '';
        let pollHTML = createPollHTML(post);
        let eventDetailsHTML = '', eventRsvpHTML = '';
        if (post.category === 'Event' && post.eventDate) {
             eventDetailsHTML = `<div class="mt-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-3"><div class="flex items-center gap-3 text-sm"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> <span class="font-semibold text-white">${new Date(post.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</span></div><div class="flex items-center gap-3 text-sm"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> <span class="font-semibold text-white">${post.eventTime}</span></div><div class="flex items-center gap-3 text-sm"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> <span class="font-semibold text-white">${sanitize(post.eventLocation)}</span></div></div>`;
            const att = post.attendance;
            const userStatus = ['going', 'maybe', 'notGoing'].find(s => att[s].includes(currentUser?.email));
            eventRsvpHTML = `<div class="mt-4 border-t border-slate-800 pt-4"><div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div class="flex items-center space-x-2"><button data-rsvp="going" class="rsvp-btn text-sm font-semibold px-4 py-1.5 rounded-full border border-slate-700 hover:border-sky-500 transition ${userStatus === 'going' ? 'active' : ''}">Going</button><button data-rsvp="maybe" class="rsvp-btn text-sm font-semibold px-4 py-1.5 rounded-full border border-slate-700 hover:border-sky-500 transition ${userStatus === 'maybe' ? 'active' : ''}">Maybe</button><button data-rsvp="notGoing" class="rsvp-btn text-sm font-semibold px-4 py-1.5 rounded-full border border-slate-700 hover:border-sky-500 transition ${userStatus === 'notGoing' ? 'active' : ''}">Not Going</button></div><div class="text-sm text-slate-400 font-medium">${att.going.length > 0 ? `<span>${att.going.length} Going</span>` : ''}${att.maybe.length > 0 ? `<span class="ml-3">${att.maybe.length} Maybe</span>` : ''}</div></div></div>`;
        }
        const imageHTML = post.imageSrc ? `<img src="${post.imageSrc}" class="rounded-lg w-full object-cover max-h-96 border border-slate-800 mt-4">` : '';
        let menuItems = '';
        if (isOwnPost && !isStatic) {
            menuItems += `<li><button class="edit-post-btn w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700/50 rounded-md">Edit</button></li><li><button class="delete-post-btn w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-slate-700/50 rounded-md">Delete</button></li>`;
        } else if (!isOwnPost) {
             menuItems += `<li><button class="report-btn w-full text-left px-3 py-1.5 text-sm text-yellow-400 hover:bg-slate-700/50 rounded-md" data-content-id="${post.id}" data-content-type="post">Report</button></li>`;
        }
        const optionsMenu = menuItems ? `<div class="relative flex-shrink-0"><button class="post-options-btn p-2 rounded-full hover:bg-slate-800"><svg class="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg></button><div class="options-dropdown hidden w-32"><ul class="py-1">${menuItems}</ul></div></div>` : '';
        const totalComments = post.comments.reduce((count, comment) => count + 1 + (comment.replies ? comment.replies.length : 0), 0);
        const footerControls = isStatic ? '' : `<div class="flex items-center justify-between text-slate-400 mt-4 border-t border-slate-800 pt-4"><div class="flex items-center gap-1"><button class="upvote-btn p-2 rounded-full hover:bg-slate-800 transition-colors ${post.voteState === 'upvoted' ? 'text-green-500' : ''}"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg></button><span class="font-semibold text-white text-sm vote-count">${post.voteCount}</span><button class="downvote-btn p-2 rounded-full hover:bg-slate-800 transition-colors ${post.voteState === 'downvoted' ? 'text-red-500' : ''}"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button></div><button class="view-comments-btn flex items-center gap-2 p-2 rounded-full hover:bg-slate-800 hover:text-sky-400"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg><span class="font-semibold text-sm comment-count">${totalComments}</span></button><button class="p-2 rounded-full hover:bg-slate-800 hover:text-sky-400"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path></svg></button></div>`;
        return `<div class="post-card bg-slate-900/50 p-6 md:p-8 rounded-xl border border-slate-800" data-post-id="${post.id}"><div class="flex justify-between items-start"><div class="flex items-center gap-3 flex-grow min-w-0">${authorInfoHTML}</div>${optionsMenu}</div><div class="mt-4"><div class="flex items-center gap-3 mb-3"><h4 class="text-xl font-bold text-white post-title">${sanitize(post.title)}</h4>${categoryTag}</div><p class="text-slate-400 whitespace-pre-wrap post-content">${sanitize(post.content)}</p>${pollHTML}${eventDetailsHTML}${imageHTML}${tagsHTML}</div>${post.category === 'Event' ? eventRsvpHTML : ''}${footerControls}</div>`;
    }

    function createPostEditFormHTML(post) {
        const createCategoryOptions = (selectedCategory) => {
            const categories = ['Recruitment', 'Need Advice', 'Promotion', 'Awareness', 'Discussion', 'Achievements', 'Event'];
            return categories.map(cat => `<option value="${cat}" ${selectedCategory === cat ? 'selected' : ''}>${cat}</option>`).join('');
        };
        const tagsValue = post.tags ? post.tags.join(', ') : '';
        return `<div class="p-6 md:p-8"><div class="space-y-4"><p class="text-sm text-slate-500">Editing Post...</p><div><label class="text-sm font-medium text-slate-300">Title</label><input type="text" class="edit-post-title w-full bg-slate-800 border border-slate-700 rounded-lg p-2 mt-1 text-sm text-white" value="${sanitize(post.title)}"></div><div><label class="text-sm font-medium text-slate-300">Category</label><select class="edit-post-category w-full bg-slate-800 border border-slate-700 rounded-lg p-2 mt-1 text-sm text-white">${createCategoryOptions(post.category)}</select></div><div><label class="text-sm font-medium text-slate-300">Content</label><textarea rows="5" class="edit-post-content w-full bg-slate-800 border border-slate-700 rounded-lg p-2 mt-1 text-sm text-white">${sanitize(post.content)}</textarea></div><div><label class="text-sm font-medium text-slate-300">Tags (comma-separated)</label><input type="text" class="edit-post-tags w-full bg-slate-800 border border-slate-700 rounded-lg p-2 mt-1 text-sm text-white" value="${sanitize(tagsValue)}"></div><div class="flex justify-end gap-2"><button class="cancel-post-edit-btn font-semibold text-slate-300 px-4 py-1.5 rounded-full hover:bg-slate-800">Cancel</button><button class="save-post-edit-btn bg-sky-500 text-white font-semibold px-4 py-1.5 rounded-full hover:bg-sky-600">Save Changes</button></div></div></div>`;
    }

    function createLostFoundCardHTML(item) {
        const authorUser = users[item.authorEmail] || { name: item.author, picture: null, email: null };
        const isOwnItem = (item.authorEmail === currentUser?.email);
        const authorActionAttr = isOwnItem ? `data-target="page-profile"` : (item.authorEmail ? `data-user-email="${sanitize(item.authorEmail)}"` : '');
        const authorClass = item.authorEmail && !isOwnItem ? 'view-user-profile-btn' : '';
        const AuthorWrapper = item.authorEmail ? 'a' : 'div';
        const authorInfoHTML = `<${AuthorWrapper} href="#" class="${authorClass} flex items-center gap-3" ${authorActionAttr}>${authorUser.picture ? `<div class="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden"><img src="${authorUser.picture}" alt="${sanitize(item.author)}" class="avatar-img"></div>` : `<div class="w-10 h-10 rounded-full flex-shrink-0 bg-indigo-500 flex items-center justify-center text-white font-bold text-lg">${sanitize(item.author).charAt(0)}</div>`}<div class="flex-grow"><p class="font-semibold text-white">${sanitize(item.author)}</p><p class="text-xs text-slate-500">${item.timestamp}</p></div></${AuthorWrapper}>`;
        const statusBadge = item.status === 'Lost' ? `<span class="text-sm font-semibold text-red-400 bg-red-500/10 px-3 py-1 rounded-full">Lost</span>` : `<span class="text-sm font-semibold text-green-400 bg-green-500/10 px-3 py-1 rounded-full">Found</span>`;
        const imageHTML = item.imageSrc ? `<img src="${item.imageSrc}" class="rounded-lg w-full h-48 object-cover border border-slate-800 mt-4">` : '';
        const ownerControls = currentUser && item.authorEmail === currentUser.email ? `<div class="relative flex-shrink-0"><button class="lf-options-btn p-2 rounded-full hover:bg-slate-800"><svg class="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg></button><div class="options-dropdown hidden w-32"><ul class="py-1"><li><button class="edit-lf-btn w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700/50 rounded-md">Edit</button></li><li><button class="delete-lf-btn w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-slate-700/50 rounded-md">Delete</button></li></ul></div></div>` : '';
        return `<div class="lf-card bg-slate-900 p-8 rounded-xl border border-slate-800 flex flex-col" data-lf-id="${item.id}"><div class="flex justify-between items-start"><div class="flex items-center gap-3 flex-grow min-w-0">${authorInfoHTML}</div>${ownerControls}</div><div class="flex-grow mt-4"><div class="flex justify-between items-center mb-2"><h4 class="text-xl font-bold text-white">${sanitize(item.name)}</h4>${statusBadge}</div><p class="text-slate-400 whitespace-pre-wrap mb-4">${sanitize(item.description)}</p>${imageHTML}</div><button class="mt-auto w-full shiny-button relative overflow-hidden bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-full">Contact Poster</button></div>`;
    }

    function createLFEditFormHTML(item) {
        return `<div class="p-8"><div class="space-y-4"><p class="text-sm text-slate-500">Editing Item...</p><div><label class="text-sm font-medium text-slate-300">Item Name</label><input type="text" class="edit-lf-name w-full bg-slate-800 border border-slate-700 rounded-lg p-2 mt-1 text-sm text-white" value="${sanitize(item.name)}"></div><div><label class="text-sm font-medium text-slate-300">Status</label><select class="edit-lf-status w-full bg-slate-800 border border-slate-700 rounded-lg p-2 mt-1 text-sm text-white"><option ${item.status === 'Lost' ? 'selected' : ''}>Lost</option><option ${item.status === 'Found' ? 'selected' : ''}>Found</option></select></div><div><label class="text-sm font-medium text-slate-300">Description</label><textarea rows="4" class="edit-lf-description w-full bg-slate-800 border border-slate-700 rounded-lg p-2 mt-1 text-sm text-white">${sanitize(item.description)}</textarea></div><div class="flex justify-end gap-2"><button class="cancel-lf-edit-btn font-semibold text-slate-300 px-4 py-1.5 rounded-full hover:bg-slate-800">Cancel</button><button class="save-lf-edit-btn bg-indigo-500 text-white font-semibold px-4 py-1.5 rounded-full hover:bg-indigo-600">Save</button></div></div></div>`;
    }

    function createCommentHTML(comment) {
         const authorUser = users[comment.authorEmail] || {};
         const isOwnComment = (comment.authorEmail === currentUser?.email);
         const authorActionAttr = isOwnComment ? `data-target="page-profile"` : (comment.authorEmail ? `data-user-email="${sanitize(comment.authorEmail)}"` : '');
         const authorClass = comment.authorEmail && !isOwnComment ? 'view-user-profile-btn' : '';
         const AuthorWrapper = comment.authorEmail ? 'a' : 'div';
         const avatarHTML = `<${AuthorWrapper} href="#" class="block w-full h-full ${authorClass}" ${authorActionAttr}>${authorUser.picture ? `<img src="${authorUser.picture}" alt="${authorUser.name}" class="avatar-img">` : `<div class="w-full h-full bg-pink-500"></div>`}</${AuthorWrapper}>`;
         const authorNameHTML = `<${AuthorWrapper} href="#" class="${authorClass}" ${authorActionAttr}><p class="text-white font-semibold text-sm inline-block">${sanitize(comment.author)}</p></${AuthorWrapper}>`;
         const containerClass = comment.parentId ? 'reply' : 'comment';
         const repliesHTML = comment.replies?.map(createCommentHTML).join('') || '';
         const ownerControls = currentUser && comment.authorEmail === currentUser.email ? `<button class="edit-comment-btn font-semibold hover:text-white">Edit</button><button class="delete-comment-btn font-semibold hover:text-white">Delete</button>` : `<button class="report-btn font-semibold hover:text-white text-yellow-400" data-content-id="${comment.id}" data-content-type="comment">Report</button>`;
         return `<div class="${containerClass} flex items-start space-x-3 relative" data-comment-id="${comment.id}"><div class="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">${avatarHTML}</div><div class="flex-grow">${authorNameHTML}<p class="comment-text text-slate-400 text-sm mt-1 whitespace-pre-wrap">${sanitize(comment.text).replace(/\n/g, '<br>')}</p><div class="flex items-center space-x-4 text-xs text-slate-500 mt-2"><span class="timestamp">${comment.timestamp}</span><button class="like-comment-btn font-semibold hover:text-white flex items-center gap-1 ${comment.isLiked ? 'liked' : ''}"><span>${comment.isLiked ? 'Liked' : 'Like'}</span>(<span class="like-count">${comment.likeCount}</span>)</button><button class="reply-comment-btn font-semibold hover:text-white">Reply</button>${ownerControls}</div><div class="replies-container mt-4 ml-6 space-y-4 border-l-2 border-slate-800 pl-4">${repliesHTML}</div></div></div>`;
    }
    
    function createReplyFormHTML() {
         const avatarHTML = currentUser?.picture ? `<img src="${currentUser.picture}" alt="${currentUser.name}" class="avatar-img">` : `<div class="w-full h-full bg-slate-700"></div>`;
        return `<div class="reply-form flex items-start space-x-3 mt-4"><div class="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">${avatarHTML}</div><div class="flex-grow"><textarea class="reply-textarea w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" rows="2" placeholder="Write a reply..."></textarea><div class="text-right"><button class="submit-reply-btn mt-2 bg-sky-500 text-white text-xs font-semibold px-3 py-1 rounded-full hover:bg-sky-600">Reply</button></div></div></div>`;
    }

    // --- Admin Panel Logic ---
    function renderAdminPanel() {
        const container = document.getElementById('admin-reported-content');
        const pendingReports = Object.values(reportedContent).filter(r => r.status === 'pending').sort().reverse();

        if (pendingReports.length === 0) {
            container.innerHTML = `<p class="text-slate-500 text-center bg-slate-900/50 p-8 rounded-xl border border-slate-800">No pending reports. Great job!</p>`;
            return;
        }

        container.innerHTML = pendingReports.map(report => {
            let contentHTML = '<div class="p-4 bg-slate-800 rounded-md"><p class="text-slate-500 italic">[Content not found or deleted]</p></div>';
            let originalContent;

            if (report.contentType === 'post' && postsData[report.contentId]) {
                originalContent = postsData[report.contentId];
                contentHTML = `<div class="p-4 bg-slate-800 rounded-md border border-slate-700">
                    <p class="font-bold text-white">${sanitize(originalContent.title)}</p>
                    <p class="text-sm text-slate-400 mt-1">${sanitize(originalContent.content)}</p>
                    <p class="text-xs text-slate-500 mt-2">Posted by: ${sanitize(originalContent.author)}</p>
                </div>`;
            } else if (report.contentType === 'comment') {
                for (const post of Object.values(postsData)) {
                    originalContent = findCommentById(post.comments, report.contentId);
                    if (originalContent) break;
                }
                if (originalContent) {
                    contentHTML = `<div class="p-4 bg-slate-800 rounded-md border border-slate-700">
                        <p class="text-sm text-slate-400">${sanitize(originalContent.text)}</p>
                        <p class="text-xs text-slate-500 mt-2">Comment by: ${sanitize(originalContent.author)}</p>
                    </div>`;
                }
            }

            return `<div class="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                    <p class="text-sm">Reported by: <span class="font-semibold text-slate-300">${report.reporterEmail}</span> at <span class="text-slate-400">${report.timestamp}</span></p>
                    <p class="text-sm">Reason: <span class="font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">${report.reason}</span></p>
                </div>
                ${contentHTML}
                <div class="flex justify-end gap-3 mt-4">
                    <button class="dismiss-report-btn text-sm font-semibold text-slate-300 px-4 py-1.5 rounded-full hover:bg-slate-700 transition-colors" data-report-id="${report.id}">Dismiss Report</button>
                    <button class="delete-content-btn text-sm font-semibold text-white bg-red-600 px-4 py-1.5 rounded-full hover:bg-red-700 transition-colors" data-report-id="${report.id}" data-content-id="${report.contentId}" data-content-type="${report.contentType}">Delete Content & Resolve</button>
                </div>
            </div>`;
        }).join('');
    }

    document.getElementById('page-admin').addEventListener('click', e => {
        const target = e.target;
        if (target.closest('.dismiss-report-btn')) {
            const reportId = target.closest('.dismiss-report-btn').dataset.reportId;
            if (reportedContent[reportId]) {
                reportedContent[reportId].status = 'resolved';
                saveData();
                renderAdminPanel();
            }
        }

        if (target.closest('.delete-content-btn')) {
            const btn = target.closest('.delete-content-btn');
            const reportId = btn.dataset.reportId;
            const contentId = btn.dataset.contentId;
            const contentType = btn.dataset.contentType;

            if (contentType === 'post' && postsData[contentId]) {
                delete postsData[contentId];
            } else if (contentType === 'comment') {
                for (const post of Object.values(postsData)) {
                    if (deleteCommentById(post.comments, contentId)) break;
                }
            }
            if (reportedContent[reportId]) {
                 reportedContent[reportId].status = 'resolved';
            }
            saveData();
            renderAdminPanel();
        }
    });

    // --- Initial Data functions ---
    function initializeUsers() {
        if (!users['admin@community.hub']) {
            users['admin@community.hub'] = { name: 'Admin', username: 'admin', email: 'admin@community.hub', password: 'password', picture: null, role: 'admin' };
        }
        if (!users['david@example.com']) {
            users['david@example.com'] = { name: 'David Lee', username: 'david_lee', email: 'david@example.com', password: 'password', picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200', role: 'user' };
        }
    }
    function initializePosts() {
        const firstPostId = 'post-initial';
        if (!postsData[firstPostId]) {
            postsData[firstPostId] = {
                id: firstPostId, title: 'Welcome to the Community Hub!', content: 'This is the place to connect with your neighbors. Feel free to create a new post to share news, ask questions, or organize events. Let\'s build a great community together!', 
                category: 'Awareness',
                tags: ['welcome', 'community'],
                imageSrc: null, timestamp: 'Aug 28, 9:00 AM', author: 'Admin', authorEmail: 'admin@community.hub', voteState: 'none', voteCount: 12,
                comments: [{ id: 'comment-initial-1', parentId: null, text: 'This is a great idea! Looking forward to connecting with everyone.', author: 'David Lee', authorEmail: 'david@example.com', timestamp: 'Aug 29, 10:45 PM', isLiked: true, likeCount: 5, replies: [] }]
            };
        }
    }
    
    function initializeLostAndFound() {
        const firstLFId = 'lf-initial';
        if (!lostFoundData[firstLFId]) {
            lostFoundData[firstLFId] = { id: firstLFId, name: 'Golden Retriever Puppy', status: 'Found', description: 'Found this friendly puppy near the park entrance. It has a blue collar but no tag. Let\'s find its owner!', imageSrc: 'https://images.unsplash.com/photo-1593482181189-86c3538435f3?q=80&w=800', author: 'Admin', authorEmail: 'admin@community.hub', timestamp: 'Aug 30, 2:15 PM' };
        }
    }

    function initializeChat() {
        if(Object.keys(chatData).length === 0) {
            chatData = {
                'user-0': { name: 'Saved Messages', avatarColor: 'bg-sky-500', lastMessage: 'Messages saved here are only visible to you.', timestamp: 'Now', messages: [{ id: 'msg-init-1', sender: 'them', text: 'This is your personal space.', isEdited: false, isDeleted: false, replyTo: null, deletedFor: [] }] },
                'user-1': { name: 'Alice Johnson', avatarColor: 'bg-pink-500', lastMessage: 'I found a set of keys near the park, are they yours?', timestamp: '2:30 PM', messages: [{ id: 'msg-init-2', sender: 'them', text: 'I found a set of keys near the park, are they yours?', isEdited: false, isDeleted: false, replyTo: null, deletedFor: [] }] }
            };
        }
    }
    
    // --- Theme Toggle Logic ---
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const body = document.body;
    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>`;

    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('light-theme');
        const isLight = body.classList.contains('light-theme');
        localStorage.setItem('communityHubTheme', isLight ? 'light' : 'dark');
        themeToggleBtn.innerHTML = isLight ? moonIcon : sunIcon;
    });

    function initializeTheme() {
        const savedTheme = localStorage.getItem('communityHubTheme');
        if (savedTheme === 'light') {
            body.classList.add('light-theme');
            themeToggleBtn.innerHTML = moonIcon;
        } else {
            body.classList.remove('light-theme');
            themeToggleBtn.innerHTML = sunIcon;
        }
    }
    
    // --- Kick it off ---
    loadData();
    initializeTheme();
    checkLoginState();
});
