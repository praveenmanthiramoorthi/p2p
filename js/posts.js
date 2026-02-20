/**
 * P2P Posts Module — CRUD, filtering, detail view, answers
 */
const Posts = {
    allPosts: [],
    currentFilter: 'all',
    currentPage: 'home',
    currentPostId: null,
    unsubscribers: [],

    init() {
        this.bindCreateButtons();
        this.bindModal();
        this.bindReportModal();
        this.bindFilterTabs();
        this.bindSearch();
        this.loadPosts();
        this.loadAnnouncement();
    },

    async loadAnnouncement() {
        try {
            // Check for most recent announcement
            const snap = await db.collection('announcements').orderBy('createdAt', 'desc').limit(1).get();
            if (!snap.empty) {
                const data = snap.docs[0].data();
                const el = document.getElementById('announcement-text');
                if (el) el.textContent = data.text;
            }
        } catch (e) {
            console.error('Announcement load error:', e);
        }
    },

    bindCreateButtons() {
        const openModal = (cat) => {
            document.getElementById('create-post-modal').style.display = 'flex';
            if (cat) document.getElementById('post-category').value = cat;
        };
        document.getElementById('create-post-home-btn')?.addEventListener('click', () => openModal(''));
        document.getElementById('create-first-post-btn')?.addEventListener('click', () => openModal(''));
        document.getElementById('create-qa-btn')?.addEventListener('click', () => openModal('qa'));
        document.getElementById('create-market-btn')?.addEventListener('click', () => openModal(''));
        document.getElementById('create-lf-btn')?.addEventListener('click', () => openModal(''));
        document.getElementById('create-teamup-btn')?.addEventListener('click', () => openModal('teamup'));
    },

    bindModal() {
        const modal = document.getElementById('create-post-modal');
        const close = () => {
            modal.style.display = 'none';
            document.getElementById('create-post-form').reset();
            document.getElementById('upload-preview').style.display = 'none';
            document.getElementById('upload-placeholder').style.display = 'block';
            document.getElementById('title-char-count').textContent = '0';
            document.getElementById('desc-char-count').textContent = '0';
        };
        document.getElementById('modal-close-btn')?.addEventListener('click', close);
        document.getElementById('modal-cancel-btn')?.addEventListener('click', close);
        modal?.addEventListener('click', e => { if (e.target === modal) close(); });

        // Char counters
        document.getElementById('post-title')?.addEventListener('input', e => {
            document.getElementById('title-char-count').textContent = e.target.value.length;
        });
        document.getElementById('post-description')?.addEventListener('input', e => {
            document.getElementById('desc-char-count').textContent = e.target.value.length;
        });

        // Image preview
        document.getElementById('post-image')?.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > APP_CONFIG.maxImageSize) {
                Utils.showToast('Image must be under 5MB', 'warning');
                e.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = ev => {
                document.getElementById('upload-preview').src = ev.target.result;
                document.getElementById('upload-preview').style.display = 'block';
                document.getElementById('upload-placeholder').style.display = 'none';
            };
            reader.readAsDataURL(file);
        });

        // Submit
        document.getElementById('create-post-form')?.addEventListener('submit', e => {
            e.preventDefault();
            this.createPost();
        });
    },

    bindReportModal() {
        const modal = document.getElementById('report-modal');
        const close = () => { modal.style.display = 'none'; };
        document.querySelectorAll('.report-modal-close').forEach(b => b.addEventListener('click', close));
        modal?.addEventListener('click', e => { if (e.target === modal) close(); });
        document.getElementById('report-form')?.addEventListener('submit', e => {
            e.preventDefault();
            this.submitReport();
        });
    },

    bindFilterTabs() {
        document.querySelectorAll('.filter-tabs').forEach(container => {
            container.addEventListener('click', e => {
                const tab = e.target.closest('.filter-tab');
                if (!tab) return;
                container.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentFilter = tab.dataset.filter;
                this.renderPosts();
            });
        });
    },

    bindSearch() {
        let timer;
        document.getElementById('search-input')?.addEventListener('input', e => {
            clearTimeout(timer);
            timer = setTimeout(() => this.renderPosts(e.target.value.trim().toLowerCase()), 300);
        });
    },

    async loadPosts() {
        // Clean up previous listeners if any
        this.cleanup();

        // Real-time listener
        const unsub = db.collection('posts')
            .orderBy('createdAt', 'desc')
            .limit(APP_CONFIG.postsPerPage * 5)
            .onSnapshot(snapshot => {
                this.allPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                this.renderPosts();
            }, err => {
                console.error('Posts load error:', err);
                // Even on error, hide skeletons so user isn't stuck
                this.forceHideSkeletons();
                if (err.code === 'permission-denied') {
                    console.warn('Access denied. Please sign in to view posts.');
                } else {
                    Utils.showToast('Failed to load posts', 'error');
                }
            });
        this.unsubscribers.push(unsub);

        // Safety: Hide skeletons after 5s regardless (fallback for slow connections)
        setTimeout(() => this.forceHideSkeletons(), 5000);
    },

    forceHideSkeletons() {
        ['home', 'qa', 'marketplace', 'lostfound', 'teamup', 'my-posts'].forEach(p => {
            const el = document.getElementById(p + '-loading');
            if (el) el.style.display = 'none';
        });
        // If no posts were loaded, show empty states
        if (this.allPosts.length === 0) {
            this.renderPosts();
        }
    },

    getFilteredPosts(search = '') {
        let posts = [...this.allPosts];
        // Filter by current page category
        const pageFilters = {
            qa: ['qa'],
            marketplace: ['sell', 'buy', 'need'],
            lostfound: ['lost', 'found'],
            teamup: ['teamup']
        };
        if (pageFilters[this.currentPage]) {
            posts = posts.filter(p => pageFilters[this.currentPage].includes(p.category));
        }
        // Hide reported or hidden posts from regular users
        posts = posts.filter(p => p.status !== 'reported' && p.status !== 'hidden');

        // Apply tab filter
        if (this.currentFilter && this.currentFilter !== 'all') {
            posts = posts.filter(p => p.category === this.currentFilter);
        }
        // Apply search
        if (search) {
            posts = posts.filter(p =>
                (p.title || '').toLowerCase().includes(search) ||
                (p.description || '').toLowerCase().includes(search) ||
                (p.authorName || '').toLowerCase().includes(search)
            );
        }
        return posts;
    },

    renderPosts(search = '') {
        const pages = ['home', 'qa', 'marketplace', 'lostfound', 'teamup', 'my-posts'];
        pages.forEach(page => {
            let gridId, emptyId;
            if (page === 'home') { gridId = 'home-posts-grid'; emptyId = 'home-empty'; }
            else if (page === 'qa') { gridId = 'qa-posts-grid'; emptyId = 'qa-empty'; }
            else if (page === 'marketplace') { gridId = 'market-posts-grid'; emptyId = 'market-empty'; }
            else if (page === 'lostfound') { gridId = 'lf-posts-grid'; emptyId = 'lf-empty'; }
            else if (page === 'teamup') { gridId = 'teamup-posts-grid'; emptyId = 'teamup-empty'; }
            else if (page === 'my-posts') { gridId = 'my-posts-grid'; emptyId = 'my-posts-empty'; }
            const grid = document.getElementById(gridId);
            const empty = document.getElementById(emptyId);
            const loading = document.getElementById(page + '-loading');

            if (!grid) return;

            // Hide loading skeleton once we have a response
            if (loading) loading.style.display = 'none';

            const savedPage = this.currentPage;
            this.currentPage = page;
            let posts;
            if (page === 'my-posts') {
                posts = this.allPosts.filter(p => p.authorId === Auth.currentUser?.uid);
            } else {
                posts = this.getFilteredPosts(search);
            }
            this.currentPage = savedPage;
            if (posts.length === 0) {
                grid.innerHTML = '';
                if (empty) empty.style.display = 'flex';
            } else {
                if (empty) empty.style.display = 'none';
                grid.innerHTML = posts.map(p => this.renderPostCard(p)).join('');
            }
        });
        // Bind card clicks
        document.querySelectorAll('.post-card').forEach(card => {
            card.addEventListener('click', e => {
                if (e.target.closest('.post-card-actions-btn') || e.target.closest('.post-card-dropdown') || e.target.closest('.post-card-msg-btn')) return;
                this.showPostDetail(card.dataset.id);
            });
        });
        // Bind action menus
        document.querySelectorAll('.post-card-actions-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const dd = btn.nextElementSibling;
                document.querySelectorAll('.post-card-dropdown.show').forEach(d => { if (d !== dd) d.classList.remove('show'); });
                dd.classList.toggle('show');
            });
        });
        // Bind message buttons
        document.querySelectorAll('.post-card-msg-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const postId = btn.closest('.post-card').dataset.id;
                const post = this.allPosts.find(p => p.id === postId);
                if (post && post.authorId !== Auth.currentUser?.uid) {
                    Chat.startConversation(post.authorId, post.authorName);
                }
            });
        });
        // Bind report buttons
        document.querySelectorAll('.report-post-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('report-post-id').value = btn.dataset.id;
                document.getElementById('report-modal').style.display = 'flex';
            });
        });
        // Bind delete buttons
        document.querySelectorAll('.delete-post-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deletePost(btn.dataset.id));
        });
        // Close dropdowns on outside click
        document.addEventListener('click', () => {
            document.querySelectorAll('.post-card-dropdown.show').forEach(d => d.classList.remove('show'));
        });
    },

    renderPostCard(post) {
        const isOwner = post.authorId === Auth.currentUser?.uid;
        const initials = Utils.getInitials(post.authorName);
        return `
      <div class="post-card" data-id="${post.id}" data-category="${post.category}">
        <div class="post-card-header">
          <div class="post-card-meta">
            <div class="post-card-avatar">${initials}</div>
            <div>
              <div class="post-card-author">${Utils.escapeHtml(post.authorName)}</div>
              <div class="post-card-time">${Utils.timeAgo(post.createdAt)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="category-badge ${post.category}">${Utils.getCategoryLabel(post.category)}</span>
            <div style="position:relative;">
              <button class="post-card-actions-btn" aria-label="Actions">⋮</button>
              <div class="post-card-dropdown">
                ${isOwner ? `<button class="delete-post-btn danger" data-id="${post.id}">🗑 Delete</button>` : ''}
                <button class="report-post-btn" data-id="${post.id}">🚩 Report</button>
              </div>
            </div>
          </div>
        </div>
        ${post.imageURL ? `<img class="post-card-image" src="${post.imageURL}" alt="${Utils.escapeHtml(post.title)}" loading="lazy" />` : ''}
        <div class="post-card-title">${Utils.escapeHtml(post.title)}</div>
        <div class="post-card-desc">${Utils.escapeHtml(post.description)}</div>
        <div class="post-card-footer">
          <div class="post-card-footer-left">
            <span class="status-badge ${post.status || 'active'}">${post.status === 'resolved' ? '✓ Resolved' : '● Active'}</span>
            ${post.category === 'qa' ? `<span class="post-card-stat">💬 ${post.answerCount || 0} answers</span>` : ''}
          </div>
          ${!isOwner ? `<button class="post-card-msg-btn">💬 Message</button>` : ''}
        </div>
      </div>
    `;
    },

    async createPost() {
        const btn = document.getElementById('modal-submit-btn');
        const category = document.getElementById('post-category').value;
        const title = document.getElementById('post-title').value.trim();
        const description = document.getElementById('post-description').value.trim();
        const imageFile = document.getElementById('post-image').files[0];
        if (!category || !title || !description) { Utils.showToast('Fill in all required fields', 'warning'); return; }
        Utils.setLoading(btn, true);
        try {
            let imageURL = '';
            if (imageFile) {
                const ref = storage.ref(`posts/${Date.now()}_${imageFile.name}`);
                await ref.put(imageFile);
                imageURL = await ref.getDownloadURL();
            }
            await db.collection('posts').add({
                category, title, description, imageURL,
                authorId: Auth.currentUser.uid,
                authorName: Auth.userProfile.fullName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active',
                helpfulAnswerId: null,
                answerCount: 0
            });
            document.getElementById('create-post-modal').style.display = 'none';
            document.getElementById('create-post-form').reset();
            document.getElementById('upload-preview').style.display = 'none';
            document.getElementById('upload-placeholder').style.display = 'block';
            Utils.showToast('Post published! 🚀', 'success');
        } catch (err) {
            console.error(err);
            Utils.showToast('Failed to create post', 'error');
        }
        Utils.setLoading(btn, false);
    },

    async deletePost(postId) {
        if (!confirm('Delete this post? This cannot be undone.')) return;
        try {
            await db.collection('posts').doc(postId).delete();
            Utils.showToast('Post deleted', 'info');
            if (this.currentPostId === postId) App.navigateTo(this.currentPage || 'home');
        } catch (err) {
            Utils.showToast('Failed to delete post', 'error');
        }
    },

    async submitReport() {
        const postId = document.getElementById('report-post-id').value;
        const reason = document.getElementById('report-reason').value;
        const details = document.getElementById('report-details').value.trim();
        if (!reason) { Utils.showToast('Select a reason', 'warning'); return; }
        try {
            await db.collection('reports').add({
                postId, reason, details,
                reporterId: Auth.currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            // Update post status to hide it
            await db.collection('posts').doc(postId).update({
                status: 'reported',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            document.getElementById('report-modal').style.display = 'none';
            document.getElementById('report-form').reset();
            Utils.showToast('Report submitted. Our team will review it.', 'success');
        } catch (err) {
            Utils.showToast('Failed to submit report', 'error');
        }
    },

    async showPostDetail(postId) {
        this.currentPostId = postId;
        App.showSection('page-post-detail');
        const container = document.getElementById('post-detail-container');
        container.innerHTML = '<div class="skeleton-card" style="height:400px;"></div>';
        try {
            const doc = await db.collection('posts').doc(postId).get();
            if (!doc.exists) { Utils.showToast('Post not found', 'error'); App.navigateTo('home'); return; }
            const post = { id: doc.id, ...doc.data() };
            const isOwner = post.authorId === Auth.currentUser?.uid;
            const initials = Utils.getInitials(post.authorName);
            let answerHtml = '';
            if (post.category === 'qa') {
                answerHtml = await this.renderAnswersSection(post);
            }
            container.innerHTML = `
        <button class="post-detail-back" id="detail-back-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div class="post-detail-card">
          <div class="post-detail-header">
            <div class="post-card-header">
              <div class="post-card-meta">
                <div class="post-card-avatar">${initials}</div>
                <div>
                  <div class="post-card-author">${Utils.escapeHtml(post.authorName)}</div>
                  <div class="post-card-time">${Utils.timeAgo(post.createdAt)}</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="category-badge ${post.category}">${Utils.getCategoryLabel(post.category)}</span>
                <span class="status-badge ${post.status || 'active'}">${post.status === 'resolved' ? '✓ Resolved' : '● Active'}</span>
              </div>
            </div>
          </div>
          <div class="post-detail-body">
            <h2 style="margin-bottom:var(--space-md);">${Utils.escapeHtml(post.title)}</h2>
            ${post.imageURL ? `<img class="post-detail-image" src="${post.imageURL}" alt="" />` : ''}
            <div class="post-detail-description">${Utils.escapeHtml(post.description)}</div>
            ${!isOwner ? `<div style="margin-top:var(--space-lg);"><button class="btn btn-primary" id="detail-msg-btn">💬 Message ${Utils.escapeHtml(post.authorName)}</button></div>` : ''}
          </div>
          ${answerHtml}
        </div>
      `;
            document.getElementById('detail-back-btn')?.addEventListener('click', () => App.navigateTo(this.currentPage || 'home'));
            document.getElementById('detail-msg-btn')?.addEventListener('click', () => {
                Chat.startConversation(post.authorId, post.authorName);
            });
            this.bindAnswerActions(post);
        } catch (err) {
            console.error(err);
            Utils.showToast('Error loading post', 'error');
        }
    },

    async renderAnswersSection(post) {
        let answers = [];
        try {
            const snap = await db.collection('posts').doc(post.id).collection('answers').orderBy('createdAt', 'asc').get();
            answers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) { console.error(e); }
        const isOwner = post.authorId === Auth.currentUser?.uid;
        const isResolved = post.status === 'resolved';
        let html = `<div class="answers-section"><h3>Answers (${answers.length})</h3>`;
        if (answers.length === 0) {
            html += '<p style="color:var(--color-text-muted);font-size:var(--font-size-sm);">No answers yet. Be the first to help!</p>';
        }
        answers.forEach(a => {
            const isHelpful = post.helpfulAnswerId === a.id;
            html += `
        <div class="answer-card ${isHelpful ? 'helpful' : ''}">
          ${isHelpful ? '<div class="helpful-badge">✓ Helpful Answer</div>' : ''}
          <div class="post-card-meta" style="margin-bottom:8px;">
            <div class="post-card-avatar" style="width:28px;height:28px;font-size:0.75rem;">${Utils.getInitials(a.authorName)}</div>
            <div>
              <div class="post-card-author" style="font-size:0.8rem;">${Utils.escapeHtml(a.authorName)}</div>
              <div class="post-card-time">${Utils.timeAgo(a.createdAt)}</div>
            </div>
          </div>
          <div class="answer-text">${Utils.escapeHtml(a.text)}</div>
          ${isOwner && !isResolved && !isHelpful ? `<button class="mark-helpful-btn" data-answer-id="${a.id}">✓ Mark as Helpful</button>` : ''}
        </div>
      `;
        });
        if (!isResolved) {
            html += `
        <div class="answer-form">
          <textarea id="answer-text" placeholder="Write your answer..." rows="3"></textarea>
          <button class="btn btn-primary" id="submit-answer-btn">Submit Answer</button>
        </div>
      `;
        }
        html += '</div>';
        return html;
    },

    bindAnswerActions(post) {
        document.getElementById('submit-answer-btn')?.addEventListener('click', async () => {
            const text = document.getElementById('answer-text')?.value.trim();
            if (!text) { Utils.showToast('Write an answer first', 'warning'); return; }
            try {
                await db.collection('posts').doc(post.id).collection('answers').add({
                    text,
                    authorId: Auth.currentUser.uid,
                    authorName: Auth.userProfile.fullName,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                await db.collection('posts').doc(post.id).update({
                    answerCount: firebase.firestore.FieldValue.increment(1)
                });
                Utils.showToast('Answer submitted!', 'success');
                this.showPostDetail(post.id);
            } catch (err) {
                Utils.showToast('Failed to submit answer', 'error');
            }
        });
        document.querySelectorAll('.mark-helpful-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    await db.collection('posts').doc(post.id).update({
                        helpfulAnswerId: btn.dataset.answerId,
                        status: 'resolved'
                    });
                    Utils.showToast('Marked as helpful! Question resolved.', 'success');
                    this.showPostDetail(post.id);
                } catch (err) {
                    Utils.showToast('Failed to mark helpful', 'error');
                }
            });
        });
    },

    cleanup() {
        this.unsubscribers.forEach(u => u());
        this.unsubscribers = [];
    }
};
