function currentPageType() {
  return document.getElementById('profileView') ? 'profile' : 'search';
}
function createCard(work) {
  const article = document.createElement('article');
  article.className = 'card-modern';
  article.dataset.workId = work._id;

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'image-wrapper';

  const img = document.createElement('img');
  img.src = (work.images && work.images[0]) ? work.images[0] : '../img/user.png';
  img.alt = work.title || 'Работа';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.borderRadius = '14px';

  imageWrapper.appendChild(img);
  article.appendChild(imageWrapper);

  // ПРОВЕРКА: Если это НЕ страница профиля, добавляем КЛИКАБЕЛЬНЫЙ никнейм
  if (currentPageType() !== 'profile') {
    const nameContainer = document.createElement('p');
    nameContainer.className = 'user-name';
    
    // Создаем ссылку вместо простого текста
    const userLink = document.createElement('a');
    userLink.href = `../profile/profile.html?id=${work.user?._id}`;
    userLink.textContent = `@${work.user?.username || 'USER'}`;
    userLink.style.textDecoration = 'none';
    userLink.style.color = 'inherit';
    
    // Останавливаем всплытие клика, чтобы при нажатии на ник 
    // не открывалось модальное окно самой работы
    userLink.addEventListener('click', (e) => e.stopPropagation());

    nameContainer.appendChild(userLink);
    article.appendChild(nameContainer);
  }

  // Клик по самой карточке открывает модалку
  article.addEventListener('click', () => openWorkModal(work._id));
  return article;
}

function setupSearchFilter(container) {
  const searchInput = document.querySelector('.search-bar-modern input');
  if (!searchInput || searchInput.dataset.bound === '1') return;
  searchInput.dataset.bound = '1';

  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    container.querySelectorAll('.card-modern').forEach((card) => {
      const name = card.querySelector('.user-name')?.textContent.toLowerCase() || '';
      card.style.display = !term || name.includes(term) ? '' : 'none';
    });
  });
}

async function renderWorks() {
  const container = document.querySelector('#worksGrid, .gallery-grid');
  if (!container) return;

  try {
    const isProfile = currentPageType() === 'profile';
    // Если мы в профиле, добавляем параметр ?mine=1 (или другой, который ждет твой бэкенд)
    const endpoint = isProfile ? '/works?mine=1' : '/works';
    
    const works = await api(endpoint);

    container.innerHTML = '';
    if (!works || works.length === 0) {
      container.innerHTML = '<p class="small" style="grid-column: 1/-1; text-align: center;">Тут пока пусто...</p>';
      return;
    }

    works.forEach((work) => container.appendChild(createCard(work)));
    
    // Если есть фильтр поиска, запускаем его
    if (typeof setupSearchFilter === 'function') setupSearchFilter(container);
    
  } catch (error) {
    container.innerHTML = `<p class="small">${error.message}</p>`;
  }
}

let currentWork = null;
let currentComments = [];
let currentImageIndex = 0;

