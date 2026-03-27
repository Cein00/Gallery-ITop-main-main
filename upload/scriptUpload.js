const TOKEN_KEY = 'gallery_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function toast(message) {
  alert(message);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = '../index.html';
  }
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
    throw new Error(data?.error ? `${data.message}: ${data.error}` : (data?.message || 'Ошибка запроса'));
  }

  return data;
}

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();

  const imagesGrid = document.getElementById('imagesGrid');
  const addCard = document.getElementById('addImageCard');
  const uploadForm = document.getElementById('uploadForm');
  const workDescription = document.getElementById('workDescription');
  const workLink = document.getElementById('workLink');

  let uploadedFiles = [];

  function createImageCard(file) {
    const card = document.createElement('div');
    card.className = 'image-upload-card loaded-card';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.className = 'uploaded-image';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-image';
    deleteBtn.type = 'button';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = 'Удалить';

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      card.remove();
      const idx = uploadedFiles.findIndex((f) => f === file);
      if (idx !== -1) uploadedFiles.splice(idx, 1);
    });

    card.appendChild(img);
    card.appendChild(deleteBtn);
    imagesGrid.insertBefore(card, addCard);
  }

  function triggerFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          uploadedFiles.push(file);
          createImageCard(file);
        }
      }
    };

    input.click();
  }

  addCard?.addEventListener('click', triggerFileInput);

  uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      if (uploadedFiles.length === 0) {
        toast('Загрузите хотя бы одно изображение');
        return;
      }

      const images = [];
      for (const file of uploadedFiles) {
        images.push(await fileToDataUrl(file));
      }

      await api('/works', {
        method: 'POST',
        body: JSON.stringify({
          description: workDescription?.value?.trim() || '',
          link: workLink?.value?.trim() || '',
          images
        })
      });

      toast('Работа успешно загружена');
      window.location.href = '../search/search.html';
    } catch (error) {
      toast(error.message);
    }
  });
});