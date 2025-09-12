// === OBSŁUGA PŁYWAJĄCEGO HEADERA ===
const header = document.querySelector('.main-header');
if (header) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            header.classList.add('sticky');
        } else {
            header.classList.remove('sticky');
        }
    });
}
