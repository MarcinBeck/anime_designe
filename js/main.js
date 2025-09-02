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
    
    // === NOWA SEKCJA: ANIMACJE PRZY PRZEWIJANIU ===
    const elementsToFadeIn = document.querySelectorAll('.fade-in');

    const observerOptions = {
        root: null, // Obserwuj względem całego viewportu
        rootMargin: '0px',
        threshold: 0.1 // Uruchom, gdy 10% elementu jest widoczne
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            // Jeśli element wszedł w obszar widoczny
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Przestań obserwować ten element, aby animacja wykonała się tylko raz
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Powiedz obserwatorowi, aby zaczął obserwować każdy element
    elementsToFadeIn.forEach(element => {
        observer.observe(element);
    });

});
