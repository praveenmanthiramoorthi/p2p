/**
 * P2P Authentication Module
 */
const Auth = {
    currentUser: null,
    userProfile: null,

    init() {
        // Toggle auth forms
        document.getElementById('show-register')?.addEventListener('click', e => { e.preventDefault(); this.showForm('register'); });
        document.getElementById('show-login')?.addEventListener('click', e => { e.preventDefault(); this.showForm('login'); });

        // Password toggles
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.dataset.target);
                input.type = input.type === 'password' ? 'text' : 'password';
            });
        });

        // Login form
        document.getElementById('login-form-el')?.addEventListener('submit', e => { e.preventDefault(); this.login(); });
        // Register form
        document.getElementById('register-form-el')?.addEventListener('submit', e => { e.preventDefault(); this.register(); });
        // Google auth
        document.getElementById('google-login-btn')?.addEventListener('click', () => this.googleAuth());
        document.getElementById('google-register-btn')?.addEventListener('click', () => this.googleAuth());
        // Profile form
        document.getElementById('profile-form')?.addEventListener('submit', e => { e.preventDefault(); this.saveProfile(); });
        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());

        // Auth state listener
        auth.onAuthStateChanged(user => this.handleAuthState(user));

        // Safety: force-hide loading screen after 3s even if Firebase is slow
        setTimeout(() => this.hideLoading(), 3000);
    },

    showForm(type) {
        document.getElementById('login-form').style.display = type === 'login' ? 'block' : 'none';
        document.getElementById('register-form').style.display = type === 'register' ? 'block' : 'none';
    },

    async login() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('login-btn');
        if (!email || !password) { Utils.showToast('Please fill in all fields', 'warning'); return; }
        if (!Utils.isValidInstitutionEmail(email)) { Utils.showToast('Use your institutional email to sign in', 'error'); return; }
        Utils.setLoading(btn, true);
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (err) {
            Utils.showToast(this.getErrorMessage(err.code), 'error');
        }
        Utils.setLoading(btn, false);
    },

    async register() {
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm-password').value;
        const btn = document.getElementById('register-btn');
        if (!email || !password || !confirm) { Utils.showToast('Please fill in all fields', 'warning'); return; }
        if (!Utils.isValidInstitutionEmail(email)) { Utils.showToast('Only institutional emails are allowed', 'error'); return; }
        if (password.length < 8) { Utils.showToast('Password must be at least 8 characters', 'warning'); return; }
        if (password !== confirm) { Utils.showToast('Passwords do not match', 'warning'); return; }
        Utils.setLoading(btn, true);
        try {
            await auth.createUserWithEmailAndPassword(email, password);
            Utils.showToast('Account created successfully!', 'success');
        } catch (err) {
            Utils.showToast(this.getErrorMessage(err.code), 'error');
        }
        Utils.setLoading(btn, false);
    },

    async googleAuth() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            if (!Utils.isValidInstitutionEmail(result.user.email)) {
                await result.user.delete();
                Utils.showToast('Only institutional emails are allowed', 'error');
                return;
            }
        } catch (err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                Utils.showToast(this.getErrorMessage(err.code), 'error');
            }
        }
    },

    hideLoading() {
        const ls = document.getElementById('loading-screen');
        if (ls) {
            ls.style.opacity = '0';
            ls.style.transition = 'opacity 0.4s ease';
            setTimeout(() => { ls.style.display = 'none'; }, 400);
        }
    },

    async handleAuthState(user) {
        // Hide loading screen quickly
        this.hideLoading();

        // OPEN MODE: If session issues, allow guest entry for now
        if (!user) {
            console.warn('No active session found. Entering in Guest/Open Mode.');
            this.currentUser = { uid: 'guest_' + Utils.generateId(), email: 'guest@ritchennai.edu.in', displayName: 'Guest User' };
            this.userProfile = { fullName: 'Guest User', profileCompleted: true, role: 'user' };
            this.showPage('app');
            App.init();
            return;
        }

        this.currentUser = user;
        // Check if profile exists
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists && doc.data().profileCompleted) {
                this.userProfile = doc.data();
                this.showPage('app');
                App.init();
            } else {
                // If profile incomplete, still allow skipping to app in open mode
                console.log('Profile incomplete, but allowing entry in Open Mode.');
                this.userProfile = {
                    fullName: user.displayName || 'Unnamed User',
                    profileCompleted: true,
                    uid: user.uid,
                    email: user.email
                };
                this.showPage('app');
                App.init();
            }
        } catch (err) {
            console.error('Profile check error:', err);
            // On error, just enter the app
            this.showPage('app');
            App.init();
        }
    },

    async saveProfile() {
        const btn = document.getElementById('profile-save-btn');
        const name = document.getElementById('profile-name').value.trim();
        const regNum = document.getElementById('profile-register-number').value.trim();
        const batch = document.getElementById('profile-batch').value;
        const contact = document.getElementById('profile-contact').value.trim();
        if (!name || !regNum || !batch || !contact) { Utils.showToast('Please fill in all fields', 'warning'); return; }
        // Try to get user from all possible places
        let user = this.currentUser || auth.currentUser;

        console.log('Attempting to save profile. Current session user:', user ? user.email : 'NULL');

        if (!user) {
            // Last ditch effort: wait 1 second and try again
            await new Promise(resolve => setTimeout(resolve, 1000));
            user = auth.currentUser;
        }

        if (!user) {
            Utils.showToast('Session lost. Please sign in again.', 'error');
            console.error('SaveProfile: No user found in Auth.currentUser or firebase.auth().currentUser');
            this.showPage('auth');
            return;
        }

        Utils.setLoading(btn, true);
        try {
            const profileData = {
                uid: user.uid,
                email: user.email,
                fullName: name,
                registerNumber: regNum,
                batch: batch,
                contactNumber: contact, // stored privately, never exposed publicly
                profileCompleted: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: 'user' // for future admin roles
            };
            await db.collection('users').doc(this.currentUser.uid).set(profileData, { merge: true });
            this.userProfile = profileData;
            Utils.showToast('Profile saved! Welcome to P2P 🎉', 'success');
            this.showPage('app');
            App.init();
        } catch (err) {
            console.error('Save Profile Error:', err);
            let msg = 'Failed to save profile.';
            if (err.code === 'permission-denied') {
                msg = 'Permission denied. Please check your Firestore rules.';
            } else if (err.message) {
                msg += ' ' + err.message;
            }
            Utils.showToast(msg, 'error');
        }
        Utils.setLoading(btn, false);
    },

    async logout() {
        try {
            await auth.signOut();
            Utils.showToast('Signed out', 'info');
        } catch (err) {
            Utils.showToast('Sign out failed', 'error');
        }
    },

    showPage(page) {
        document.getElementById('auth-page').style.display = page === 'auth' ? 'block' : 'none';
        document.getElementById('profile-page').style.display = page === 'profile' ? 'block' : 'none';
        document.getElementById('app').style.display = page === 'app' ? 'block' : 'none';
    },

    getErrorMessage(code) {
        const messages = {
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/email-already-in-use': 'This email is already registered.',
            'auth/weak-password': 'Password is too weak.',
            'auth/invalid-email': 'Invalid email address.',
            'auth/too-many-requests': 'Too many attempts. Try again later.',
            'auth/network-request-failed': 'Network error. Check your connection.'
        };
        return messages[code] || 'Authentication error. Please try again.';
    }
};
