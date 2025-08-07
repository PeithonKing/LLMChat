const input = document.getElementById('chat-input');
const model = document.getElementById('model-select');

// --- Chat history lazy loading ---
const chatWindow = document.getElementById('chat-history');
const chatId = window.location.pathname.split('/').pop();
let offset = 0;
const limit = 10;
let loading = false;
let allLoaded = false;

let messageHistory = [];

async function fetchMessages() {
    if (loading || allLoaded) return;
    loading = true;
    try {
        const res = await fetch(`/api/chat_history/${chatId}?offset=${offset}&limit=${limit}`);
        const data = await res.json();
        if (data.messages.length === 0) {
            allLoaded = true;
            return;
        }
        // Render messages in reverse (oldest at top)
        data.messages.slice().forEach(msg => {
            renderMessage(msg, false);
        });
        offset += data.messages.length;
    } finally {
        loading = false;
    }
}

function renderMessage(msg, newMsg = false) {
    const { role, content, ID } = msg;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message d-flex align-items-start mb-3';
    let icon = '';
    if (role === 'user') icon = '<i class="bi bi-person fs-4 me-2 text-primary"></i>';
    else if (role === 'assistant') icon = '<i class="bi bi-robot fs-4 me-2 text-success"></i>';
    else icon = '<i class="bi bi-chat-left-dots fs-4 me-2 text-secondary"></i>';
    msgDiv.innerHTML = `${icon}<div class="flex-grow-1"><div class="chat-bubble chat-bubble-bg${role === 'assistant' ? ' assistant' : ''} p-2" data-raw="${content.replace(/"/g, '&quot;')}" data-id="${ID}"></div></div>`;
    const bubble = msgDiv.querySelector('.chat-bubble');
    if (bubble) {
        const raw = bubble.dataset.raw || bubble.textContent;
        const unescaped = raw.replace(/\\/g, '\\');
        bubble.innerHTML = marked.parse(unescaped);
        MathJax.typesetPromise([bubble]);
        bubble.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
        bubble.dataset.rendered = '1';
    }
    if (newMsg || chatWindow.children.length === 0) {
        chatWindow.appendChild(msgDiv);
        messageHistory.push(msg);
    } else {
        chatWindow.insertBefore(msgDiv, chatWindow.firstChild);
        messageHistory.unshift(msg);
    }
    return msgDiv;
}

// Lazy load on scroll
chatWindow.addEventListener('scroll', function () {
    if (chatWindow.scrollTop < 50 && !loading && !allLoaded) {
        fetchMessages();
    }
});

function handleSendMessage(e) {
    e.preventDefault();
    const msg = input.value.trim();
    const mdl = model.value;
    if (!msg) return;
    input.value = '';
    // Show user message immediately
    let lastID = messageHistory.length > 0 ? messageHistory[messageHistory.length - 1].ID : 1;
    renderMessage({ role: 'user', content: msg, ID: lastID + 1 }, true);
    // Stream request to backend
    fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, model: mdl })
    }).then(async response => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMsg = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                if (assistantMsg.trim()) {
                    lastID = messageHistory.length > 0 ? messageHistory[messageHistory.length - 1].ID : 1;
                    renderMessage({ role: 'assistant', content: assistantMsg.trim(), ID: lastID + 1 }, true);
                }
                break;
            }
            // Each chunk is a JSON string
            const chunkStr = decoder.decode(value);
            try {
                const lines = chunkStr.split('\n').filter(Boolean);
                for (const line of lines) {
                    const data = JSON.parse(line);
                    if (data.message && data.message !== '[DONE]') {
                        assistantMsg += data.message;
                    }
                }
            } catch (err) {
                // Ignore parse errors for incomplete chunks
            }
        }
    });
}


document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('chat-form');

    form.addEventListener('submit', handleSendMessage);
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleSendMessage(e);
        }
    });

    fetchMessages(); // Initial load

    setTimeout(() => {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }, 100);

    
});
