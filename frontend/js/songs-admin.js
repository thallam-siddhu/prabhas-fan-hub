
document.addEventListener("DOMContentLoaded", function () {

    // =========================================
    // CONFIGURATION
    // =========================================

    const API_URL = "http://127.0.0.1:3000/api";

    const BACKEND_URL = "http://127.0.0.1:3000";

    // =========================================
    // ELEMENTS
    // =========================================

    const backButton =
        document.getElementById("backButton");

    const showAddSongButton =
        document.getElementById("showAddSongButton");

    const showAllSongsButton =
        document.getElementById("showAllSongsButton");

    const songFormSection =
        document.getElementById("songFormSection");

    const allSongsSection =
        document.getElementById("allSongsSection");

    const songForm =
        document.getElementById("songForm");

    const songIdInput =
        document.getElementById("songId");

    const songTitleInput =
        document.getElementById("songTitle");

    const songMovieInput =
        document.getElementById("songMovie");

    const songDescriptionInput =
        document.getElementById("songDescription");

    const audioFileInput =
        document.getElementById("audioFile");

    const coverFileInput =
        document.getElementById("coverFile");

    const songFormTitle =
        document.getElementById("songFormTitle");

    const saveSongButton =
        document.getElementById("saveSongButton");

    const cancelEditButton =
        document.getElementById("cancelEditButton");

    const audioHelp =
        document.getElementById("audioHelp");

    const songFormMessage =
        document.getElementById("songFormMessage");

    const songsListMessage =
        document.getElementById("songsListMessage");

    const songsList =
        document.getElementById("songsList");

    const pageTitle =
        document.getElementById("pageTitle");


    // =========================================
    // STATE
    // =========================================

    let editingSong = false;
    let loadingSongs = false;


    // =========================================
    // MESSAGE HELPERS
    // =========================================

    function showFormMessage(message, isError = false) {

        songFormMessage.textContent = message;

        songFormMessage.style.color =
            isError ? "#ff6464" : "#d4af37";
    }


    function showListMessage(message, isError = false) {

        songsListMessage.textContent = message;

        songsListMessage.style.color =
            isError ? "#ff6464" : "#d4af37";
    }


    // =========================================
    // API HELPER
    // =========================================

    async function apiRequest(url, options = {}) {

        const response = await fetch(url, {
            ...options,
            credentials: "include"
        });

        let data;

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (response.status === 401) {

            window.location.replace("owner.html");

            throw new Error(
                "Owner session expired. Please log in again."
            );
        }

        if (!response.ok || data.success === false) {

            throw new Error(
                data.message || "The request failed."
            );
        }

        return data;
    }


    // =========================================
    // CHECK OWNER LOGIN
    // =========================================

    async function checkOwner() {

        try {

            const data = await apiRequest(
                `${API_URL}/owner/check`
            );

            if (!data.loggedIn) {

                window.location.replace("owner.html");

                return false;
            }

            return true;

        } catch (error) {

            if (error.message.includes("session expired")) {
                return false;
            }

            console.error(error);

            showFormMessage(
                "Cannot connect to the backend. Start the server and refresh.",
                true
            );

            return false;
        }
    }


    // =========================================
    // NAVIGATION
    // =========================================

    function showAddSection() {

        songFormSection.hidden = false;
        allSongsSection.hidden = true;

        pageTitle.textContent = editingSong
            ? "Edit Song"
            : "Add Songs";

        window.history.replaceState(
            {},
            "",
            "songs-admin.html?section=add"
        );
    }


    async function showAllSection() {

        songFormSection.hidden = true;
        allSongsSection.hidden = false;

        pageTitle.textContent = "All Songs";

        window.history.replaceState(
            {},
            "",
            "songs-admin.html?section=all"
        );

        await loadSongs();
    }


    showAddSongButton.addEventListener(
        "click",
        function () {

            resetForm();
            showAddSection();

        }
    );


    showAllSongsButton.addEventListener(
        "click",
        showAllSection
    );


    backButton.addEventListener(
        "click",
        function () {

            window.location.href = "owner-panel.html";

        }
    );


    // =========================================
    // RESET FORM
    // =========================================

    function resetForm() {

        editingSong = false;

        songForm.reset();

        songIdInput.value = "";

        songFormTitle.textContent = "Add New Song";

        saveSongButton.textContent = "Add Song";

        cancelEditButton.hidden = true;

        audioFileInput.required = true;

        audioHelp.textContent =
            "Audio is required when adding a new song.";

        showFormMessage("");

        if (pageTitle) {
            pageTitle.textContent = "Add Songs";
        }
    }


    cancelEditButton.addEventListener(
        "click",
        function () {

            resetForm();
            showAddSection();

        }
    );


    // =========================================
    // ADD / EDIT SONG
    // =========================================

    songForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const title = songTitleInput.value.trim();

            if (!title) {

                showFormMessage(
                    "Please enter the song title.",
                    true
                );

                return;
            }

            if (!editingSong && !audioFileInput.files.length) {

                showFormMessage(
                    "Please select a song audio file.",
                    true
                );

                return;
            }

            const formData = new FormData();

            formData.append("title", title);

            formData.append(
                "movie",
                songMovieInput.value.trim()
            );

            formData.append(
                "description",
                songDescriptionInput.value.trim()
            );

            if (audioFileInput.files.length) {

                formData.append(
                    "audioFile",
                    audioFileInput.files[0]
                );

            }

            if (coverFileInput.files.length) {

                formData.append(
                    "coverFile",
                    coverFileInput.files[0]
                );

            }

            const songId = songIdInput.value;

            const url = editingSong
                ? `${API_URL}/admin/songs/${encodeURIComponent(songId)}`
                : `${API_URL}/admin/songs`;

            const method = editingSong ? "PUT" : "POST";

            saveSongButton.disabled = true;

            saveSongButton.textContent =
                editingSong ? "Updating..." : "Adding...";

            showFormMessage("");

            try {

                const data = await apiRequest(url, {
                    method,
                    body: formData
                });

                showFormMessage(
                    data.message ||
                    (editingSong
                        ? "Song updated successfully."
                        : "Song added successfully.")
                );

                resetForm();

                await loadSongs();

                showAllSection();

            } catch (error) {

                console.error(error);

                showFormMessage(
                    error.message || "Could not save song.",
                    true
                );

            } finally {

                saveSongButton.disabled = false;

                if (!editingSong) {
                    saveSongButton.textContent = "Add Song";
                }

            }

        }
    );


    // =========================================
    // LOAD ALL SONGS
    // =========================================

    async function loadSongs() {

        if (loadingSongs) return;

        loadingSongs = true;

        songsList.replaceChildren();

        showListMessage("Loading songs...");

        try {

            const data = await apiRequest(
                `${API_URL}/admin/songs`
            );

            const songs = Array.isArray(data.songs)
                ? data.songs
                : [];

            if (songs.length === 0) {

                showListMessage("No songs added yet.");

                return;
            }

            showListMessage("");

            songs.forEach(function (song) {

                songsList.appendChild(
                    createSongCard(song)
                );

            });

        } catch (error) {

            console.error(error);

            showListMessage(
                error.message || "Could not load songs.",
                true
            );

        } finally {

            loadingSongs = false;

        }
    }


    // =========================================
    // CREATE SONG CARD
    // =========================================

    function createSongCard(song) {

        const card = document.createElement("article");

        card.className = "song-admin-card";

        const cover = document.createElement("img");

        cover.className = "song-admin-cover";

        cover.alt = song.title || "Song cover";

        cover.loading = "lazy";

        if (song.cover) {

            cover.src = BACKEND_URL + song.cover;

        } else {

            cover.hidden = true;

        }

        const details = document.createElement("div");

        details.className = "song-admin-details";

        const title = document.createElement("h3");

        title.textContent = song.title || "Untitled Song";

        const movie = document.createElement("p");

        movie.textContent = song.movie
            ? "Movie: " + song.movie
            : "Movie: Not specified";

        const description = document.createElement("p");

        description.textContent =
            song.description || "No description";

        const audio = document.createElement("audio");

        audio.controls = true;

        audio.preload = "none";

        if (song.audio) {

            audio.src = BACKEND_URL + song.audio;

        }

        const actions = document.createElement("div");

        actions.className = "song-admin-actions";

        const editButton = document.createElement("button");

        editButton.type = "button";

        editButton.className = "manage-button";

        editButton.textContent = "Edit";

        editButton.addEventListener(
            "click",
            function () {

                editSong(song);

            }
        );

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";

        deleteButton.className = "manage-button";

        deleteButton.textContent = "Delete";

        deleteButton.addEventListener(
            "click",
            function () {

                deleteSong(song);

            }
        );

        actions.append(editButton, deleteButton);

        details.append(
            title,
            movie,
            description,
            audio,
            actions
        );

        card.append(cover, details);

        return card;
    }


    // =========================================
    // EDIT SONG
    // =========================================

    function editSong(song) {

        editingSong = true;

        songIdInput.value = song.id;

        songTitleInput.value = song.title || "";

        songMovieInput.value = song.movie || "";

        songDescriptionInput.value =
            song.description || "";

        audioFileInput.value = "";

        coverFileInput.value = "";

        audioFileInput.required = false;

        songFormTitle.textContent = "Edit Song";

        saveSongButton.textContent = "Update Song";

        cancelEditButton.hidden = false;

        audioHelp.textContent =
            "Leave audio empty to keep the existing audio file.";

        showFormMessage(
            "Select a new audio or cover file only if you want to replace it."
        );

        showAddSection();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    // =========================================
    // DELETE SONG
    // =========================================

    async function deleteSong(song) {

        const confirmed = window.confirm(
            `Are you sure you want to delete "${song.title}"?`
        );

        if (!confirmed) return;

        showListMessage("Deleting song...");

        try {

            const data = await apiRequest(
                `${API_URL}/admin/songs/${encodeURIComponent(song.id)}`,
                {
                    method: "DELETE"
                }
            );

            showListMessage(
                data.message || "Song deleted successfully."
            );

            await loadSongs();

        } catch (error) {

            console.error(error);

            showListMessage(
                error.message || "Could not delete song.",
                true
            );

        }
    }


    // =========================================
    // INITIALIZE
    // =========================================

    async function initialize() {

        const authenticated = await checkOwner();

        if (!authenticated) return;

        const params = new URLSearchParams(
            window.location.search
        );

        const section = params.get("section");

        if (section === "all") {

            await showAllSection();

        } else {

            resetForm();
            showAddSection();

        }
    }

    initialize();

});
