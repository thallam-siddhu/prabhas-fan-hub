
"use strict";

/* =========================================
   PRABHAS FAN HUB — MOVIES
   ========================================= */

const API_URL = "http://127.0.0.1:3000/api/movies";
const BACKEND_URL = "http://127.0.0.1:3000";

/* HTML elements */
const movieContainer = document.getElementById("movieContainer");
const movieSearch = document.getElementById("movieSearch");
const watchModal = document.getElementById("watchModal");
const watchTitle = document.getElementById("watchTitle");
const watchFrame = document.getElementById("watchFrame");
const watchClose = document.getElementById("watchClose");

let allMovies = [];
let isMovieOpen = false;
let handlingBackButton = false;

/* =========================================
   LOAD MOVIES
   ========================================= */

document.addEventListener("DOMContentLoaded", loadMovies);

async function loadMovies() {
    if (!movieContainer) {
        console.error("Movie container #movieContainer was not found.");
        return;
    }

    movieContainer.innerHTML =
        '<p class="movie-message">Loading movies...</p>';

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();

        // Accept either an array or an object containing a movies array.
        allMovies = Array.isArray(data)
            ? data
            : Array.isArray(data.movies)
                ? data.movies
                : [];

        renderMovies(allMovies);
    } catch (error) {
        console.error("Could not load movies:", error);

        movieContainer.innerHTML = `
            <p class="movie-message">
                Could not load movies. Make sure your backend server is running
                on port 3000 and try refreshing the page.
            </p>
        `;
    }
}

/* =========================================
   RENDER MOVIE CARDS
   ========================================= */

function renderMovies(movies) {
    if (!movieContainer) return;

    movieContainer.innerHTML = "";

    if (!movies.length) {
        movieContainer.innerHTML = `
            <p class="movie-message">No movies found.</p>
        `;
        return;
    }

    movies.forEach((movie) => {
        const card = document.createElement("article");
        card.className = "movie-card";

        const poster = document.createElement("img");
        poster.className = "movie-poster";
        poster.src = getPosterUrl(movie);
        poster.alt = getMovieTitle(movie) + " poster";
        poster.loading = "lazy";

        poster.onerror = function () {
            this.onerror = null;
            this.src = createPosterPlaceholder(getMovieTitle(movie));
        };

        const details = document.createElement("div");
        details.className = "movie-info";

        const title = document.createElement("h3");
        title.className = "movie-title";
        title.textContent = getMovieTitle(movie);

        const meta = document.createElement("p");
        meta.className = "movie-meta";

        const year = movie.year || movie.releaseYear || "";
        const genre = movie.genre || movie.category || "";

        meta.textContent = [year, genre]
            .filter(Boolean)
            .join(" • ");

        const description = document.createElement("p");
        description.className = "movie-description";
        description.textContent =
            movie.description || movie.overview || "Prabhas movie";

        const watchButton = document.createElement("button");
        watchButton.type = "button";
        watchButton.className = "watch-button";
        watchButton.textContent = "▶ WATCH NOW";

        watchButton.addEventListener("click", () => {
            openMovie(movie);
        });

        details.append(title, meta, description);
        card.append(poster, details, watchButton);
        movieContainer.appendChild(card);
    });
}

/* =========================================
   SEARCH MOVIES
   ========================================= */

