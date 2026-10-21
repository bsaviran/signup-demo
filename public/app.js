// Frontend: the visitor's browser communicates with the existing Express API.
const form = document.querySelector('#signup-form');
const input = document.querySelector('#name');
const message = document.querySelector('#message');
const list = document.querySelector('#users-list');
const count = document.querySelector('#count');
const button = document.querySelector('#submit-btn');
document.querySelector('#year').textContent = new Date().getFullYear();

// Fetch the latest registrations from PostgreSQL via the backend.
async function loadUsers() {
  try {
    const response = await fetch('/api/users', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load users');
    const users = await response.json();
    list.replaceChildren();
    count.textContent = users.length;
    if (users.length === 0) {
      const item = document.createElement('li');
      item.className = 'empty';
      item.textContent = 'עדיין אין חברים. אפשר להיות הראשונים!';
      list.append(item);
    }
    for (const user of users) {
      const item = document.createElement('li');
      const avatar = document.createElement('span');
      avatar.className = 'avatar';
      avatar.textContent = user.name.trim().charAt(0);
      avatar.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.className = 'person-label';
      text.textContent = user.name; // Safe: no HTML injection.
      item.append(avatar, text);
      list.append(item);
    }
  } catch (error) {
    list.replaceChildren();
    count.textContent = '—';
    const item = document.createElement('li');
    item.className = 'empty';
    item.textContent = 'לא ניתן לטעון את רשימת החברים כרגע.';
    list.append(item);
    console.error(error);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = input.value.trim();
  if (name.length < 2 || name.length > 60) return;
  button.disabled = true;
  message.textContent = 'מוסיפים אותך לקהילה...';
  message.className = '';
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');
    input.value = '';
    message.textContent = `איזה כיף, ${data.name}! הצטרפת לקהילה בהצלחה ✨`;
    await loadUsers();
  } catch (error) {
    message.className = 'error';
    message.textContent = 'משהו השתבש ברישום. אפשר לנסות שוב.';
    console.error(error);
  } finally {
    button.disabled = false;
  }
});

loadUsers();
