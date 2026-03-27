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
  if (!token) {
      console.warn("Нет токена — профиль не загружаем");
      return;
  }

  // Находим все элементы
  const displayAvatar = document.getElementById('displayAvatar');
  const displayNickname = document.getElementById('displayNickname');
  const displayRole = document.getElementById('displayRole');
  const editAvatarPreview = document.getElementById('editAvatarPreview');
  const avatarUpload = document.getElementById('avatarUpload');
  const editNickname = document.getElementById('editNickname');
  const editPass = document.getElementById('editPass');
  const editPassConfirm = document.getElementById('editPassConfirm');
  const modal = document.getElementById('profileEditModal');
  const openBtn = document.getElementById('openEditBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const editTg = document.getElementById('editTg');
  const editEmail = document.getElementById('editEmail');

  let avatarDataUrl = null;

  try {
    // 1. Загружаем данные пользователя
    const user = await api('/auth/me'); 
    
    // Отрисовываем шапку (если есть такая функция)
    if (typeof renderProfile === 'function') renderProfile(user);
    
    // Заполняем данные (используем 'user', а не 'me')
    if (displayNickname) displayNickname.textContent = `@${user.username}`;
    if (displayRole) displayRole.textContent = user.role || 'Программист';

    const avatarSrc = user.avatar || '../img/user.png';
    if (displayAvatar) displayAvatar.src = avatarSrc;
    if (editAvatarPreview) editAvatarPreview.src = avatarSrc;
    if (editNickname) editNickname.value = user.username || '';

    if (editTg) editTg.value = user.contacts?.tg || '';
    if (editEmail) editEmail.value = user.contacts?.email || '';

    // Настраиваем кнопки контактов
    updateContactButtons(user.contacts);

    // --- ЗАГРУЗКА РАБОТ (добавил сюда) ---
    try {
        const works = await api('/works/my');
        const container = document.querySelector('.gallery-grid');
        if (container) {
            container.innerHTML = '';
            if (works && works.length > 0) {
                works.forEach(work => {
                    // Передаем работу в функцию создания карточки (из full-see.js)
                    container.appendChild(createCard(work));
                });
            } else {
                container.innerHTML = '<p class="no-works">У вас пока нет работ</p>';
            }
        }
    } catch (workErr) {
        console.error("Ошибка загрузки работ:", workErr);
    }

    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---

    avatarUpload?.addEventListener('change', async () => {
      const file = avatarUpload.files?.[0];
      if (!file) return;
      // Предполагаем, что fileToDataUrl объявлена глобально
      avatarDataUrl = await fileToDataUrl(file);
      if (editAvatarPreview) editAvatarPreview.src = avatarDataUrl;
    });

    openBtn?.addEventListener('click', () => { if (modal) modal.style.display = 'flex'; });
    closeBtn?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
    modal?.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    editForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        let tgValue = editTg?.value.trim() || "";
        if (tgValue.startsWith('@')) tgValue = tgValue.substring(1);

        const payload = {
            username: editNickname?.value.trim() || user.username,
            avatar: avatarDataUrl || user.avatar || null,
            contacts: {
                tg: tgValue || null,
                email: editEmail?.value.trim() || null
            }
        };

        const pass = editPass?.value || '';
        const passConfirm = editPassConfirm?.value || '';
        if (pass || passConfirm) {
            payload.password = pass;
            payload.passwordConfirm = passConfirm;
        }

        const updated = await api('/users/me', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (displayNickname) displayNickname.textContent = `@${updated.username}`;
        if (displayAvatar) displayAvatar.src = updated.avatar || '../img/user.png';
        updateContactButtons(updated.contacts);

        toast('Профиль сохранён');
        if (modal) modal.style.display = 'none';
      } catch (error) {
        toast(error.message);
      }
    });

  } catch (error) {
    console.error("Ошибка:", error);
    if (error.message.includes('401')) {
        clearSession();
        window.location.href = '../login.html';
    } else {
        toast(error.message);
    }
  }

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
            const email = contacts.email.trim();
            mailLink.style.display = 'flex';
            mailLink.onclick = (e) => {
                e.preventDefault();
                navigator.clipboard.writeText(email).then(() => toast('Почта скопирована'));
            };
        } else {
            mailLink.style.display = 'none';
        }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
    initLoginPage();
    initRegisterPage();
    loadProfilePage();
});
