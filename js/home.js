'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const heroSlider = document.getElementById('hero-slider');
    if (!heroSlider) return;

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
        stopSlider(); // Zatrzymuje poprzedni interwał, jeśli istnieje
        slideInterval = setInterval(nextSlide, intervalTime);
    }

    function stopSlider() {
        clearInterval(slideInterval);
    }

    // Event Listeners dla przycisków nawigacyjnych
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            stopSlider();
            prevSlide();
            startSlider(); // Restart po ręcznej nawigacji
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            stopSlider();
            nextSlide();
            startSlider(); // Restart po ręcznej nawigacji
        });
    }

    // Inicjalizacja: pokaż pierwszy slajd i uruchom rotator
    showSlide(currentSlide);
    startSlider();
});

// Reszta kodu, który był w tym pliku, powinien zostać usunięty
// (jeśli był tam jakiś kod związany z przewijaniem parallax)
// Jeśli chcesz zachować parallax, musimy go dostosować do struktury slidera.
// Na razie zakładam, że usuwamy stary kod, aby skupić się na sliderze.

// Poniżej jest kod do sticky header, który powinien być w global.js
// Ale jeśli był w home.js, to należy go przenieść lub usunąć.
// document.addEventListener('scroll', function() {
//     const header = document.querySelector('.main-header');
//     if (window.scrollY > 0) {
//         header.classList.add('sticky');
//     } else {
//         header.classList.remove('sticky');
//     }
// });
