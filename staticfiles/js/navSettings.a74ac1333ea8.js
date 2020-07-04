// $(document).ready(function () {
//     if(screen.width >= 767){ 
//             const $nav = $(".navbar");
//             $nav.addClass('scrolled');
//             $('scrolled').css("color", "white");   
//     }
//     else{
//         $('.navbar').addClass('border');
//     }
// });

let nav = document.getElementById("navbar");
if(screen.width >= 767){
    nav.classList.add("scrolled");
    document.getElementsByClassName("scrolled")[0].style.color = "white";
}
else if(screen.width < 767){
    nav.classList.remove("border-0");
    nav.classList.add("border-bottom");
}