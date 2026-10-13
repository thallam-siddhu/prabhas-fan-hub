
// ==========================================
// PRABHAS FAN HUB — SONGS.JS
// Loads owner-uploaded songs from the backend
// ==========================================

(() => {
    "use strict";

    const BACKEND_URL = "http://127.0.0.1:3000";
    const SONGS_API = `${BACKEND_URL}/api/songs`;
    const DEFAULT_COVER = "assets/app/app-icon.png";

    // Prevent this script from initializing more than once
    if (window.prabhasSongsLoaderInitialized) {
        return;
    }

    window.prabhasSongsLoaderInitialized = true;

    /**
     * Convert backend upload paths into usable URLs.
     */
    function normalizeUrl(value) {
        if (!value || typeof value !== "string") {
            return "";
        }

        const url = value.trim();

        if (/^(https?:|blob:|data:)/i.test(url)) {
            return url;
        }

        if (url.startsWith("/uploads/")) {
            return `${BACKEND_URL}${url}`;
        }

        if (url.startsWith("uploads/")) {
            return `${BACKEND_URL}/${url}`;
        }

        return url.replace(/^\.\/+/, "");
    }

    /**
     * Normalize song fields so the player can use
     * songs from the existing backend JSON format.
     */
    function normalizeSong(song) {
        const item = { ...song };

        item.title =
            item.title ||
            item.name ||
            item.songName ||
            "Untitled song";

        item.movie =
            item.movie ||
            item.movieName ||
            item.film ||
            "Prabhas Songs";

        item.artist =
            item.artist ||
            item.singer ||
            "Prabhas";

        item.audio = normalizeUrl(
            item.audio ||
            item.audioUrl ||
            item.audioPath ||
            item.file ||
            item.fileUrl ||
            item.url
        );

        item.cover = normalizeUrl(
            item.cover ||
            item.poster ||
            item.image ||
            item.coverImage ||
            item.posterUrl ||
            item.imageUrl
        ) || DEFAULT_COVER;

        return item;
    }

    /**
     * Tell song-page.js to display the songs.
     */
    function publishSongs(songs) {
        const normalizedSongs = songs
            .filter(song => song && typeof song === "object")
            .map(normalizeSong);

        window.prabhasSongs = normalizedSongs;

        window.dispatchEvent(
            new CustomEvent("songsLoaded", {
                detail: {
                    songs: normalizedSongs
                }
            })
        );
    }

    /**
     * Request songs saved by the owner.
     */
    async function loadSongs() {
        const container = document.getElementById("songContainer");

        if (container) {
            container.innerHTML = `
                <div class="songs-loading">
                    <p>Loading Prabhas songs...</p>
                </div>
            `;
        }

        try {
            const response = await fetch(SONGS_API, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(
                    `Could not load songs. HTTP ${response.status}`
                );
            }

            const data = await response.json();

            // Supports either an array or an object containing songs
            let songs = [];

            if (Array.isArray(data)) {
                songs = data;
            } else if (data && Array.isArray(data.songs)) {
                songs = data.songs;
            } else if (data && Array.isArray(data.data)) {
                songs = data.data;
            }

            publishSongs(songs);

            if (songs.length === 0 && container) {
                container.innerHTML = `
                    <div class="songs-empty">
                        <h3>No songs available yet</h3>
                        <p>New songs uploaded by the owner will appear here.</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error("Prabhas Fan Hub: song loading failed.", error);

            window.prabhasSongs = [];

            window.dispatchEvent(
                new CustomEvent("songsLoaded", {
                    detail: { songs: [] }
                })
            );

            if (container) {
                container.innerHTML = `
                    <div class="songs-error">
                        <h3>Unable to load songs</h3>
                        <p>Please check that the backend server is running.</p>
                        <button type="button" id="retrySongsButton">
                            Try Again
                        </button>
                    </div>
                `;

                document
                    .getElementById("retrySongsButton")
                    ?.addEventListener("click", loadSongs);
            }
        }
    }

    // Load songs after the page has been initialized.
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadSongs, {
            once: true
        });
    } else {
        loadSongs();
    }

    // Allow manual refreshing if needed.
    window.reloadPrabhasSongs = loadSongs;
})();
