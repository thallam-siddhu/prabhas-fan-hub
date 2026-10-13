
document.addEventListener("DOMContentLoaded", function () {

    // =========================================
    // BUTTONS
    // =========================================

    const logoutButton =
        document.getElementById("logoutButton");

    const addMoviesButton =
        document.getElementById("addMoviesButton");

    const allMoviesButton =
        document.getElementById("allMoviesButton");

    const addSongsButton =
        document.getElementById("addSongsButton");

    const allSongsButton =
        document.getElementById("allSongsButton");

    const addWallpapersButton =
        document.getElementById("addWallpapersButton");

    const allWallpapersButton =
        document.getElementById("allWallpapersButton");

    const manageNewsButton =
        document.getElementById("manageNewsButton");


    // =========================================
    // API URL
    // =========================================

    const API_URL = "http://127.0.0.1:3000/api";


    // =========================================
    // CHECK OWNER LOGIN
    // =========================================

    async function checkOwner() {

        try {

            const response = await fetch(
                `${API_URL}/owner/check`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            if (!response.ok) {
                window.location.replace("owner.html");
                return false;
            }

            const data = await response.json();

            if (!data.loggedIn) {
                window.location.replace("owner.html");
                return false;
            }

            return true;

        } catch (error) {

            console.error(
                "Owner verification failed:",
                error
            );

            alert(
                "Cannot connect to the server. Start the backend and try again."
            );

            return false;
        }
    }


    // =========================================
    // NAVIGATION HELPER
    // =========================================

    async function navigateTo(page) {

        const authenticated = await checkOwner();

        if (!authenticated) {
            return;
        }

        window.location.href = page;
    }


    // =========================================
    // MOVIES
    // =========================================

    if (addMoviesButton) {

        addMoviesButton.addEventListener(
            "click",
            function () {
                navigateTo(
                    "movies-admin.html?section=add"
                );
            }
        );

    }

    if (allMoviesButton) {

        allMoviesButton.addEventListener(
            "click",
            function () {
                navigateTo(
                    "movies-admin.html?section=all"
                );
            }
        );

    }


    // =========================================
    // SONGS
    // =========================================

    if (addSongsButton) {

        addSongsButton.addEventListener(
            "click",
            function () {
                navigateTo(
                    "songs-admin.html?section=add"
                );
            }
        );

    }

    if (allSongsButton) {

        allSongsButton.addEventListener(
            "click",
            function () {
                navigateTo(
                    "songs-admin.html?section=all"
                );
            }
        );

    }


    // =========================================
    // WALLPAPERS
    // =========================================

    if (addWallpapersButton) {

        addWallpapersButton.addEventListener(
            "click",
            function () {
                navigateTo(
                    "wallpapers-admin.html?section=add"
                );
            }
        );

    }

    if (allWallpapersButton) {

        allWallpapersButton.addEventListener(
            "click",
            function () {
                navigateTo(
                    "wallpapers-admin.html?section=all"
                );
            }
        );

    }


    // =========================================
    // NEWS
    // =========================================

    if (manageNewsButton) {

        manageNewsButton.addEventListener(
            "click",
            function () {
                navigateTo(
                    "news-admin.html"
                );
            }
        );

    }


    // =========================================
    // LOGOUT
    // =========================================

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async function () {

                logoutButton.disabled = true;

                try {

                    const response = await fetch(
                        `${API_URL}/owner/logout`,
                        {
                            method: "POST",
                            credentials: "include"
                        }
                    );

                    if (!response.ok) {

                        alert(
                            "Logout failed. Please try again."
                        );

                        return;
                    }

                    window.location.replace("owner.html");

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                    alert(
                        "Cannot connect to the server."
                    );

                } finally {

                    logoutButton.disabled = false;

                }

            }
        );

    }


    // =========================================
    // VERIFY OWNER WHEN OPENING DASHBOARD
    // =========================================

    checkOwner();

});
