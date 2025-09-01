// Czekaj, aż cały dokument HTML zostanie załadowany
document.addEventListener('DOMContentLoaded', () => {

    // Znajdź wszystkie nagłówki akordeonu
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    // Dodaj nasłuchiwanie na kliknięcie do każdego nagłówka
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            // Znajdź treść akordeonu, która jest bezpośrednio po nagłówku
            const accordionContent = header.nextElementSibling;

            // Przełącz klasę 'active' na nagłówku (do obracania strzałki)
            header.classList.toggle('active');

            // Przełącz klasę 'active' na treści (do pokazywania/ukrywania)
            accordionContent.classList.toggle('active');
        });
    });

});
