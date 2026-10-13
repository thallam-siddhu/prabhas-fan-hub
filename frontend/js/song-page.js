
/* ==========================================
   PRABHAS FAN HUB — SONG PLAYER
   Playlist + mini-player + automatic playback
========================================== */

(() => {
    "use strict";

    const BACKEND_URL = "http://127.0.0.1:3000";
    const DEFAULT_COVER = "assets/app/app-icon.png";
    const $ = (id) => document.getElementById(id);

    // Prevent duplicate initialization.
    if (window.prabhasSongPlayerInitialized) return;
    window.prabhasSongPlayerInitialized = true;

    const el = {
        songContainer: $("songContainer"),
        songCount: $("songCount"),
        currentSongCover: $("currentSongCover"),
        currentSongTitle: $("currentSongTitle"),
        currentSongMovie: $("currentSongMovie"),
        previousBtn: $("previousBtn"),
        playPauseBtn: $("playPauseBtn"),
        nextBtn: $("nextBtn"),
        progressBar: $("progressBar"),
        currentTime: $("currentTime"),
        duration: $("duration"),
        volumeControl: $("volumeControl"),
        openFullPlayer: $("openFullPlayer"),
        fullScreenPlayer: $("fullScreenPlayer")
    };

    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = 0.8;

    let songs = [];
    let currentIndex = -1;
    let isShuffle = false;
    let repeatMode = "all"; // Automatically loops through the playlist.
    let playRequestId = 0;

    function normalizeUrl(value) {
        if (!value || typeof value !== "string") return "";

        const path = value.trim();

        if (/^(https?:|blob:|data:)/i.test(path)) return path;
        if (path.startsWith("/uploads/")) return BACKEND_URL + path;
        if (path.startsWith("uploads/")) return `${BACKEND_URL}/${path}`;

        return path.replace(/^\.\/+/, "");
    }

    function getTitle(song) {
        return song.title || song.name || song.songName || "Untitled song";
    }

    function getMovie(song) {
        return song.movie || song.movieName || song.artist ||
            song.singer || "Prabhas Songs";
    }

    function getAudio(song) {
        return normalizeUrl(
            song.audio || song.audioUrl || song.audioPath ||
            song.file || song.fileUrl || song.url
        );
    }

    function getCover(song) {
        return normalizeUrl(
            song.cover || song.poster || song.image ||
            song.coverImage || song.posterUrl || song.imageUrl
        ) || DEFAULT_COVER;
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

        return `${Math.floor(seconds / 60)}:${String(
            Math.floor(seconds % 60)
        ).padStart(2, "0")}`;
    }

    function setText(element, value) {
        if (element) element.textContent = value;
    }

    function setImage(element, url) {
        if (!element) return;

        element.onerror = () => {
            element.onerror = null;
            element.src = DEFAULT_COVER;
        };

        element.src = url || DEFAULT_COVER;
    }

    function getCurrentSong() {
        return currentIndex >= 0 && currentIndex < songs.length
            ? songs[currentIndex]
            : null;
    }

    function updatePlayerDetails(song) {
        if (!song) return;

        setText(el.currentSongTitle, getTitle(song));
        setText(el.currentSongMovie, getMovie(song));
        setImage(el.currentSongCover, getCover(song));

        // Update the browser's media controls when supported.
        if ("mediaSession" in navigator &&
            typeof window.MediaMetadata === "function") {
            try {
                const artwork = new URL(
                    getCover(song),
                    document.baseURI
                ).href;

                navigator.mediaSession.metadata = new MediaMetadata({
                    title: getTitle(song),
                    artist: getMovie(song),
                    album: "PRABHAS FAN HUB",
                    artwork: [
                        { src: artwork, sizes: "96x96" },
                        { src: artwork, sizes: "256x256" },
                        { src: artwork, sizes: "512x512" }
                    ]
                });
            } catch (error) {
                console.warn("Media artwork could not be loaded.", error);
            }
        }
    }

    function updateActiveSongUI() {
        const cards = el.songContainer?.querySelectorAll(".song-card") || [];

        cards.forEach((card, index) => {
            const active = index === currentIndex;
            const playing = active && !audio.paused;
            const button = card.querySelector(".song-card-play");

            card.classList.toggle("active", active);
            card.classList.toggle("playing", playing);

            if (button) {
                button.textContent = playing ? "Ⅱ" : "▶";
                button.setAttribute(
                    "aria-label",
                    `${playing ? "Pause" : "Play"} ${getTitle(songs[index])}`
                );
            }
        });

        if (el.playPauseBtn) {
            el.playPauseBtn.textContent = audio.paused ? "▶" : "Ⅱ";
            el.playPauseBtn.setAttribute(
                "aria-label",
                audio.paused ? "Play" : "Pause"
            );
        }
    }

    function renderSongList() {
        if (!el.songContainer) return;

        el.songContainer.replaceChildren();

        if (!songs.length) {
            const message = document.createElement("p");
            message.className = "songs-loading";
            message.textContent = "No songs available yet.";
            el.songContainer.appendChild(message);
            setText(el.songCount, "0 songs");
            return;
        }

        songs.forEach((song, index) => {
            const card = document.createElement("article");
            card.className = "song-card";
            card.dataset.index = String(index);

            const cover = document.createElement("img");
            cover.src = getCover(song);
            cover.alt = `${getTitle(song)} poster`;
            cover.loading = "lazy";
            cover.onerror = () => {
                cover.onerror = null;
                cover.src = DEFAULT_COVER;
            };

            const info = document.createElement("div");
            info.className = "song-card-info";

            const title = document.createElement("h3");
            title.textContent = getTitle(song);

            const subtitle = document.createElement("p");
            subtitle.textContent = getMovie(song);

            info.append(title, subtitle);

            const button = document.createElement("button");
            button.type = "button";
            button.className = "song-card-play";
            button.dataset.playIndex = String(index);
            button.textContent = "▶";
            button.setAttribute("aria-label", `Play ${getTitle(song)}`);

            card.append(cover, info, button);
            el.songContainer.appendChild(card);
        });

        setText(
            el.songCount,
            `${songs.length} ${songs.length === 1 ? "song" : "songs"}`
        );

        updateActiveSongUI();
    }

    function updateProgress() {
        const current = Number.isFinite(audio.currentTime)
            ? audio.currentTime : 0;
        const total = Number.isFinite(audio.duration)
            ? audio.duration : 0;
        const percent = total > 0 ? (current / total) * 100 : 0;

        if (el.progressBar) el.progressBar.value = String(percent);

        setText(el.currentTime, formatTime(current));
        setText(el.duration, formatTime(total));
    }

    function seekTo(value) {
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

        const percent = Math.max(0, Math.min(100, Number(value) || 0));
        audio.currentTime = (percent / 100) * audio.duration;
        updateProgress();
    }

    async function playCurrentSong() {
        const song = getCurrentSong();
        if (!song) return;

        const audioUrl = getAudio(song);

        if (!audioUrl) {
            alert("This song does not have an audio file.");
            return;
        }

        const requestId = ++playRequestId;

        try {
            updatePlayerDetails(song);

            const resolvedUrl = new URL(audioUrl, document.baseURI).href;

            if (audio.src !== resolvedUrl) {
                audio.src = resolvedUrl;
                audio.load();
            }

            await audio.play();

            if (requestId !== playRequestId) return;

            updateActiveSongUI();
        } catch (error) {
            if (requestId !== playRequestId) return;

            console.error("Unable to play song:", error);
            alert(
                "Unable to play this song. Check the audio file and backend server."
            );
            updateActiveSongUI();
        }
    }

    async function selectSong(index, autoplay = true) {
        const nextIndex = Number(index);

        if (!Number.isInteger(nextIndex) ||
            nextIndex < 0 || nextIndex >= songs.length) {
            return;
        }

        currentIndex = nextIndex;
        playRequestId++;

        updatePlayerDetails(getCurrentSong());
        updateProgress();
        updateActiveSongUI();

        if (autoplay) {
            await playCurrentSong();
        } else {
            audio.pause();
            audio.src = getAudio(getCurrentSong());
            audio.load();
            updateActiveSongUI();
        }
    }

    async function togglePlayPause() {
        if (!songs.length) return;

        if (currentIndex === -1) {
            await selectSong(0, true);
        } else if (audio.paused) {
            await playCurrentSong();
        } else {
            audio.pause();
        }
    }

    function getNextIndex() {
        if (!songs.length) return -1;

        if (isShuffle && songs.length > 1) {
            let index;

            do {
                index = Math.floor(Math.random() * songs.length);
            } while (index === currentIndex);

            return index;
        }

        // Wrap from the final song to the first song.
        return (currentIndex + 1) % songs.length;
    }

    function playNext() {
        if (!songs.length) return;

        if (repeatMode === "one" && currentIndex >= 0) {
            audio.currentTime = 0;
            playCurrentSong();
            return;
        }

        selectSong(getNextIndex(), true);
    }

    function playPrevious() {
        if (!songs.length) return;

        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }

        let index;

        if (isShuffle && songs.length > 1) {
            do {
                index = Math.floor(Math.random() * songs.length);
            } while (index === currentIndex);
        } else {
            index = currentIndex <= 0
                ? songs.length - 1
                : currentIndex - 1;
        }

        selectSong(index, true);
    }

    // Playlist click: play/pause without opening song details.
    el.songContainer?.addEventListener("click", (event) => {
        const card = event.target.closest(".song-card");
        if (!card || !el.songContainer.contains(card)) return;

        const index = Number(
            event.target.closest("[data-play-index]")?.dataset.playIndex
            ?? card.dataset.index
        );

        if (index === currentIndex && !audio.paused) {
            audio.pause();
        } else {
            selectSong(index, true);
        }
    });

    el.previousBtn?.addEventListener("click", playPrevious);
    el.nextBtn?.addEventListener("click", playNext);
    el.playPauseBtn?.addEventListener("click", togglePlayPause);

    el.progressBar?.addEventListener("input", (event) => {
        seekTo(event.target.value);
    });

    el.volumeControl?.addEventListener("input", (event) => {
        audio.volume = Math.max(
            0,
            Math.min(1, Number(event.target.value))
        );
    });

    // Disable the old full-screen-player trigger.
    el.openFullPlayer?.addEventListener("click", (event) => {
        event.preventDefault();

        if (el.fullScreenPlayer) {
            el.fullScreenPlayer.hidden = true;
            el.fullScreenPlayer.setAttribute("aria-hidden", "true");
        }

        document.body.style.overflow = "";
    });

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("durationchange", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);

    audio.addEventListener("play", () => {
        updateActiveSongUI();

        if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
        }
    });

    audio.addEventListener("pause", () => {
        updateActiveSongUI();

        if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "paused";
        }
    });

    // Automatically continue when a song ends.
    audio.addEventListener("ended", () => {
        if (repeatMode === "one") {
            audio.currentTime = 0;
            playCurrentSong();
        } else {
            playNext();
        }
    });

    audio.addEventListener("error", () => {
        console.error("Audio error. Check the song URL and backend.");
        updateActiveSongUI();
    });

    // Load songs from songs.js.
    window.addEventListener("songsLoaded", (event) => {
        const incoming = event.detail?.songs;
        songs = Array.isArray(incoming) ? incoming : [];
        currentIndex = -1;

        audio.pause();
        audio.removeAttribute("src");
        audio.load();

        renderSongList();
        updateProgress();
        updateActiveSongUI();
    });

    // Support songs loaded before this script initialized.
    if (Array.isArray(window.prabhasSongs)) {
        songs = window.prabhasSongs;
        renderSongList();
    }

    if (el.volumeControl) {
        audio.volume = Math.max(
            0,
            Math.min(1, Number(el.volumeControl.value))
        );
    }

    // Support media keys where the browser allows it.
    if ("mediaSession" in navigator) {
        try {
            navigator.mediaSession.setActionHandler("play", togglePlayPause);
            navigator.mediaSession.setActionHandler("pause", () => audio.pause());
            navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
            navigator.mediaSession.setActionHandler("nexttrack", playNext);
        } catch (error) {
            console.warn("Some media controls are unavailable.", error);
        }
    }

    updateProgress();
    updateActiveSongUI();
})();
