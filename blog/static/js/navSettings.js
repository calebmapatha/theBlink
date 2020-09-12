
// MENU
const hamburger = document.querySelector(".hamburger");
const sideMenu = document.querySelector('.sideMenu');
const overlay = document.querySelector('.overlay');
 
hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("is-active");
    sideMenu.classList.toggle("d-block");
    sideMenu.classList.toggle("showMenuTransition");
    document.body.classList.toggle("lockScroll");
    // overlay.classList.toggle("display-item");
})