const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const resetButton = document.getElementById('reset-button');
    const loadingIndicator = document.getElementById('loading');
    let sessionId = localStorage.getItem('sessionId') || Date.now().toString();
    localStorage.setItem('sessionId', sessionId);
    let currentCompany = localStorage.getItem('currentCompany') || '';
    let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

    function addMessage(sender, message) {
        const messageElement = document.createElement('p');
        messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        chatHistory.push({ sender, message });
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }

    function loadChatHistory() {
        chatContainer.innerHTML = '';
        chatHistory.forEach(msg => addMessage(msg.sender, msg.message));
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;
        addMessage('You', message);
        userInput.value = '';
        
        loadingIndicator.style.display = 'block';
        
        try {
            const endpoint = !currentCompany ? 'get_stock_code' : 'answer_question';
            const body = !currentCompany 
                ? { company_name: message, session_id: sessionId }
                : { question: message, stock_symbol: currentCompany, session_id: sessionId };

            const response = await fetch(`https://glacial-wildwood-18418-0f87b0df699e.herokuapp.com/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!currentCompany) {
                currentCompany = data.stock_symbol;
                localStorage.setItem('currentCompany', currentCompany);
                addMessage('Assistant', `Stock symbol for ${message}: ${currentCompany}`);
                addMessage('Assistant', "What would you like to know about this company?");
            } else {
                addMessage('Assistant', data.answer);
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage('System', 'An error occurred. Please try again.');
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    resetButton.addEventListener('click', () => {
        localStorage.clear();
        sessionId = Date.now().toString();
        localStorage.setItem('sessionId', sessionId);
        currentCompany = '';
        chatHistory = [];
        loadChatHistory();
        addMessage('Assistant', "Welcome! Please enter a company name to start a new analysis.");
    });

    // Load chat history on page load
    loadChatHistory();

    // Initial message if chat history is empty
    if (chatHistory.length === 0) {
        addMessage('Assistant', "Welcome! Please enter a company name to start.");
    }

    // Perform cleanup periodically
    setInterval(() => {
        fetch('https://glacial-wildwood-18418-0f87b0df699e.herokuapp.com/api/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
        }).catch(error => console.error('Error during cleanup:', error));
    }, 300000); // Run every 5 minutes (300000 ms)
    
