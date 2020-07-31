$(document).ready(function () {
    if(screen.width >= 767){
        const $nav = $(".navbar");
        $(document).scroll(function () {
            const $navbar = $(".navbar.container");
                $nav.toggleClass('scrolled', $(this).scrollTop() > $nav.height());
                $nav.toggleClass('navbar-dark', $(this).scrollTop() > $nav.height());
        });
        $('html').style.zoom = "90%";
    }

    const openNav = () =>{
        // const sideMenu = $(".sideMenu");
        console.log("clicked!")
    }
});
function openSearch(){
    document.getElementById("myOverlay").style.display ="block";
}

function closeSearch(){
    document.getElementById("myOverlay").style.display = "none";
}

AOS.init();

