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
    
    // === ANIMACJE PRZY PRZEWIJANIU ===
    const elementsToAnimate = document.querySelectorAll('.animate-on-scroll');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5 // Zwiększono próg: element musi być w 50% widoczny
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Element wchodzi w widoczny obszar
                entry.target.classList.add('is-visible');
                entry.target.classList.remove('animate-hidden'); // Upewnij się, że ukrycie jest usunięte
            } else {
                // Element opuszcza widoczny obszar
                entry.target.classList.remove('is-visible');
                entry.target.classList.add('animate-hidden'); // Dodaj klasę ukrywającą
            }
        });
    }, observerOptions);

    elementsToAnimate.forEach(element => {
        observer.observe(element);
    });

    // Sprawdź stan elementów natychmiast po załadowaniu strony
    // aby te, które są od razu widoczne, pojawiły się poprawnie
    const initialCheckObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                entry.target.classList.remove('animate-hidden');
            }
            // Nie przestajemy obserwować, bo chcemy, żeby znikały po wyjechaniu
        });
    }, observerOptions);

    elementsToAnimate.forEach(element => {
        initialCheckObserver.observe(element);
    });

});
