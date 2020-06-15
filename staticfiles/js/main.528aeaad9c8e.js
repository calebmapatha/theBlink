$(document).ready(function () {
    if(screen.width >= 767){
        $(document).scroll(function () {
            const $nav = $(".navbar");
            const $navbar = $(".navbar.container");
                $nav.toggleClass('scrolled', $(this).scrollTop() > $nav.height());
                $nav.toggleClass('navbar-dark', $(this).scrollTop() > $nav.height());
        });
    }

});
function openSearch(){
    document.getElementById("myOverlay").style.display ="block";
}

function closeSearch(){
    document.getElementById("myOverlay").style.display = "none";
}

AOS.init();

