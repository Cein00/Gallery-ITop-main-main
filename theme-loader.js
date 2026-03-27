(function() {
    const savedTheme = localStorage.getItem('theme') || 'system';
    const htmlElement = document.documentElement;

    const applyTheme = (theme) => {
        if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            htmlElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        } else {
            htmlElement.setAttribute('data-theme', theme);
        }
    };

    applyTheme(savedTheme);

    // Слушаем изменения системы, если выбрана системная тема
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem('theme') === 'system') {
            htmlElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
})();