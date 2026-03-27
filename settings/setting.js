console.log("Скрипт настроек загружен!");
document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ПЕРЕКЛЮЧЕНИЕ ТЕМЫ ---
    const themeBtns = document.querySelectorAll('.theme-btn');
    const htmlElement = document.documentElement;

    // При загрузке проверяем, какая тема сохранена
    const savedTheme = localStorage.getItem('theme') || 'system';
    htmlElement.setAttribute('data-theme', savedTheme);
    
    // Подсвечиваем активную кнопку
    themeBtns.forEach(btn => {
        if (btn.getAttribute('data-theme-val') === savedTheme) {
            btn.classList.add('active');
        }

        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme-val');
            localStorage.setItem('theme', theme);
            
            // Если выбрана системная, проверяем настройки Windows/macOS
            if (theme === 'system') {
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                htmlElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            } else {
                htmlElement.setAttribute('data-theme', theme);
            }

            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // --- 2. МОДАЛКА (ВЫХОД И УДАЛЕНИЕ) ---
    const modal = document.getElementById('confirmModal');
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');
    const title = document.getElementById('confirmTitle');
    const text = document.getElementById('confirmText');

    let actionType = ''; // 'logout' или 'delete'

    // Кнопка ВЫЙТИ
    document.getElementById('logoutBtn').addEventListener('click', () => {
        actionType = 'logout';
        title.innerText = 'ВЫЙТИ ИЗ АККАУНТА?';
        text.innerText = 'Вы вернетесь на страницу входа.';
        confirmYes.classList.remove('danger-text'); // Делаем кнопку обычной или зеленой
        modal.style.display = 'flex';
    });

    // Кнопка УДАЛИТЬ
    document.getElementById('deleteAccBtn').addEventListener('click', () => {
        actionType = 'delete';
        title.innerText = 'УДАЛИТЬ АККАУНТ?';
        text.innerText = 'Это действие удалит все ваши данные навсегда!';
        confirmYes.classList.add('danger-text');
        modal.style.display = 'flex';
    });

    // Отмена
    confirmNo.addEventListener('click', () => modal.style.display = 'none');

    // Подтверждение (Да)
    confirmYes.addEventListener('click', () => {
        if (actionType === 'logout') {
            localStorage.removeItem('currentUser');
            window.location.href = '../index.html'; // Перекидываем на вход
        } else if (actionType === 'delete') {
            localStorage.clear(); // Очищаем всё
            window.location.href = '../registration/registration.html'; // На регистрацию
        }
    });
});