// FRONTEND: runs in the visitor's browser.
const form = document.querySelector('#signup-form');
const input = document.querySelector('#name');
const message = document.querySelector('#message');
const list = document.querySelector('#users-list');
const count = document.querySelector('#count');
const button = document.querySelector('#submit-btn');

// Ask the backend for saved people and show them on the page.
async function loadUsers() {
  try {
    const response = await fetch('/api/users'); // HTTP GET
    if (!response.ok) throw new Error('Could not load users');
    const users = await response.json();
    list.replaceChildren();
    count.textContent = users.length;
    if (users.length === 0) {
      const item = document.createElement('li');
      item.className = 'empty';
      item.textContent = 'עדיין אין נרשמים. אפשר להיות הראשונים!';
      list.append(item);
    }
    for (const user of users) {
      const item = document.createElement('li');
      item.textContent = user.name; // textContent prevents HTML injection.
      list.append(item);
    }
  } catch (error) {
    list.replaceChildren();
    const item = document.createElement('li');
    item.className = 'empty';
    item.textContent = 'לא ניתן לטעון את הרשימה כרגע.';
    list.append(item);
    console.error(error);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault(); // Stay on the page; don't submit the old-fashioned way.
  const name = input.value.trim();
  if (name.length < 2 || name.length > 60) return;
  button.disabled = true;
  message.textContent = 'שומר...';
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
    message.textContent = `נרשמת בהצלחה, ${data.name}!`;
    await loadUsers();
  } catch (error) {
    message.className = 'error';
    message.textContent = 'לא הצלחנו לשמור את השם. נסה שוב.';
    console.error(error);
  } finally {
    button.disabled = false;
  }
});

loadUsers(); // Load names as soon as the page opens.
