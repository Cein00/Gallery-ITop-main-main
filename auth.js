const TOKEN_KEY = 'gallery_token';
const USER_KEY = 'gallery_user';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function saveSession(data) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function toast(message) {
  const existing = document.querySelector('.toast, .custom-toast');
  if (existing) {
    existing.textContent = message;
    existing.style.display = 'block';
    existing.classList.add('show');
    setTimeout(() => existing.classList.remove('show'), 2200);
    return;
  }
  alert(message);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Ошибка запроса');
  }

  return data;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

function setupPasswordToggle(inputId, toggleId) {
  const input = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);
  if (!input || !toggle) return;

  toggle.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
    if (toggle.tagName === 'IMG') {
      toggle.src = input.type === 'text' ? '../img/eye-crossed.png' : '../img/eye.png';
    }
  });
}

function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const username = document.getElementById('loginInput').value.trim();
      const password = document.getElementById('passInput').value;

      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      saveSession(data);
      window.location.href = 'search/search.html';
    } catch (error) {
      toast(error.message);
    }
  });
}

function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const customSelect = document.getElementById('regRoleContainer');
  const trigger = customSelect?.querySelector('.select-trigger');
  const label = document.getElementById('regRoleLabel');
  const hiddenInput = document.getElementById('regRole');

  if (trigger && customSelect && label && hiddenInput) {
    trigger.addEventListener('click', () => customSelect.classList.toggle('open'));

    customSelect.querySelectorAll('.option').forEach((option) => {
      option.addEventListener('click', () => {
        hiddenInput.value = option.dataset.value || option.textContent.trim();
        label.textContent = option.textContent.trim();
        trigger.classList.add('selected');
        customSelect.classList.remove('open');
      });
    });

    document.addEventListener('click', (e) => {
      if (!customSelect.contains(e.target)) customSelect.classList.remove('open');
    });
  }

  setupPasswordToggle('regPass', 'togglePass');
  setupPasswordToggle('regPassConfirm', 'togglePassConfirm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const username = document.getElementById('regLogin').value.trim();
      const role = document.getElementById('regRole').value;
      const password = document.getElementById('regPass').value;
      const passwordConfirm = document.getElementById('regPassConfirm').value;

      if (!role) {
        toast('Выберите направление');
        return;
      }
      if (password !== passwordConfirm) {
        toast('Пароли не совпадают');
        return;
      }

      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, role })
      });

      saveSession(data);
      window.location.href = '../search/search.html';
    } catch (error) {
      toast(error.message);
    }
  });
}

async function loadProfilePage() {
  const profileView = document.getElementById('profileView');
  const editForm = document.getElementById('editProfileForm');
  if (!profileView) return;

  const token = getToken();
  const urlParams = new URLSearchParams(window.location.search);
  const targetUserId = urlParams.get('id');
  let currentUser = null;
  let isOwnProfile = false;

  // 1. Текущий пользователь (если залогинен)
  if (token) {
    try { currentUser = await api('/auth/me'); } catch(e) { console.warn(e); }
  }

  // 2. Свой или чужой профиль?
  if (targetUserId && currentUser && currentUser._id === targetUserId) isOwnProfile = true;
  else if (!targetUserId && currentUser) isOwnProfile = true;
  else if (targetUserId && (!currentUser || currentUser._id !== targetUserId)) isOwnProfile = false;
  else { window.location.href = '../login.html'; return; }

  let user = null;
  let userWorks = [];

  try {
    // 3. Загружаем данные пользователя
    if (isOwnProfile && currentUser) user = currentUser;
    else if (targetUserId) user = await api(`/users/${targetUserId}`);
    else throw new Error('Не удалось определить пользователя');

    // 4. Отображаем шапку
    const displayAvatar = document.getElementById('displayAvatar');
    const displayNickname = document.getElementById('displayNickname');
    const displayRole = document.getElementById('displayRole');
    if (displayAvatar) displayAvatar.src = user.avatar || '../img/user.png';
    if (displayNickname) displayNickname.textContent = `@${user.username}`;
    if (displayRole) displayRole.textContent = user.role || 'Программист';
    
    updateContactButtons(user.contacts);
    if (typeof renderProfile === 'function') renderProfile(user);

    // 5. Загружаем работы
    try {
      if (isOwnProfile && currentUser) {
        // Вместо await api('/works/my') используем:
        userWorks = await api(`/works?userId=${currentUser._id}`);
      } else if (targetUserId) {
        userWorks = await api(`/works?userId=${targetUserId}`);
      }
    } catch(err) {
      console.error(err);
      userWorks = [];
    }

    // 6. Отрисовка работ
    const container = document.querySelector('.gallery-grid');
    if (container) {
      container.innerHTML = '';
      if (userWorks.length) {
        userWorks.forEach(work => {
          if (typeof createCard === 'function') container.appendChild(createCard(work));
        });
      } else {
        container.innerHTML = '<p class="no-works">У пользователя пока нет работ</p>';
      }
    }

    // 7. Кнопка редактирования (только для своего профиля)
    const openEditBtn = document.getElementById('openEditBtn');
    const editModal = document.getElementById('profileEditModal');
    if (openEditBtn) {
      if (isOwnProfile) {
        openEditBtn.style.display = 'flex';
        setupEditProfileHandlers(user, editForm, editModal);
      } else {
        openEditBtn.style.display = 'none';
      }
    }

  } catch (error) {
    console.error('Ошибка загрузки профиля:', error);
    toast(error.message);
    if (error.message.includes('401') && !targetUserId) {
      clearSession();
      window.location.href = '../login.html';
    }
  }
}

