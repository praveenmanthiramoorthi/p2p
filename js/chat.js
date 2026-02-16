/**
 * P2P Chat Module — Real-time messaging via Firestore
 */
const Chat = {
    currentChatId: null,
    currentChatUser: null,
    unsubMessages: null,
    unsubConversations: null,

    init() {
        document.getElementById('chat-toggle-btn')?.addEventListener('click', () => this.togglePanel());
        document.getElementById('chat-close-btn')?.addEventListener('click', () => this.closePanel());
        document.getElementById('chat-back-btn')?.addEventListener('click', () => this.showList());
        document.getElementById('chat-send-btn')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-message-input')?.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
        });
        this.loadConversations();
    },

    togglePanel() {
        const panel = document.getElementById('chat-panel');
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'flex';
            this.showList();
        } else {
            this.closePanel();
        }
    },

    closePanel() {
        document.getElementById('chat-panel').style.display = 'none';
        if (this.unsubMessages) { this.unsubMessages(); this.unsubMessages = null; }
    },

    showList() {
        document.getElementById('chat-list').style.display = 'flex';
        document.getElementById('chat-window').style.display = 'none';
        if (this.unsubMessages) { this.unsubMessages(); this.unsubMessages = null; }
    },

    getChatId(uid1, uid2) {
        return [uid1, uid2].sort().join('_');
    },

    async startConversation(otherUid, otherName) {
        if (otherUid === Auth.currentUser?.uid) {
            Utils.showToast("You can't message yourself", 'info');
            return;
        }
        const chatId = this.getChatId(Auth.currentUser.uid, otherUid);
        // Create conversation doc if not exists
        const ref = db.collection('conversations').doc(chatId);
        const doc = await ref.get();
        if (!doc.exists) {
            await ref.set({
                participants: [Auth.currentUser.uid, otherUid],
                participantNames: { [Auth.currentUser.uid]: Auth.userProfile.fullName, [otherUid]: otherName },
                lastMessage: '',
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        this.currentChatId = chatId;
        this.currentChatUser = { uid: otherUid, name: otherName };
        const panel = document.getElementById('chat-panel');
        panel.style.display = 'flex';
        this.openChat(chatId, otherName);
    },

    loadConversations() {
        if (!Auth.currentUser) return;
        if (this.unsubConversations) this.unsubConversations();
        this.unsubConversations = db.collection('conversations')
            .where('participants', 'array-contains', Auth.currentUser.uid)
            .orderBy('lastMessageTime', 'desc')
            .onSnapshot(snap => {
                const container = document.getElementById('chat-conversations');
                const emptyEl = document.getElementById('chat-empty');
                if (snap.empty) {
                    container.innerHTML = '';
                    if (emptyEl) emptyEl.style.display = 'flex';
                    return;
                }
                if (emptyEl) emptyEl.style.display = 'none';
                let html = '';
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    const otherUid = data.participants.find(p => p !== Auth.currentUser.uid);
                    const otherName = data.participantNames?.[otherUid] || 'User';
                    const initials = Utils.getInitials(otherName);
                    const preview = Utils.truncate(data.lastMessage || 'No messages yet', 40);
                    const time = Utils.timeAgo(data.lastMessageTime);
                    html += `
            <div class="chat-conversation-item" data-chat-id="${doc.id}" data-other-uid="${otherUid}" data-other-name="${Utils.escapeHtml(otherName)}">
              <div class="avatar small">${initials}</div>
              <div class="chat-conversation-info">
                <div class="chat-conversation-name">${Utils.escapeHtml(otherName)}</div>
                <div class="chat-conversation-preview">${Utils.escapeHtml(preview)}</div>
              </div>
              <span class="chat-conversation-time">${time}</span>
            </div>
          `;
                });
                container.innerHTML = html;
                container.querySelectorAll('.chat-conversation-item').forEach(item => {
                    item.addEventListener('click', () => {
                        this.currentChatUser = { uid: item.dataset.otherUid, name: item.dataset.otherName };
                        this.openChat(item.dataset.chatId, item.dataset.otherName);
                    });
                });
            });
    },

    openChat(chatId, otherName) {
        this.currentChatId = chatId;
        document.getElementById('chat-list').style.display = 'none';
        document.getElementById('chat-window').style.display = 'flex';
        document.getElementById('chat-user-name').textContent = otherName;
        document.getElementById('chat-user-avatar').textContent = Utils.getInitials(otherName);

        // Listen for messages
        if (this.unsubMessages) this.unsubMessages();
        const messagesContainer = document.getElementById('chat-messages');
        this.unsubMessages = db.collection('conversations').doc(chatId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snap => {
                messagesContainer.innerHTML = '';
                snap.docs.forEach(doc => {
                    const msg = doc.data();
                    const isSent = msg.senderId === Auth.currentUser.uid;
                    const div = document.createElement('div');
                    div.className = `chat-message ${isSent ? 'sent' : 'received'}`;
                    div.innerHTML = `
            <div>${Utils.escapeHtml(msg.text)}</div>
            <div class="chat-message-time">${Utils.timeAgo(msg.createdAt)}</div>
          `;
                    messagesContainer.appendChild(div);
                });
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
    },

    async sendMessage() {
        const input = document.getElementById('chat-message-input');
        const text = input.value.trim();
        if (!text || !this.currentChatId) return;
        input.value = '';
        try {
            await db.collection('conversations').doc(this.currentChatId).collection('messages').add({
                text,
                senderId: Auth.currentUser.uid,
                senderName: Auth.userProfile.fullName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('conversations').doc(this.currentChatId).update({
                lastMessage: text,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) {
            Utils.showToast('Failed to send message', 'error');
        }
    },

    cleanup() {
        if (this.unsubMessages) this.unsubMessages();
        if (this.unsubConversations) this.unsubConversations();
    }
};