if (movieSearch) {
    movieSearch.addEventListener("input", function () {
        const searchText = this.value.trim().toLowerCase();

        const filteredMovies = allMovies.filter((movie) => {
            const searchableText = [
                getMovieTitle(movie),
                movie.year,
                movie.releaseYear,
                movie.genre,
                movie.category,
                movie.description,
                movie.overview
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(searchText);
        });

        renderMovies(filteredMovies);
    });
}

/* =========================================
   OPEN MOVIE PLAYER
   ========================================= */

function openMovie(movie) {
    if (!watchModal || !watchFrame) {
        console.error("Watch modal or video frame was not found.");
        return;
    }

    const title = getMovieTitle(movie);
    const videoUrl = getVideoUrl(movie);

    if (!videoUrl) {
        alert("The movie video link is not available yet.");
        return;
    }

    if (watchTitle) {
        watchTitle.textContent = title;
    }

    // Stop any previous video before opening another.
    watchFrame.src = "";

    // YouTube, direct video files, and supported external links.
    watchFrame.src = prepareVideoUrl(videoUrl);

    watchModal.style.display = "flex";
    watchModal.classList.add("active");
    watchModal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
    isMovieOpen = true;
    handlingBackButton = false;

    // Create a browser-history entry so Back closes the player first.
    if (window.location.hash !== "#watch") {
        history.pushState(
            { prabhasMoviePlayer: true },
            "",
            "#watch"
        );
    }

    // Request fullscreen from the user's Watch button click.
    requestPlayerFullscreen();
}

/* =========================================
   PREPARE VIDEO URL
   ========================================= */

function prepareVideoUrl(rawUrl) {
    const url = String(rawUrl).trim();

    if (!url) return "";

    const youtubeId = getYouTubeId(url);

    if (youtubeId) {
        return (
            "https://www.youtube-nocookie.com/embed/" +
            encodeURIComponent(youtubeId) +
            "?autoplay=1&controls=1&rel=0&playsinline=0"
        );
    }

    // Direct video links may work with the iframe if the server allows it.
    // External websites may block iframe playback.
    return url;
}

function getYouTubeId(rawUrl) {
    try {
        const url = new URL(rawUrl);

        const hostname = url.hostname
            .toLowerCase()
            .replace(/^www\./, "");

        if (hostname === "youtu.be") {
            return url.pathname.split("/").filter(Boolean)[0] || null;
        }

        if (
            hostname === "youtube.com" ||
            hostname === "m.youtube.com" ||
            hostname === "youtube-nocookie.com"
        ) {
            if (url.pathname === "/watch") {
                return url.searchParams.get("v");
            }

            const match = url.pathname.match(
                /^\/(?:embed|shorts|live)\/([^/?]+)/
            );

            return match ? match[1] : null;
        }

        return null;
    } catch {
        return null;
    }
}

/* =========================================
   CLOSE MOVIE PLAYER
   ========================================= */

function closeMovie() {
    if (!isMovieOpen) return;

    isMovieOpen = false;

    // Stop playback immediately.
    if (watchFrame) {
        watchFrame.src = "";
    }

    if (watchModal) {
        watchModal.classList.remove("active");
        watchModal.style.display = "none";
        watchModal.setAttribute("aria-hidden", "true");
    }

    document.body.style.overflow = "";

    // Return focus to the page instead of navigating away.
    if (watchClose) {
        watchClose.blur();
    }
}

/* =========================================
   BACK BUTTON HANDLING
   ========================================= */

// Browser Back or Android/browser back navigation closes the player first.
window.addEventListener("popstate", function () {
    if (isMovieOpen) {
        handlingBackButton = true;
        closeMovie();
        handlingBackButton = false;
    }
});

// Close button: go back one history entry when the player created it.
if (watchClose) {
    watchClose.addEventListener("click", function () {
        if (isMovieOpen && window.location.hash === "#watch") {
            history.back();
        } else {
            closeMovie();
        }
    });
}

// Clicking the dark area outside the player closes it.
if (watchModal) {
    watchModal.addEventListener("click", function (event) {
        if (event.target === watchModal) {
            if (window.location.hash === "#watch") {
                history.back();
            } else {
                closeMovie();
            }
        }
    });
}

// Escape closes the player.
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isMovieOpen) {
        if (window.location.hash === "#watch") {
            history.back();
        } else {
            closeMovie();
        }
    }
});

/* =========================================
   FULLSCREEN
   ========================================= */

function requestPlayerFullscreen() {
    const target = watchFrame;

    if (!target) return;

    try {
        if (target.requestFullscreen) {
            target.requestFullscreen().catch(() => {
                // Some browsers or embedded players deny fullscreen.
            });
        } else if (target.webkitRequestFullscreen) {
            target.webkitRequestFullscreen();
        }
    } catch (error) {
        console.warn("Fullscreen was not available:", error);
    }
}

/* =========================================
   MOVIE DATA HELPERS
   ========================================= */

function getMovieTitle(movie) {
    return (
        movie.title ||
        movie.name ||
        movie.movieName ||
        "Untitled Movie"
    );
}

function getVideoUrl(movie) {
    return (
        movie.videoUrl ||
        movie.video_url ||
        movie.youtubeUrl ||
        movie.youtube_url ||
        movie.watchUrl ||
        movie.watch_url ||
        movie.url ||
        movie.link ||
        movie.trailerUrl ||
        movie.trailer_url ||
        ""
    );
}

function getPosterUrl(movie) {
    const poster =
        movie.poster ||
        movie.posterUrl ||
        movie.poster_url ||
        movie.image ||
        movie.imageUrl ||
        movie.thumbnail ||
        "";

    if (!poster) {
        return createPosterPlaceholder(getMovieTitle(movie));
    }

    if (/^https?:\/\//i.test(poster)) {
        return poster;
    }

    if (poster.startsWith("/")) {
        return BACKEND_URL + poster;
    }

    if (poster.startsWith("uploads/")) {
        return BACKEND_URL + "/" + poster;
    }

    return BACKEND_URL + "/uploads/posters/" + poster;
}

function createPosterPlaceholder(title) {
    const safeTitle = String(title)
        .replace(/[<>&"']/g, "")
        .slice(0, 40);

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="450">
            <rect width="100%" height="100%" fill="#151515"/>
            <text x="50%" y="46%" fill="#d4af37"
                font-size="22" text-anchor="middle"
                font-family="Arial">PRABHAS</text>
            <text x="50%" y="54%" fill="white"
                font-size="15" text-anchor="middle"
                font-family="Arial">${safeTitle}</text>
        </svg>
    `;

    return "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(svg);
}