function renderProfileHeader(user, isOwn) {
  const displayAvatar = document.getElementById('displayAvatar');
  const displayNickname = document.getElementById('displayNickname');
  const displayRole = document.getElementById('displayRole');
  
  if (displayAvatar) displayAvatar.src = user.avatar || '../img/user.png';
  if (displayNickname) displayNickname.textContent = `@${user.username}`;
  if (displayRole) displayRole.textContent = user.role || 'Программист';
}

// Функция настройки редактирования (выносим код из старой loadProfilePage)
function setupEditProfileHandlers(user, editForm, editModal) {
  const editAvatarPreview = document.getElementById('editAvatarPreview');
  const avatarUpload = document.getElementById('avatarUpload');
  const editNickname = document.getElementById('editNickname');
  const editPass = document.getElementById('editPass');
  const editPassConfirm = document.getElementById('editPassConfirm');
  const editTg = document.getElementById('editTg');
  const editEmail = document.getElementById('editEmail');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const openEditBtn = document.getElementById('openEditBtn');
  
  if (editAvatarPreview) editAvatarPreview.src = user.avatar || '../img/user.png';
  if (editNickname) editNickname.value = user.username || '';
  if (editTg) editTg.value = user.contacts?.tg || '';
  if (editEmail) editEmail.value = user.contacts?.email || '';
  
  let avatarDataUrl = null;
  
  if (avatarUpload) {
    avatarUpload.onchange = async () => {
      const file = avatarUpload.files?.[0];
      if (!file) return;
      avatarDataUrl = await fileToDataUrl(file);
      if (editAvatarPreview) editAvatarPreview.src = avatarDataUrl;
    };
  }
  
  if (openEditBtn) openEditBtn.onclick = () => { if (editModal) editModal.style.display = 'flex'; };
  if (closeModalBtn) closeModalBtn.onclick = () => { if (editModal) editModal.style.display = 'none'; };
  if (editModal) editModal.onclick = (e) => { if (e.target === editModal) editModal.style.display = 'none'; };
  
  if (editForm) {
    editForm.onsubmit = async (e) => {
      e.preventDefault();
      try {
        let tgValue = editTg?.value.trim() || "";
        if (tgValue.startsWith('@')) tgValue = tgValue.substring(1);
        const payload = {
          username: editNickname?.value.trim() || user.username,
          avatar: avatarDataUrl || user.avatar || null,
          contacts: { tg: tgValue || null, email: editEmail?.value.trim() || null }
        };
        const pass = editPass?.value || '';
        const passConfirm = editPassConfirm?.value || '';
        if (pass || passConfirm) {
          if (pass !== passConfirm) { toast('Пароли не совпадают'); return; }
          payload.password = pass;
          payload.passwordConfirm = passConfirm;
        }
        const updated = await api('/users/me', { method: 'PUT', body: JSON.stringify(payload) });
        document.getElementById('displayNickname').textContent = `@${updated.username}`;
        document.getElementById('displayAvatar').src = updated.avatar || '../img/user.png';
        updateContactButtons(updated.contacts);
        toast('Профиль сохранён');
        if (editModal) editModal.style.display = 'none';
      } catch (error) { toast(error.message); }
    };
  }
}

// Обновление кнопок контактов
function updateContactButtons(contacts) {
  const tgLink = document.querySelector('.tg-link');
  const mailLink = document.querySelector('.mail-link');
  
  if (tgLink) {
    if (contacts && contacts.tg) {
      const pureTg = contacts.tg.replace('@', '').trim();
      tgLink.href = `https://t.me/${pureTg}`;
      tgLink.style.display = 'flex';
    } else {
      tgLink.style.display = 'none';
    }
  }
  
  if (mailLink) {
    if (contacts && contacts.email) {
      mailLink.style.display = 'flex';
      mailLink.onclick = (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(contacts.email.trim()).then(() => toast('Почта скопирована'));
      };
    } else {
      mailLink.style.display = 'none';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
    initLoginPage();
    initRegisterPage();
    loadProfilePage();
});

// Получение пользователя по ID
async function getUserById(userId) {
  return await api(`/users/${userId}`);
}

// Загрузка работ пользователя (для чужого профиля)
async function getWorksByUserId(userId) {
  return await api(`/works?userId=${userId}`);
}
