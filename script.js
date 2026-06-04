/* ============================================================
   ZaylaStudio — Particle Animation & Interactions (Optimized)
   ============================================================ */

(function () {
    'use strict';

    // ---- Particle System ----
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    let particles = [];
    let mouse = { x: null, y: null, radius: 120 };
    let animationId;
    let isPageVisible = true;

    // Pause when tab is not visible
    document.addEventListener('visibilitychange', () => {
        isPageVisible = !document.hidden;
        if (isPageVisible && !animationId) animate();
    });

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // Debounced resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resize();
            initParticles();
        }, 250);
    });
    resize();

    // Throttled mouse tracking (every 32ms ≈ 30fps)
    let mouseThrottled = false;
    window.addEventListener('mousemove', (e) => {
        if (mouseThrottled) return;
        mouseThrottled = true;
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        setTimeout(() => { mouseThrottled = false; }, 32);
    }, { passive: true });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    }, { passive: true });

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4;
            this.opacity = Math.random() * 0.5 + 0.1;

            // Pre-compute color string once
            const rand = Math.random();
            if (rand < 0.6) {
                this.color = `rgba(212, 25, 32, ${this.opacity})`;
            } else if (rand < 0.85) {
                this.color = `rgba(255, 42, 42, ${this.opacity * 0.7})`;
            } else {
                this.color = `rgba(200, 200, 200, ${this.opacity * 0.5})`;
            }
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            // Mouse repulsion (use squared distance to avoid sqrt)
            if (mouse.x !== null && mouse.y !== null) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const distSq = dx * dx + dy * dy;
                const radiusSq = mouse.radius * mouse.radius;

                if (distSq < radiusSq) {
                    const dist = Math.sqrt(distSq); // only sqrt when needed
                    const force = (mouse.radius - dist) / mouse.radius;
                    const angle = Math.atan2(dy, dx);
                    this.x += Math.cos(angle) * force * 2;
                    this.y += Math.sin(angle) * force * 2;
                }
            }

            // Wrap around edges
            const w = canvas.width;
            const h = canvas.height;
            if (this.x < 0) this.x = w;
            else if (this.x > w) this.x = 0;
            if (this.y < 0) this.y = h;
            else if (this.y > h) this.y = 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, 6.2832); // 2*PI pre-calculated
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        // Cap particle count: fewer particles = much faster
        const count = Math.min(Math.floor((canvas.width * canvas.height) / 12000), 80);
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function connectParticles() {
        const len = particles.length;
        const connectionDistSq = 90 * 90; // Slightly shorter connection range

        ctx.lineWidth = 0.5;

        for (let i = 0; i < len; i++) {
            const pi = particles[i];
            for (let j = i + 1; j < len; j++) {
                const pj = particles[j];
                const dx = pi.x - pj.x;
                const dy = pi.y - pj.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < connectionDistSq) {
                    // Approximate opacity without sqrt
                    const opacity = (1 - distSq / connectionDistSq) * 0.15;
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(212, 25, 32, ${opacity})`;
                    ctx.moveTo(pi.x, pi.y);
                    ctx.lineTo(pj.x, pj.y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        if (!isPageVisible) {
            animationId = null;
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const len = particles.length;
        for (let i = 0; i < len; i++) {
            particles[i].update();
            particles[i].draw();
        }

        connectParticles();
        animationId = requestAnimationFrame(animate);
    }

    initParticles();
    animate();


    // ---- Navigation Interactions ----
    const nav = document.getElementById('main-nav');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    
    if (nav) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        }, { passive: true });
    }

    // ---- Authentication & Profile Logic ----
    function initAuth() {
        const user = JSON.parse(localStorage.getItem('zs_user'));
        const navAction = document.querySelector('.nav-action');
        const heroLeft = document.querySelector('.hero-left');

        if (user && user.isLoggedIn) {
            // 1. Update Profile Icon to show dropdown on click
            if (navAction) {
                navAction.innerHTML = `<div class="profile-avatar">${user.name.charAt(0).toUpperCase()}</div>`;
                navAction.href = "#"; // Prevent navigation
                
                // Add Dropdown
                const dropdown = document.createElement('div');
                dropdown.className = 'profile-dropdown';
                dropdown.innerHTML = `
                    <div class="dropdown-header">
                        <p class="user-name">${user.name}</p>
                        <p class="user-email">${user.email || 'Member'}</p>
                    </div>
                    <ul class="dropdown-menu">
                        <li><a href="account"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Profile Settings</a></li>
                        <li><a href="#" id="logout-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg> Logout</a></li>
                    </ul>
                `;
                navAction.parentElement.appendChild(dropdown);

                navAction.addEventListener('click', (e) => {
                    e.preventDefault();
                    dropdown.classList.toggle('active');
                });

                // Close on outside click
                document.addEventListener('click', (e) => {
                    if (!navAction.contains(e.target) && !dropdown.contains(e.target)) {
                        dropdown.classList.remove('active');
                    }
                });

                // Logout logic
                document.getElementById('logout-btn').addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('zs_user');
                    window.location.reload();
                });
            }

            // 2. Welcome Message on Hero
            if (heroLeft) {
                const welcome = document.createElement('div');
                welcome.className = 'welcome-toast fade-in';
                welcome.innerHTML = `Welcome back, <span class="red">${user.name.split(' ')[0]}</span>`;
                heroLeft.insertBefore(welcome, heroLeft.firstChild);
            }
        }
    }

    initAuth();

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('open');
            document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
        });

        // Close menu on link click
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // ---- Active Link Highlighting ----
    function highlightActiveLink() {
        const path = window.location.pathname.replace(/\/+$/, '');
        const links = document.querySelectorAll('.nav-link');
        
        links.forEach(link => {
            try {
                const hrefAttr = link.getAttribute('href');
                if (!hrefAttr) return;
                
                const url = new URL(hrefAttr, window.location.origin);
                const linkPath = url.pathname.replace(/\/+$/, '');
                
                if (linkPath === path || (linkPath === '/home' && (path === '' || path === '/'))) {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.classList.remove('active');
                    link.removeAttribute('aria-current');
                }
            } catch (e) {
                // Handle relative links without a base URL or invalid links
                const href = link.getAttribute('href');
                if (href === 'home' || href === '/home' || href === '/') {
                    if (path === '' || path === '/' || path === '/home') {
                        link.classList.add('active');
                    }
                }
            }
        });
    }
    
    highlightActiveLink();



})();
