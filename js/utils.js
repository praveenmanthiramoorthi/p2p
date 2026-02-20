/**
 * P2P Utility Functions
 */
const Utils = {
    // Show a toast notification
    showToast(message, type = 'info', title = '') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = {
            success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️'
        };
        toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-content">
        ${title ? `<p class="toast-title">${title}</p>` : ''}
        <p class="toast-message">${message}</p>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    // Format timestamp
    timeAgo(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    // Get initials from name
    getInitials(name) {
        if (!name) return 'U';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    },

    // Category labels
    getCategoryLabel(cat) {
        const labels = {
            qa: 'Q&A', sell: 'Sell', buy: 'Buy', need: 'Need',
            lost: 'Lost', found: 'Found', teamup: 'TeamUp'
        };
        return labels[cat] || cat;
    },

    // Validate institution email (supports subdomains like @aiml.ritchennai.edu.in)
    isValidInstitutionEmail(email) {
        if (!APP_CONFIG.institutionDomain) return true;
        const parts = email.toLowerCase().split('@');
        if (parts.length !== 2) return false;
        const domain = parts[1];
        return domain === APP_CONFIG.institutionDomain || domain.endsWith('.' + APP_CONFIG.institutionDomain);
    },

    // Escape HTML
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Set button loading state
    setLoading(btn, loading) {
        if (loading) {
            btn.classList.add('loading');
            btn.disabled = true;
        } else {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    },

    // Truncate text
    truncate(str, max = 100) {
        if (!str || str.length <= max) return str;
        return str.substring(0, max) + '...';
    }
};
