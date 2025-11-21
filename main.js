import './style.css'
import { HfInference } from '@huggingface/inference'

// ============================================
// CONFIGURATION
// ============================================

const API_KEY = import.meta.env.VITE_HF_API_KEY;
const hf = new HfInference(API_KEY);

// ============================================
// DOM ELEMENTS
// ============================================

const chatDisplay = document.getElementById('chat-display');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const loadingIndicator = document.getElementById('loading');
const promptTemplate = document.getElementById('prompt-template');
const useTemplateButton = document.getElementById('use-template');

// ============================================
// MAIN FUNCTIONALITY
// ============================================

function addMessage(content, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
  messageDiv.textContent = content;

  chatDisplay.appendChild(messageDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

function setLoading(isLoading) {
  loadingIndicator.style.display = isLoading ? 'block' : 'none';
  sendButton.disabled = isLoading;
  userInput.disabled = isLoading;
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = `⚠️ Error: ${message}`;
  chatDisplay.appendChild(errorDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// ============================
// FIXED FUNCTION WITH SYSTEM PROMPT
// ============================

async function getAIResponse(userMessage) {
  try {
    let fullResponse = '';

    const stream = hf.chatCompletionStream({
      model: "Qwen/Qwen2.5-72B-Instruct",
      messages: [
        {
          role: "system",
          content:
            "you are a helpful language translation assistant " +
            "You provide expert translation skills, proper and improper when asked, be able to understand possible slang thats commonly used, " + +
            "Stay 100% focused on translation at all times." +
            "understand what language the user is speaking to you"
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 250,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      if (chunk.choices?.length > 0) {
        const newContent = chunk.choices[0].delta.content;
        if (newContent) fullResponse += newContent;
      }
    }

    return fullResponse || 'No response generated.';

  } catch (error) {
    console.error('Error calling AI API:', error);

    if (error.message.includes('API key')) {
      throw new Error('Invalid API key. Please check your .env file.');
    } else if (error.message.includes('loading')) {
      throw new Error('Model is loading. Please wait a moment.');
    } else {
      throw new Error(`Failed to get AI response: ${error.message}`);
    }
  }
}

// ============================================
// MESSAGE HANDLER 
// ============================================

async function handleSendMessage() {
  const message = userInput.value.trim();

  if (!message) return;

  if (!API_KEY) {
    showError('API key not found! Make sure .env contains VITE_HF_API_KEY.');
    return;
  }

  addMessage(message, true);
  userInput.value = '';
  setLoading(true);

  try {
    const aiResponse = await getAIResponse(message);
    addMessage(aiResponse, false);

  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
    userInput.focus();
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

sendButton.addEventListener('click', handleSendMessage);

userInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
});

userInput.focus();

chatDisplay.addEventListener('DOMNodeInserted', function() {
  const welcomeMsg = chatDisplay.querySelector('.welcome-message');
  const messages = chatDisplay.querySelectorAll('.message');
  if (welcomeMsg && messages.length > 0) welcomeMsg.remove();
}, { once: true });

useTemplateButton.addEventListener('click', () => {
  userInput.value = promptTemplate.textContent;
  userInput.focus();
  const firstBracket = userInput.value.indexOf('[');
  if (firstBracket !== -1) {
    userInput.setSelectionRange(firstBracket + 1, firstBracket + 1);
  }
});


