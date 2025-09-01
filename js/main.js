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


    // === NOWA SEKCJA: OBSŁUGA ZAKŁADEK W GALERII ===
    const tabButtons = document.querySelectorAll('.tab-btn');
    const galleryGrid = document.querySelector('.gallery-grid');
    
    // Zapisujemy oryginalne karty galerii, aby móc do nich wrócić
    const originalCards = Array.from(galleryGrid.querySelectorAll('.card'));

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 1. Zdejmij klasę 'active' ze wszystkich przycisków
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // 2. Dodaj klasę 'active' do klikniętego przycisku
            button.classList.add('active');

            // 3. Wyczyść obecną zawartość galerii
            galleryGrid.innerHTML = '';

            const tab = button.dataset.tab;

            if (tab === 'kolorowe') {
                // Jeśli kliknięto "Kolorowe", wstaw oryginalne karty
                originalCards.forEach(card => {
                    galleryGrid.appendChild(card);
                });
            } else if (tab === 'bw') {
                // Jeśli kliknięto "Black & White", weź 3 ostatnie karty, odwróć kolejność i wstaw
                const blackAndWhiteCards = originalCards.slice(3).reverse();
                blackAndWhiteCards.forEach(card => {
                    galleryGrid.appendChild(card);
                });
            }
        });
    });

});
