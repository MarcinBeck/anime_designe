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
    
    // Zapisujemy oryginalne karty galerii, aby móc do nich wrócić
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
    // Dodajemy klasę 'sticky' gdy strona jest przewinięta o więcej niż 10 pikseli
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            header.classList.add('sticky');
        } else {
            header.classList.remove('sticky');
        }
    });

});
