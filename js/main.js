// Czekaj, aż cały dokument HTML zostanie załadowany
document.addEventListener('DOMContentLoaded', () => {

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
    
    const originalCards = Array.from(galleryGrid.querySelectorAll('.card'));

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            galleryGrid.innerHTML = '';
            const tab = button.dataset.tab;
            if (tab === 'kolorowe') {
                originalCards.forEach(card => {
                    galleryGrid.appendChild(card);
                });
            } else if (tab === 'bw') {
                const blackAndWhiteCards = originalCards.slice(3).reverse();
                blackAndWhiteCards.forEach(card => {
                    galleryGrid.appendChild(card);
                });
            }
        });
    });

    // === OBSŁUGA PŁYWAJĄCEGO HEADERA ===
    const header = document.querySelector('.main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            header.classList.add('sticky');
        } else {
            header.classList.remove('sticky');
        }
    });

    // === OBSŁUGA PRZEWIJANIA STRZAŁKĄ ===
    const scrollDownArrow = document.querySelector('.scroll-down-arrow');
    if (scrollDownArrow) {
        scrollDownArrow.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = scrollDownArrow.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
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

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5 
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                entry.target.classList.remove('animate-hidden');
            } else {
                entry.target.classList.remove('is-visible');
                entry.target.classList.add('animate-hidden');
            }
        });
    }, observerOptions);

    elementsToAnimate.forEach(element => {
        observer.observe(element);
    });

    const initialCheckObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                entry.target.classList.remove('animate-hidden');
            }
        });
    }, observerOptions);

    elementsToAnimate.forEach(element => {
        initialCheckObserver.observe(element);
    });

    // === NOWA SEKCJA: EFEKT PARALAKSY W HERO ===
    const heroSection = document.querySelector('.hero');
    const parallaxTextLeft = document.querySelector('.parallax-text-left');
    const parallaxTextRight = document.querySelector('.parallax-text-right');
    const parallaxBtnLeft = document.querySelector('.parallax-btn-left');
    const parallaxBtnRight = document.querySelector('.parallax-btn-right');

    if (heroSection && parallaxTextLeft && parallaxTextRight && parallaxBtnLeft && parallaxBtnRight) {
        window.addEventListener('scroll', () => {
            const scrollPos = window.scrollY;

            // Efekt odjeżdżania dla tekstu
            parallaxTextLeft.style.transform = `translateX(-${scrollPos * 0.5}px)`; // Szybciej w lewo
            parallaxTextRight.style.transform = `translateX(${scrollPos * 0.5}px)`; // Szybciej w prawo

            // Efekt odjeżdżania i zanikania dla przycisków
            const btnScrollFactor = scrollPos * 0.7; // Przyciski odjeżdżają szybciej
            parallaxBtnLeft.style.transform = `translateX(-${btnScrollFactor}px)`;
            parallaxBtnRight.style.transform = `translateX(${btnScrollFactor}px)`;

            // Dodatkowo, zanikanie i zmniejszanie przycisków
            const opacity = Math.max(0, 1 - scrollPos / heroSection.offsetHeight * 2); // Zanikanie 2x szybciej
            const scale = Math.max(0, 1 - scrollPos / heroSection.offsetHeight * 0.5); // Zmniejszanie wolniej
            
            parallaxBtnLeft.style.opacity = opacity;
            parallaxBtnRight.style.opacity = opacity;
            
            parallaxBtnLeft.style.transform += ` scale(${scale})`; // Dodaj scale do transform
            parallaxBtnRight.style.transform += ` scale(${scale})`; // Dodaj scale do transform

            // Ukrywanie strzałki scroll down
            const scrollArrow = document.querySelector('.scroll-down-arrow');
            if (scrollArrow) {
                scrollArrow.style.opacity = opacity; // Strzałka zanika tak samo jak przyciski
                // Dodatkowe przesunięcie strzałki w dół przy przewijaniu
                scrollArrow.style.transform = `translateX(-50%) translateY(${scrollPos * 0.3}px)`;
            }

        });
    }

});
