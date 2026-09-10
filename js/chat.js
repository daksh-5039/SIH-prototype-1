let activeChatId = new URLSearchParams(window.location.search).get('chat');
let chatMessages = [];

function addBubble(role, text){
  const container = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  return bubble;
}
function setChatWelcome(){
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  addBubble('assistant', 'Hello! I am TouriSense Smart Assistant. Tell me your destination, days, travellers and budget, or ask me to use a saved plan from your profile. I will create a full trip roadmap, budget split and travel suggestions.');
}
async function loadChat(chatId){
  activeChatId = chatId;
  history.replaceState(null, '', chatId ? `chat.html?chat=${encodeURIComponent(chatId)}` : 'chat.html');
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  chatMessages = await window.rahiApi.getChatMessages(chatId);
  if(!chatMessages.length) return setChatWelcome();
  chatMessages.forEach(message => addBubble(message.role, message.text));
}
async function renderChatList(){
  const list = document.getElementById('chat-list');
  const user = window.rahiApi?.currentUser();
  if(!user){ list.innerHTML = '<p class="chat-side-note">Sign in to save and reopen conversations.</p>'; return; }
  const { chats } = await window.rahiApi.getProfileData();
  list.innerHTML = chats.length ? chats.map(chat => `<button class="chat-history-item ${chat.id===activeChatId?'active':''}" data-id="${chat.id}">${escapeHtml(chat.title || 'Travel conversation')}</button>`).join('') : '<p class="chat-side-note">No saved conversations yet.</p>';
  list.querySelectorAll('button[data-id]').forEach(button => button.addEventListener('click', () => loadChat(button.dataset.id)));
}
async function sendMessage(event){
  event.preventDefault();
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if(!message) return;
  if(!window.rahiApi.currentUser()) { window.rahiApi.requireUser(); return; }
  const button = document.getElementById('send-chat-btn');
  input.value = ''; button.disabled = true; button.textContent = 'Creating your plan…';
  try {
    if(!activeChatId) { activeChatId = await window.rahiApi.createChat(message.slice(0, 60)); await renderChatList(); }
    addBubble('user', message); chatMessages.push({ role:'user', text:message });
    await window.rahiApi.saveChatMessage(activeChatId, 'user', message);
    const pending = addBubble('assistant', 'Preparing your personalised travel plan…');
    const reply = await window.rahiApi.askTravelAi(message, chatMessages.slice(0, -1));
    pending.remove(); addBubble('assistant', reply); chatMessages.push({ role:'assistant', text:reply });
    await window.rahiApi.saveChatMessage(activeChatId, 'assistant', reply);
    await renderChatList();
  } catch(error) { addBubble('assistant', error.message || 'Sorry, the Smart Assistant is unavailable right now.'); }
  finally { button.disabled = false; button.textContent = 'Get travel plan'; }
}
function initChat(){
  document.getElementById('chat-form').addEventListener('submit', sendMessage);
  document.getElementById('new-chat-btn').addEventListener('click', () => { activeChatId = null; chatMessages = []; setChatWelcome(); renderChatList(); });
  setChatWelcome();
  renderChatList();
  document.addEventListener('rahi-auth-change', () => { renderChatList(); if(activeChatId && window.rahiApi.currentUser()) loadChat(activeChatId); });
}
