document.addEventListener("DOMContentLoaded", function () {

    const loader = document.getElementById("appLoader");

    if (!loader) {
        return;
    }

    window.addEventListener("load", function () {

        setTimeout(function () {

            loader.classList.add("hide");

            setTimeout(function () {
                loader.remove();
            }, 500);

        }, 400);

    });

});