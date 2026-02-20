/**
 * P2P Main Application Controller
 */
const App = {
    initialized: false,

    init() {
        this.setupUI();
        if (this.initialized) {
            // Re-sync modules that may have new user context
            Posts.loadPosts();
            Chat.loadConversations();
            return;
        }
        this.initialized = true;
        this.setupNavigation();
        this.setupMobileMenu();
        this.setupUserMenu();
        this.setupFAQ();
        this.setupPortals();
        Posts.init();
        Chat.init();
    },

    setupPortals() {
        // Listen for portal toggles from Firestore
        db.collection('settings').doc('portals').onSnapshot(doc => {
            if (doc.exists) {
                const portals = doc.data();
                Object.keys(portals).forEach(key => {
                    const enabled = portals[key];
                    const link = document.querySelector(`.sidebar-link[data-page="${key}"]`);
                    const welcomeItem = document.querySelector(`.welcome-item[data-portal="${key}"]`);

                    if (link) link.style.display = enabled ? 'flex' : 'none';
                    if (welcomeItem) welcomeItem.style.display = enabled ? 'flex' : 'none';

                    // If user is on a disabled portal, redirect to home
                    if (!enabled && Posts.currentPage === key) {
                        this.navigateTo('home');
                        Utils.showToast(`The ${key.toUpperCase()} section is temporarily disabled by admin.`, 'info');
                    }
                });
            }
        });
    },

    setupUI() {
        // Set user info in navbar
        const profile = Auth.userProfile;
        if (profile) {
            const initials = Utils.getInitials(profile.fullName);
            document.getElementById('user-avatar').textContent = initials;
            document.getElementById('dropdown-avatar').textContent = initials;
            document.getElementById('dropdown-name').textContent = profile.fullName;
            document.getElementById('dropdown-email').textContent = profile.email || Auth.currentUser?.email;

            // Show admin link if authorized
            const isAdmin = APP_CONFIG.adminEmails.includes(Auth.currentUser?.email);
            const adminLink = document.getElementById('go-admin-btn');
            if (adminLink) adminLink.style.display = isAdmin ? 'flex' : 'none';
        }
    },

    setupNavigation() {
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                const page = link.dataset.page;
                this.navigateTo(page);
            });
        });
        // My Posts
        document.getElementById('my-posts-btn')?.addEventListener('click', () => {
            this.navigateTo('my-posts');
            document.getElementById('user-dropdown').style.display = 'none';
        });
        // Edit Profile
        document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
            document.getElementById('user-dropdown').style.display = 'none';
            // Re-show profile page for editing
            if (Auth.userProfile) {
                document.getElementById('profile-name').value = Auth.userProfile.fullName || '';
                document.getElementById('profile-register-number').value = Auth.userProfile.registerNumber || '';
                document.getElementById('profile-batch').value = Auth.userProfile.batch || '';
                document.getElementById('profile-contact').value = Auth.userProfile.contactNumber || '';
            }
            Auth.showPage('profile');
        });
    },

    navigateTo(page) {
        // Update sidebar
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.sidebar-link[data-page="${page}"]`);
        if (link) link.classList.add('active');
        Posts.currentPage = page;
        Posts.currentFilter = 'all';
        // Reset filter tabs
        const pageSection = document.getElementById(`page-${page}`);
        if (pageSection) {
            pageSection.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            const allTab = pageSection.querySelector('.filter-tab[data-filter="all"]');
            if (allTab) allTab.classList.add('active');
        }
        this.showSection(`page-${page}`);
        Posts.renderPosts();
        // Close mobile menu
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('show');
    },

    showSection(sectionId) {
        document.querySelectorAll('.page-section').forEach(s => {
            s.style.display = 'none';
            s.classList.remove('active');
        });
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
            section.classList.add('active');
        }
    },

    setupMobileMenu() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        menuBtn?.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        });
        overlay?.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    },

    setupUserMenu() {
        const avatarBtn = document.getElementById('avatar-btn');
        const dropdown = document.getElementById('user-dropdown');
        avatarBtn?.addEventListener('click', () => {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', e => {
            if (!e.target.closest('.user-menu')) {
                dropdown.style.display = 'none';
            }
        });
    },

    setupFAQ() {
        document.querySelectorAll('.faq-question').forEach(q => {
            q.addEventListener('click', () => {
                q.parentElement.classList.toggle('open');
            });
        });
    },

    cleanup() {
        // Stop all real-time listeners
        Posts.cleanup();
        Chat.cleanup();
        this.initialized = false;
        // Reset UI
        document.getElementById('user-avatar').textContent = '';
        document.getElementById('dropdown-avatar').textContent = '';
        document.getElementById('dropdown-name').textContent = '';
        document.getElementById('dropdown-email').textContent = '';
    }
};

// ── Bootstrap ──
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});
