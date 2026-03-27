const TOKEN_KEY = 'gallery_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
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

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderPodium(topThree) {
  const podiumContainer = document.getElementById('podiumContainer');
  if (!podiumContainer) return;

  if (!topThree.length) {
    podiumContainer.innerHTML = '';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const classes = ['gold', 'silver', 'bronze'];

  const podiumHtml = topThree.map((author, idx) => {
    const rank = idx + 1;
    const avatar = author.avatar || '../img/user.png';
    const medal = medals[idx];
    const medalClass = classes[idx];
    const crown = rank === 1 ? '<div class="crown">👑</div>' : '';

    return `
      <div class="podium-item ${medalClass}" data-rank="${rank}">
        ${crown}
        <div class="podium-avatar">
          <img src="${escapeHtml(avatar)}" alt="avatar">
          <div class="rank-badge">${rank}</div>
        </div>
        <div class="podium-name">@${escapeHtml(author.username)}</div>
        <div class="podium-role">${escapeHtml(author.role || '')}</div>
        <div class="podium-likes">${author.totalLikes} ❤</div>
        <div class="podium-medal">${medal}</div>
      </div>
    `;
  }).join('');

  podiumContainer.innerHTML = podiumHtml;
}

function renderList(others) {
  const container = document.getElementById('topList');
  if (!container) return;

  if (!others.length) {
    container.innerHTML = '<p class="empty-message">Остальные авторы пока не набрали достаточно лайков.</p>';
    return;
  }

  container.innerHTML = others.map((author, index) => {
    const globalRank = index + 4;
    const avatar = author.avatar || '../img/user.png';

    return `
      <div class="top-list-item">
        <div class="list-rank">${globalRank}</div>
        <img class="list-avatar" src="${escapeHtml(avatar)}" alt="avatar">
        <div class="list-name">@${escapeHtml(author.username)}</div>
        <div class="list-role">${escapeHtml(author.role || '')}</div>
        <div class="list-likes">${author.totalLikes} ❤</div>
      </div>
    `;
  }).join('');
}

async function loadTop() {
  const listContainer = document.getElementById('topList');
  const podiumContainer = document.getElementById('podiumContainer');

  if (listContainer) listContainer.innerHTML = '<p class="loading">Загрузка...</p>';
  if (podiumContainer) podiumContainer.innerHTML = '';

  try {
    const authors = await api('/works/top/authors');

    if (!authors.length) {
      if (listContainer) listContainer.innerHTML = '<p>Пока нет данных для топа.</p>';
      return;
    }

    const topThree = authors.slice(0, 3);
    const others = authors.slice(3);

    renderPodium(topThree);
    renderList(others);
  } catch (error) {
    if (listContainer) {
      listContainer.innerHTML = `<p class="error-message">${escapeHtml(error.message)}</p>`;
    }
    if (podiumContainer) podiumContainer.innerHTML = '';
  }
}

function renderGlobalStats(authors, totalSiteStats) {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;

    // Лидер за всё время — первый в массиве (индекс 0)
    const leader = authors[0];
    const leaderAvatar = leader?.avatar || '../img/user.png';
    const leaderName = leader?.username || '—';

    // Считаем общие цифры: либо из спец. ответа сервера, 
    // либо суммируем данные из пришедшего массива авторов
    const totalLikes = totalSiteStats?.totalLikes || authors.reduce((s, a) => s + (Number(a.totalLikes) || 0), 0);
    const totalWorks = totalSiteStats?.totalWorks || authors.reduce((s, a) => s + (Number(a.worksCount) || 0), 0);

    statsContainer.innerHTML = `
        <div class="stat-card">
            <span class="stat-label">Всего лайков</span>
            <span class="stat-value">${totalLikes.toLocaleString()} ❤</span>
        </div>
        
        <div class="stat-card leader-card highlight">
            <div class="leader-avatar-wrapper">
                <img src="${escapeHtml(leaderAvatar)}" class="mini-leader-avatar">
                <div class="crown-mini">👑</div>
            </div>
            <div class="leader-info">
                <span class="stat-label">Лидер за всё время</span>
                <span class="stat-value">@${escapeHtml(leaderName)}</span>
            </div>
        </div>

        <div class="stat-card">
            <span class="stat-label">Всего работ</span>
            <span class="stat-value">${totalWorks.toLocaleString()} 🖼</span>
        </div>
    `;
}

// Обновляем загрузку
async function loadTop() {
    try {
        const authors = await api('/works/top/authors');
        // Если у тебя есть отдельный эндпоинт для общей статы - вызывай его, 
        // если нет, функция выше сама посчитает сумму по авторам.
        const totalSiteStats = await api('/stats/total').catch(() => null); 

        if (authors && authors.length > 0) {
            const topTen = authors.slice(0, 10);
            renderGlobalStats(topTen, totalSiteStats);
            
            renderPodium(topTen.slice(0, 3));
            renderList(topTen.slice(3));
        }
    } catch (e) {
        console.error("Ошибка загрузки:", e);
    }
}

document.addEventListener('DOMContentLoaded', loadTop);