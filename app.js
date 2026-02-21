document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('crosshairGrid');
    const template = document.getElementById('cardTemplate');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    const toast = document.getElementById('toast');

    // Use locally loaded data to avoid CORS issues when opening file:// directly
    let crosshairsData = window.CROSSHAIRS_DATA || [];
    renderGrid(crosshairsData);

    // Render Grid
    function renderGrid(data) {
        grid.innerHTML = '';
        if (data.length === 0) {
            grid.innerHTML = '<div class="loading-state">No crosshairs found.</div>';
            return;
        }

        data.forEach(item => {
            const clone = template.content.cloneNode(true);

            // Set Info
            clone.querySelector('.player-name').textContent = item.name;
            clone.querySelector('.team-badge').textContent = item.team;

            // Handle Canvas Draw
            const canvas = clone.querySelector('canvas');
            const preview = clone.querySelector('.card-preview');
            try {
                const config = CrosshairParser.parse(item.code);
                CrosshairRenderer.render(canvas, config);

                // Add spray animation logic
                let spread = 0;
                let targetSpread = 0;
                let animationId = null;

                const animate = () => {
                    const diff = targetSpread - spread;
                    spread += diff * 0.2; // ease out

                    if (Math.abs(diff) > 0.1) {
                        CrosshairRenderer.render(canvas, config, spread);
                        animationId = requestAnimationFrame(animate);
                    } else {
                        spread = targetSpread;
                        CrosshairRenderer.render(canvas, config, spread);
                    }
                };

                preview.addEventListener('mouseenter', () => {
                    targetSpread = 5; // Max artificial spread
                    if (animationId) cancelAnimationFrame(animationId);
                    animate();
                });

                preview.addEventListener('mouseleave', () => {
                    targetSpread = 0;
                    if (animationId) cancelAnimationFrame(animationId);
                    animate();
                });
            } catch (e) {
                console.error("Failed to render crosshair for", item.name, e);
            }

            // Handle Copy
            const copyBtn = clone.querySelector('.copy-btn');
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(item.code).then(() => {
                    showToast();
                });
            });

            grid.appendChild(clone);
        });
    }

    // Filtering
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.currentTarget.dataset.filter;
            if (!category) return; // Ignore background toggle button

            filterBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            filterData(category, searchInput.value);
        });
    });

    // Searching
    searchInput.addEventListener('input', (e) => {
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        filterData(activeFilter, e.target.value);
    });

    // Background Toggle
    const bgToggle = document.getElementById('bgToggle');
    const themes = ['theme-dark', 'theme-light', 'theme-range'];
    let currentThemeIndex = 0;

    if (bgToggle) {
        bgToggle.addEventListener('click', () => {
            document.body.classList.remove(themes[currentThemeIndex]);
            currentThemeIndex = (currentThemeIndex + 1) % themes.length;
            if (themes[currentThemeIndex] !== 'theme-dark') {
                document.body.classList.add(themes[currentThemeIndex]);
            }
        });
    }

    function filterData(category, searchTerm) {
        const term = searchTerm.toLowerCase();
        const filtered = crosshairsData.filter(item => {
            const matchesCategory = category === 'all' || item.category === category;
            const matchesSearch = item.name.toLowerCase().includes(term) || item.team.toLowerCase().includes(term);
            return matchesCategory && matchesSearch;
        });
        renderGrid(filtered);
    }

    // Toast logic
    let toastTimeout;
    function showToast() {
        toast.classList.remove('hidden');
        // Force reflow
        void toast.offsetWidth;
        toast.classList.add('show');

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 400); // Wait for transition
        }, 2500);
    }
});
