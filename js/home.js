'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // === OBSŁUGA SLIDERA W SEKCJI HERO ===
    const heroSlider = document.getElementById('hero-slider');
    if (heroSlider) {
        const slides = heroSlider.querySelectorAll('.hero-slide');
        const prevButton = heroSlider.querySelector('.slider-nav-arrow.prev');
        const nextButton = heroSlider.querySelector('.slider-nav-arrow.next');
        let currentSlide = 0;
        let slideInterval;
        const intervalTime = 5000; // 5 sekund

        function showSlide(index) {
            slides.forEach((slide, i) => {
                slide.classList.remove('active');
                if (i === index) {
                    slide.classList.add('active');
                }
            });
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        }

        function prevSlide() {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(currentSlide);
        }

        function startSlider() {
            stopSlider();
            slideInterval = setInterval(nextSlide, intervalTime);
        }

        function stopSlider() {
            clearInterval(slideInterval);
        }

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                stopSlider();
                prevSlide();
                startSlider();
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                stopSlider();
                nextSlide();
                startSlider();
            });
        }

        showSlide(currentSlide);
        startSlider();
    }

    // === OBSŁUGA AKORDEONU ===
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const accordionContent = header.nextElementSibling;
            header.classList.toggle('active');
            accordionContent.classList.toggle('active');
        });
    });

    // === OBSŁUGA ZAKŁADEK W GALERII ===
    const tabButtons = document.querySelectorAll('.tab-btn');
    const galleryGrid = document.querySelector('.gallery-grid');
    if (tabButtons.length > 0 && galleryGrid) {
        const originalCards = Array.from(galleryGrid.querySelectorAll('.card'));
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                galleryGrid.innerHTML = '';
                const tab = button.dataset.tab;
                if (tab === 'kolorowe') {
                    originalCards.forEach(card => galleryGrid.appendChild(card));
                } else if (tab === 'bw') {
                    const blackAndWhiteCards = originalCards.slice(3).reverse();
                    blackAndWhiteCards.forEach(card => galleryGrid.appendChild(card));
                }
            });
        });
    }

    // === OBSŁUGA PRZEWIJANIA STRZAŁKĄ ===
    const scrollDownArrow = document.querySelector('.scroll-down-arrow');
    if (scrollDownArrow) {
        scrollDownArrow.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = scrollDownArrow.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            const header = document.querySelector('.main-header');

            if (targetElement && header) {
                const headerHeight = header.offsetHeight;
                const offsetTop = targetElement.offsetTop - headerHeight;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    }
    
    // === ANIMACJE PRZY PRZEWIJANIU (Sekcje) ===
    const elementsToAnimate = document.querySelectorAll('.animate-on-scroll');
    if (elementsToAnimate.length > 0) {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, observerOptions);
        elementsToAnimate.forEach(element => {
            observer.observe(element);
        });
    }

    // === EFEKT PARALAKSY (dostosowany do slidera) ===
    window.addEventListener('scroll', () => {
        const scrollPos = window.scrollY;
        const activeSlide = document.querySelector('.hero-slide.active');
        if (!activeSlide) return;

        const parallaxTextLeft = activeSlide.querySelector('.parallax-text-left');
        const parallaxTextRight = activeSlide.querySelector('.parallax-text-right');
        const parallaxBtnLeft = activeSlide.querySelector('.parallax-btn-left');
        const parallaxBtnRight = activeSlide.querySelector('.parallax-btn-right');

        if (parallaxTextLeft) parallaxTextLeft.style.transform = `translateX(-${scrollPos * 0.5}px)`;
        if (parallaxTextRight) parallaxTextRight.style.transform = `translateX(${scrollPos * 0.5}px)`;
        
        if (parallaxBtnLeft && parallaxBtnRight) {
            const btnScrollFactor = scrollPos * 0.7;
            const opacity = Math.max(0, 1 - scrollPos / 300);
            
            parallaxBtnLeft.style.transform = `translateX(-${btnScrollFactor}px)`;
            parallaxBtnLeft.style.opacity = opacity;
            
            parallaxBtnRight.style.transform = `translateX(${btnScrollFactor}px)`;
            parallaxBtnRight.style.opacity = opacity;
        }

        if (scrollDownArrow) {
            scrollDownArrow.style.opacity = Math.max(0, 1 - scrollPos / 200);
        }
    });
});