async function openWorkModal(workId) {
  try {
    const data = await api(`/works/${workId}`);
    currentWork = data.work;
    currentComments = data.comments || [];
    currentImageIndex = 0;

    const modal = document.getElementById('workModal');
    if (!modal) return;

    const workImage = modal.querySelector('.work-image');
    const workAuthor = modal.querySelector('.work-author');
    const workDesc = modal.querySelector('.work-description');
    const workLink = modal.querySelector('.work-link');
    const imageCounter = modal.querySelector('.image-counter');
    const likeCount = modal.querySelector('.like-count');
    const likeIcon = document.getElementById('likeIcon');

    const prevBtn = modal.querySelector('.prev');
    const nextBtn = modal.querySelector('.next');
    const likeBtn = modal.querySelector('.like-btn');
    const copyBtn = modal.querySelector('.copy-link-btn');
    const commentsBtn = modal.querySelector('#openCommentsBtn');
    const commentsModal = document.getElementById('commentsModal');
    const closeModalBtn = modal.querySelector('.work-close');
    const commentsCloseBtn = commentsModal?.querySelector('.comments-close');

    function updateImage() {
      if (!currentWork.images || currentWork.images.length === 0) return;
      if (workImage) workImage.src = currentWork.images[currentImageIndex];
      if (imageCounter) {
        imageCounter.textContent = `${currentImageIndex + 1} / ${currentWork.images.length}`;
      }
      if (prevBtn) prevBtn.style.visibility = currentWork.images.length > 1 ? 'visible' : 'hidden';
      if (nextBtn) nextBtn.style.visibility = currentWork.images.length > 1 ? 'visible' : 'hidden';
    }

    function updateLikeUI() {
      if (likeCount) likeCount.textContent = String(currentWork.likesCount || 0);
      if (likeIcon) {
        likeIcon.src = currentWork.likedByMe ? '../img/heart-filled.png' : '../img/heart.png';
      }
    }

    function renderComments() {
      const list = commentsModal?.querySelector('.comments-list-full');
      if (!list) return;
      list.innerHTML = currentComments.length
        ? currentComments.map((c) => `
            <div class="comment-item">
              <a href="../profile/profile.html?id=${c.user?._id}" class="comment-author-link">
                <strong>@${c.user?.username || 'user'}</strong>
              </a>
              <span>${c.text}</span>
            </div>
          `).join('')
        : '<p class="small">Комментариев пока нет.</p>';
    }

    function openComments() {
      renderComments();
      if (commentsModal) commentsModal.style.display = 'flex';
    }

    workAuthor.innerHTML = `
      <a href="../profile/profile.html?id=${currentWork.user?._id}" class="modal-author-link">
        @${currentWork.user?.username || 'USER'}
      </a>`;

    workDesc.textContent = currentWork.description || '';
    workLink.innerHTML = currentWork.link
      ? `<a href="${currentWork.link}" target="_blank" rel="noopener noreferrer">${currentWork.link}</a>`
      : '<span class="small">Ссылка не указана</span>';

    updateImage();
    updateLikeUI();
    modal.style.display = 'flex';

    prevBtn.onclick = () => {
      if (!currentWork.images || currentWork.images.length === 0) return;
      if (currentImageIndex > 0) currentImageIndex -= 1;
      updateImage();
    };

    nextBtn.onclick = () => {
      if (!currentWork.images || currentWork.images.length === 0) return;
      if (currentImageIndex < currentWork.images.length - 1) currentImageIndex += 1;
      updateImage();
    };

    likeBtn.onclick = async () => {
      try {
        if (!getToken()) {
          toast('Сначала войдите в аккаунт');
          return;
        }
        const result = await api(`/works/${currentWork._id}/like`, {
          method: 'POST',
          body: JSON.stringify({ type: 'like' })
        });
        currentWork.likesCount = result.likesCount;
        currentWork.likedByMe = result.likedByMe;
        updateLikeUI();
      } catch (error) {
        toast(error.message);
      }
    };

    copyBtn.onclick = async () => {
      try {
        const copyValue = currentWork.link || `${window.location.origin}/search/search.html#work-${currentWork._id}`;
        await navigator.clipboard.writeText(copyValue);
        toast('Ссылка скопирована');
      } catch {
        toast('Не удалось скопировать ссылку');
      }
    };

    commentsBtn.onclick = openComments;
    commentsCloseBtn.onclick = () => { if (commentsModal) commentsModal.style.display = 'none'; };
    commentsModal.onclick = (e) => { if (e.target === commentsModal) commentsModal.style.display = 'none'; };
    closeModalBtn.onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    const sendCommentBtn = commentsModal?.querySelector('.send-comment-full');
    const commentTextarea = commentsModal?.querySelector('.add-comment-full textarea');

    if (sendCommentBtn) {
      sendCommentBtn.onclick = async () => {
        const text = commentTextarea?.value?.trim();
        if (!text) return;

        try {
          if (!getToken()) {
            toast('Сначала войдите в аккаунт');
            return;
          }
          const comment = await api(`/works/${currentWork._id}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text })
          });

          currentComments.push(comment);
          if (commentTextarea) commentTextarea.value = '';
          renderComments();
        } catch (error) {
          toast(error.message);
        }
      };
    }
  } catch (error) {
    toast(error.message);
  }
}
if (!document.getElementById('profileView')) {
  renderWorks();
}
