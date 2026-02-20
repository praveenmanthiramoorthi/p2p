/**
 * P2P Admin Module — Platform management & statistics
 */
const Admin = {
    currentUser: null,
    isAuthorized: false,
    allPosts: [],
    reports: [],
    flaggedUsersData: [],

    init() {
        auth.onAuthStateChanged(user => this.handleAuthState(user));
        document.getElementById('google-login-btn')?.addEventListener('click', () => this.login());
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
        this.setupTabs();
        this.setupPortalToggles();
        document.getElementById('delete-all-posts-btn')?.addEventListener('click', () => this.deleteAllPosts());

        // Export Listeners
        document.getElementById('export-users-pdf-btn')?.addEventListener('click', () => this.exportToPDF());
        document.getElementById('export-users-excel-btn')?.addEventListener('click', () => this.exportToExcel());
    },

    async handleAuthState(user) {
        if (!user) {
            this.showPage('auth');
            return;
        }

        // Check hardcoded email list
        if (!APP_CONFIG.adminEmails.includes(user.email)) {
            Utils.showToast('You are not authorized for the admin portal.', 'error');
            await auth.signOut();
            this.showPage('auth');
            return;
        }

        this.currentUser = user;
        this.isAuthorized = true;
        document.getElementById('admin-email-display').textContent = user.email;
        this.showPage('app');
        this.loadDashboardData();
    },

    async login() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await auth.signInWithPopup(provider);
        } catch (err) {
            Utils.showToast('Login failed', 'error');
        }
    },

    async logout() {
        await auth.signOut();
        window.location.reload();
    },

    showPage(page) {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('auth-page').style.display = page === 'auth' ? 'flex' : 'none';
        document.getElementById('app').style.display = page === 'app' ? 'block' : 'none';
    },

    setupMobileMenu() {
        const btn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('admin-sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        btn?.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        });

        overlay?.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    },

    setupTabs() {
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                const tabId = 'tab-' + btn.dataset.tab;
                document.getElementById(tabId)?.classList.add('active');

                // Close mobile menu on click
                document.getElementById('admin-sidebar').classList.remove('open');
                document.getElementById('sidebar-overlay').classList.remove('show');
            });
        });
    },

    async loadDashboardData() {
        // Load settings
        await this.loadSettings();

        // Listen for all posts
        db.collection('posts').onSnapshot(snapshot => {
            this.allPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            this.updateStats();
            this.renderAllPosts();
            this.renderReportedPosts();
        });

        // Listen for reports
        db.collection('reports').onSnapshot(snapshot => {
            this.reports = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            this.updateStats();
            this.renderReportedPosts();
            this.renderFlaggedUsers();
        });

        // Load total users count (rough estimate from users collection)
        db.collection('users').onSnapshot(snapshot => {
            document.getElementById('stat-total-users').textContent = snapshot.size;
            this.renderFlaggedUsers();
        });
    },

    async loadSettings() {
        try {
            const doc = await db.collection('settings').doc('portals').get();
            if (doc.exists) {
                const portals = doc.data();
                Object.keys(portals).forEach(key => {
                    const el = document.getElementById('toggle-' + key);
                    if (el) el.checked = portals[key];
                });
            } else {
                // Initialize default settings if they don't exist
                await db.collection('settings').doc('portals').set(APP_CONFIG.portals);
            }
        } catch (e) {
            console.error('Settings load error:', e);
        }
    },

    setupPortalToggles() {
        ['qa', 'marketplace', 'lostfound', 'teamup'].forEach(key => {
            document.getElementById('toggle-' + key)?.addEventListener('change', async (e) => {
                try {
                    const enabled = e.target.checked;
                    await db.collection('settings').doc('portals').update({
                        [key]: enabled
                    });
                    Utils.showToast(`${key.toUpperCase()} portal ${enabled ? 'enabled' : 'disabled'}`, 'success');
                } catch (err) {
                    Utils.showToast('Failed to update portal status', 'error');
                }
            });
        });
    },

    updateStats() {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const postsToday = this.allPosts.filter(p => {
            if (!p.createdAt) return false;
            const date = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
            return date >= startOfToday;
        });

        const activeReports = this.allPosts.filter(p => p.status === 'reported').length;

        document.getElementById('stat-total-posts').textContent = this.allPosts.length;
        document.getElementById('stat-posts-today').textContent = postsToday.length;
        document.getElementById('stat-active-reports').textContent = activeReports;
    },

    renderReportedPosts() {
        const grid = document.getElementById('reported-posts-grid');
        const reported = this.allPosts.filter(p => p.status === 'reported');

        if (reported.length === 0) {
            grid.innerHTML = '<div class="empty-admin">No active reports. Good job!</div>';
            return;
        }

        grid.innerHTML = reported.map(p => {
            const reportsForThisPost = this.reports.filter(r => r.postId === p.id);
            const reasons = [...new Set(reportsForThisPost.map(r => r.reason))].join(', ');

            return `
                <div class="admin-post-card">
                    <div class="admin-post-header">
                        <div>
                            <div class="admin-post-title">${Utils.escapeHtml(p.title)}</div>
                            <div class="admin-post-author">By: ${Utils.escapeHtml(p.authorName)} | ${Utils.getCategoryLabel(p.category)}</div>
                        </div>
                        <span class="status-badge reported">Reported (${reportsForThisPost.length})</span>
                    </div>
                    <div class="admin-post-desc">${Utils.truncate(p.description, 100)}</div>
                    <div class="admin-post-reason"><strong>Reasons:</strong> ${reasons || 'Unknown'}</div>
                    <div class="admin-post-actions">
                        <button class="btn btn-primary btn-sm" onclick="Admin.denyReport('${p.id}')">Deny Report</button>
                        <button class="btn btn-danger btn-sm" onclick="Admin.deletePost('${p.id}')">Delete Post</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderAllPosts() {
        const grid = document.getElementById('all-posts-grid');
        if (this.allPosts.length === 0) {
            grid.innerHTML = '<div class="empty-admin">No posts yet.</div>';
            return;
        }

        grid.innerHTML = this.allPosts.map(p => `
            <div class="admin-post-card">
                <div class="admin-post-header">
                    <div>
                        <div class="admin-post-title">${Utils.escapeHtml(p.title)}</div>
                        <div class="admin-post-author">By: ${Utils.escapeHtml(p.authorName)}</div>
                    </div>
                    <span class="category-badge ${p.category}">${Utils.getCategoryLabel(p.category)}</span>
                </div>
                <div class="admin-post-actions">
                    <button class="btn btn-danger btn-sm" onclick="Admin.deletePost('${p.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    },

    async denyReport(postId) {
        if (!confirm('Allow this post to be visible in the user portal again?')) return;
        try {
            await db.collection('posts').doc(postId).update({
                status: 'active',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            // Also clear reports for this post to clear the queue
            const snapshot = await db.collection('reports').where('postId', '==', postId).get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            Utils.showToast('Report denied. Post is now visible again.', 'success');
        } catch (err) {
            Utils.showToast('Action failed', 'error');
        }
    },

    async deletePost(postId) {
        if (!confirm('Permanently delete this post?')) return;
        try {
            await db.collection('posts').doc(postId).delete();
            // Clear related reports
            const snapshot = await db.collection('reports').where('postId', '==', postId).get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            Utils.showToast('Post deleted', 'info');
        } catch (err) {
            Utils.showToast('Delete failed', 'error');
        }
    },

    async deleteAllPosts() {
        if (!confirm('⚠️ EXTREME ACTION: Delete ALL posts on the platform? This cannot be undone.')) return;
        try {
            const snapshot = await db.collection('posts').get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            Utils.showToast('All posts deleted', 'warning');
        } catch (err) {
            Utils.showToast('Mass delete failed', 'error');
        }
    },

    async renderFlaggedUsers() {
        const list = document.getElementById('flagged-users-list');
        // Group reports by authorId
        const userReports = {};

        // We need to map postId to authorId
        const postToAuthor = {};
        this.allPosts.forEach(p => postToAuthor[p.id] = p.authorId);

        this.reports.forEach(r => {
            const authorId = postToAuthor[r.postId];
            if (authorId) {
                userReports[authorId] = (userReports[authorId] || 0) + 1;
            }
        });

        const sortedUserIds = Object.keys(userReports).sort((a, b) => userReports[b] - userReports[a]);

        // Render the top one for the home stats tab
        const homeCard = document.getElementById('top-flagged-user-card');
        if (sortedUserIds.length > 0) {
            const topId = sortedUserIds[0];
            const topUser = await db.collection('users').doc(topId).get();
            if (topUser.exists) {
                const data = topUser.data();
                homeCard.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0; color:var(--color-danger);">${Utils.escapeHtml(data.fullName)}</h3>
                            <p style="margin:4px 0 0 0; font-size:0.9rem;">Reg No: ${Utils.escapeHtml(data.registerNumber || 'N/A')} | Batch: ${data.batch || 'N/A'}</p>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:2rem; font-weight:700; color:var(--color-danger);">${userReports[topId]}</div>
                            <div style="font-size:0.7rem; color:var(--color-text-muted); text-transform:uppercase;">Total Reports</div>
                        </div>
                    </div>
                `;
            }
        } else {
            homeCard.innerHTML = '<p style="font-size: 1.1rem; color: var(--color-text-muted);">No flagged students yet.</p>';
        }

        // Fetch user details for these IDs
        const userDetails = [];
        for (const uid of sortedUserIds.slice(0, 10)) { // Top 10
            try {
                const doc = await db.collection('users').doc(uid).get();
                if (doc.exists) {
                    userDetails.push({ id: uid, count: userReports[uid], ...doc.data() });
                }
            } catch (e) { }
        }

        this.flaggedUsersData = userDetails; // Store for export

        if (userDetails.length === 0) {
            list.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;">No flagged students yet.</td></tr>';
            return;
        }

        list.innerHTML = userDetails.map(u => `
            <tr>
                <td><strong>${Utils.escapeHtml(u.fullName)}</strong></td>
                <td>${Utils.escapeHtml(u.registerNumber || 'N/A')}</td>
                <td>${Utils.escapeHtml(u.email)}</td>
                <td style="color:var(--color-danger);font-weight:700;">${u.count}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="Admin.viewUserDetail('${u.id}')">Details</button>
                </td>
            </tr>
        `).join('');
    },

    viewUserDetail(uid) {
        const user = this.allPosts.filter(p => p.authorId === uid);
        Utils.showToast(`User has ${user.length} total posts.`, 'info');
    },

    exportToPDF() {
        if (this.flaggedUsersData.length === 0) {
            Utils.showToast('No data to export', 'warning');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add Header
        doc.setFontSize(20);
        doc.text('P2P Flagged Students Report', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        const tableData = this.flaggedUsersData.map(u => [
            u.fullName,
            u.registerNumber || 'N/A',
            u.email,
            u.batch || 'N/A',
            u.count
        ]);

        doc.autoTable({
            startY: 40,
            head: [['Name', 'Register No.', 'Email', 'Batch', 'Total Reports']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillStyle: [36, 0, 70] } // var(--color-primary)
        });

        doc.save(`P2P_Flagged_Students_${new Date().toISOString().split('T')[0]}.pdf`);
        Utils.showToast('PDF exported successfully', 'success');
    },

    exportToExcel() {
        if (this.flaggedUsersData.length === 0) {
            Utils.showToast('No data to export', 'warning');
            return;
        }

        const tableData = this.flaggedUsersData.map(u => ({
            'Name': u.fullName,
            'Register No.': u.registerNumber || 'N/A',
            'Email': u.email,
            'Batch': u.batch || 'N/A',
            'Total Reports': u.count
        }));

        const worksheet = XLSX.utils.json_to_sheet(tableData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Flagged Students');

        XLSX.writeFile(workbook, `P2P_Flagged_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
        Utils.showToast('Excel exported successfully', 'success');
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
    Admin.init();
});
