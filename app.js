document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('crosshairGrid');
    const template = document.getElementById('cardTemplate');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    const toast = document.getElementById('toast');
    const teamPillsContainer = document.getElementById('teamPills');

    // Modal Elements
    const modal = document.getElementById('previewModal');
    const modalCanvas = document.getElementById('modalCanvas');
    const modalPlayerName = document.getElementById('modalPlayerName');
    const modalPlayerTeam = document.getElementById('modalPlayerTeam');
    const fireBtn = document.getElementById('fireBtn');
    const modalCopyBtn = document.getElementById('modalCopyBtn');
    const closeModalBtn = document.querySelector('.close-modal-btn');

    let activeModalConfig = null;
    let isFiring = false;
    let modalSpread = 0;
    let modalAnimationId = null;

    let activeTeam = null; // Currently selected team filter

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

            // Set Avatar (using ui-avatars.com for initials-based pictures)
            const avatar = clone.querySelector('.player-avatar');
            const bgColor = item.category === 'pro' ? 'FF4655' : item.category === 'streamer' ? '6366f1' : '10b981';
            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=${bgColor}&color=fff&size=56&bold=true&font-size=0.4`;
            avatar.alt = item.name;

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

                // Launch Modal
                preview.addEventListener('click', () => {
                    openModal(item, config);
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

            activeTeam = null; // Reset team filter on category change
            updateTeamPills(category);
            filterData(category, searchInput.value);
        });
    });

    // Team Pills Logic
    function updateTeamPills(category) {
        if (category !== 'pro') {
            teamPillsContainer.classList.add('hidden');
            teamPillsContainer.innerHTML = '';
            return;
        }

        // Extract unique teams from pro players
        const proTeams = [...new Set(
            crosshairsData
                .filter(item => item.category === 'pro')
                .map(item => item.team)
        )].sort();

        teamPillsContainer.innerHTML = '';

        // "All Teams" pill
        const allPill = document.createElement('button');
        allPill.className = 'team-pill active';
        allPill.textContent = 'All Teams';
        allPill.addEventListener('click', () => {
            activeTeam = null;
            teamPillsContainer.querySelectorAll('.team-pill').forEach(p => p.classList.remove('active'));
            allPill.classList.add('active');
            filterData('pro', searchInput.value);
        });
        teamPillsContainer.appendChild(allPill);

        // Individual team pills
        proTeams.forEach(team => {
            const pill = document.createElement('button');
            pill.className = 'team-pill';
            pill.textContent = team;
            pill.addEventListener('click', () => {
                activeTeam = team;
                teamPillsContainer.querySelectorAll('.team-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                filterData('pro', searchInput.value);
            });
            teamPillsContainer.appendChild(pill);
        });

        teamPillsContainer.classList.remove('hidden');
    }

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
            const matchesTeam = !activeTeam || item.team === activeTeam;
            const matchesSearch = item.name.toLowerCase().includes(term) || item.team.toLowerCase().includes(term);
            return matchesCategory && matchesTeam && matchesSearch;
        });
        renderGrid(filtered);
    }

    // Modal Logic
    function openModal(item, config) {
        activeModalConfig = config;
        modalPlayerName.textContent = item.name;
        modalPlayerTeam.textContent = item.team;

        // Setup copy button for modal
        modalCopyBtn.onclick = () => {
            navigator.clipboard.writeText(item.code).then(() => showToast());
        };

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        // Initial render
        modalSpread = 0;
        isFiring = false;
        CrosshairRenderer.render(modalCanvas, activeModalConfig, modalSpread);
    }

    function closeModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        activeModalConfig = null;
        isFiring = false;
        if (modalAnimationId) cancelAnimationFrame(modalAnimationId);
    }

    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('range-bg') || e.target.classList.contains('modal-content')) {
            closeModal();
        }
    });

    // Firing Simulation Loop
    function simulateFire() {
        if (!activeModalConfig) return;

        const maxSpread = 15;
        const targetSpread = isFiring ? maxSpread : 0;

        // Firing spread is fast (recoil kick), recovery is slower
        const diff = targetSpread - modalSpread;
        if (isFiring) {
            modalSpread += diff * 0.4;
        } else {
            modalSpread += diff * 0.15;
        }

        CrosshairRenderer.render(modalCanvas, activeModalConfig, modalSpread);

        if (Math.abs(diff) > 0.1) {
            modalAnimationId = requestAnimationFrame(simulateFire);
        } else {
            modalSpread = targetSpread;
            CrosshairRenderer.render(modalCanvas, activeModalConfig, modalSpread);
        }
    }

    // Handle Fire Button (Touch & Mouse)
    const startFiring = (e) => {
        e.preventDefault();
        fireBtn.classList.remove('pulse-btn');
        fireBtn.style.transform = 'scale(0.95)';
        isFiring = true;
        if (modalAnimationId) cancelAnimationFrame(modalAnimationId);
        simulateFire();
    };

    const stopFiring = (e) => {
        e.preventDefault();
        fireBtn.style.transform = '';
        isFiring = false;
        if (modalAnimationId) cancelAnimationFrame(modalAnimationId);
        simulateFire();
    };

    fireBtn.addEventListener('mousedown', startFiring);
    fireBtn.addEventListener('touchstart', startFiring);

    window.addEventListener('mouseup', () => { if (isFiring) stopFiring(new Event('')); });
    window.addEventListener('touchend', () => { if (isFiring) stopFiring(new Event('')); });

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
