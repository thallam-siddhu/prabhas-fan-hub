const API_URL = "http://127.0.0.1:3000/api";
const BACKEND_URL = "http://127.0.0.1:3000";

// =========================================
// ELEMENTS
// =========================================

const backButton = document.getElementById("backButton");
const addMovieButton = document.getElementById("addMovieButton");
const allMoviesButton = document.getElementById("allMoviesButton");
const cancelMovieButton = document.getElementById("cancelMovieButton");

const movieOptions = document.getElementById("movieOptions");
const addMovieSection = document.getElementById("addMovieSection");
const allMoviesSection = document.getElementById("allMoviesSection");

const movieForm = document.getElementById("movieForm");
const movieMessage = document.getElementById("movieMessage");
const moviesList = document.getElementById("moviesList");

const movieName = document.getElementById("movieName");
const movieYear = document.getElementById("movieYear");
const movieCharacter = document.getElementById("movieCharacter");
const moviePoster = document.getElementById("moviePoster");
const movieDescription = document.getElementById("movieDescription");
const movieLink = document.getElementById("movieLink");

const submitButton = movieForm.querySelector('button[type="submit"]');
const posterPreview = document.getElementById("posterPreview");

let editingMovieId = null;
let currentMovies = [];
let previewObjectURL = null;

// =========================================
// SAFE RESPONSE READER
// =========================================

async function readResponse(response) {
const contentType = response.headers.get("content-type") || "";
const responseText = await response.text();


if (contentType.includes("application/json")) {
    try {
        return JSON.parse(responseText);
    } catch {
        throw new Error("The server returned invalid JSON.");
    }
}

console.error(
    "Expected JSON but received:",
    response.status,
    response.url,
    responseText.slice(0, 300)
);

if (response.status === 404) {
    throw new Error(
        "API route not found. Check the backend URL and restart the backend."
    );
}

throw new Error(
    `The server returned HTML or another unexpected response (HTTP ${response.status}). Check the backend terminal and Network tab.`
);


}

// =========================================
// CHECK OWNER LOGIN
// =========================================

async function checkOwnerLogin() {
try {
const response = await fetch(`${API_URL}/owner/check`, {
method: "GET",
credentials: "include",
cache: "no-store"
});


    if (response.status === 401) {
        window.location.replace("owner.html");
        return false;
    }

    const data = await readResponse(response);

    if (!response.ok || !data.success || !data.loggedIn) {
        window.location.replace("owner.html");
        return false;
    }

    openRequestedSection();
    return true;
} catch (error) {
    console.error("Owner check error:", error);

    showMessage(
        error.message || "Cannot connect to the backend.",
        true
    );

    return false;
}


}

// =========================================
// OPEN REQUESTED SECTION
// =========================================

function openRequestedSection() {
const params = new URLSearchParams(window.location.search);
const section = params.get("section");


if (section === "add") {
    showAddMovie();
} else if (section === "all") {
    showAllMovies();
} else {
    showMovieOptions();
}


}

// =========================================
// SHOW MAIN OPTIONS
// =========================================

function showMovieOptions() {
movieOptions.style.display = "grid";
addMovieSection.style.display = "none";
allMoviesSection.style.display = "none";


resetMovieForm();
showMessage("");


}

// =========================================
// SHOW ADD MOVIE
// =========================================

function showAddMovie() {
resetMovieForm();


movieOptions.style.display = "none";
allMoviesSection.style.display = "none";
addMovieSection.style.display = "block";

document.getElementById("movieFormTitle").textContent =
    "Add New Movie";

submitButton.textContent = "Add Movie";
moviePoster.required = true;

showMessage("");


}

// =========================================
// SHOW ALL MOVIES
// =========================================

async function showAllMovies() {
movieOptions.style.display = "none";
addMovieSection.style.display = "none";
allMoviesSection.style.display = "block";


await loadMovies();


}

// =========================================
// BACK BUTTON
// =========================================

backButton.addEventListener("click", function () {
if (
addMovieSection.style.display !== "none" ||
allMoviesSection.style.display !== "none"
) {
showMovieOptions();


    history.replaceState(
        null,
        "",
        "movies-admin.html"
    );
} else {
    window.location.href = "owner-panel.html";
}


});

// =========================================
// ADD MOVIE BUTTON
// =========================================

addMovieButton.addEventListener("click", function () {
showAddMovie();


history.replaceState(
    null,
    "",
    "movies-admin.html?section=add"
);


});

// =========================================
// ALL MOVIES BUTTON
// =========================================

allMoviesButton.addEventListener("click", function () {
history.replaceState(
null,
"",
"movies-admin.html?section=all"
);


showAllMovies();


});

// =========================================
// CANCEL BUTTON
// =========================================

cancelMovieButton.addEventListener("click", function () {
showMovieOptions();


history.replaceState(
    null,
    "",
    "movies-admin.html"
);


});

// =========================================
// POSTER PREVIEW
// =========================================

moviePoster.addEventListener("change", function () {
const file = moviePoster.files[0];


clearPosterPreview();

if (!file) {
    if (editingMovieId !== null) {
        const existingMovie = currentMovies.find(
            item => String(item.id) === String(editingMovieId)
        );

        if (existingMovie && existingMovie.poster) {
            posterPreview.src = getPosterUrl(existingMovie.poster);
            posterPreview.style.display = "block";
        }
    }

    return;
}

const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

if (!allowedTypes.includes(file.type)) {
    showMessage("Choose a JPG, PNG or WebP image.", true);
    moviePoster.value = "";
    return;
}

if (file.size > 5 * 1024 * 1024) {
    showMessage("Poster must be 5 MB or smaller.", true);
    moviePoster.value = "";
    return;
}

previewObjectURL = URL.createObjectURL(file);

posterPreview.src = previewObjectURL;
posterPreview.style.display = "block";

showMessage("");


});

function clearPosterPreview() {
if (previewObjectURL) {
URL.revokeObjectURL(previewObjectURL);
previewObjectURL = null;
}


posterPreview.style.display = "none";
posterPreview.removeAttribute("src");


}

// =========================================
// RESET FORM
// =========================================

function resetMovieForm() {
movieForm.reset();


editingMovieId = null;

clearPosterPreview();

document.getElementById("movieFormTitle").textContent =
    "Add New Movie";

submitButton.textContent = "Add Movie";
submitButton.disabled = false;

moviePoster.required = true;


}

// =========================================
// SHOW MESSAGE
// =========================================

function showMessage(message, isError = false) {
movieMessage.textContent = message;


movieMessage.style.color = isError
    ? "#ff6b6b"
    : "#d4af37";


}

// =========================================
// LOAD MOVIES
// =========================================

async function loadMovies() {
moviesList.innerHTML = `         <p class="login-message">Loading movies...</p>
    `;


try {
    const response = await fetch(`${API_URL}/admin/movies`, {
        method: "GET",
        credentials: "include",
        cache: "no-store"
    });

    if (response.status === 401) {
        window.location.replace("owner.html");
        return;
    }

    const data = await readResponse(response);

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load movies.");
    }

    currentMovies = data.movies || [];

    displayMovies();
} catch (error) {
    console.error("Load movies error:", error);

    moviesList.innerHTML = "";

    const message = document.createElement("p");
    message.className = "login-message";
    message.textContent =
        error.message || "Cannot load movies. Check the backend.";

    moviesList.appendChild(message);
}


}

// =========================================
// DISPLAY MOVIES
// =========================================

function displayMovies() {
moviesList.innerHTML = "";


if (currentMovies.length === 0) {
    moviesList.innerHTML = `
        <p class="login-message">No movies added yet.</p>
    `;
    return;
}

currentMovies.forEach(function (movie) {
    const card = document.createElement("div");

    card.style.cssText = `
        margin-top: 25px;
        padding-top: 25px;
        border-top: 1px solid #252525;
    `;

    const layout = document.createElement("div");

    layout.style.cssText = `
        display: flex;
        gap: 25px;
        align-items: flex-start;
        flex-wrap: wrap;
    `;

    const poster = document.createElement("img");

    poster.src = getPosterUrl(movie.poster);
    poster.alt = `${movie.name} poster`;

    poster.style.cssText = `
        width: 180px;
        max-width: 100%;
        height: 250px;
        object-fit: cover;
        border-radius: 10px;
        border: 1px solid #333;
        background: #090909;
    `;

    poster.onerror = function () {
        poster.alt = "Poster could not be loaded";
    };

    const details = document.createElement("div");

    details.style.cssText = `
        flex: 1;
        min-width: 220px;
    `;

    const title = document.createElement("h3");

    title.textContent = movie.name;

    title.style.cssText = `
        color: #fff;
        margin-bottom: 10px;
        font-size: 23px;
    `;

    const meta = document.createElement("p");

    meta.textContent = `${movie.year} • ${movie.character}`;

    meta.style.cssText = `
        color: #d4af37;
        font-size: 13px;
        margin-bottom: 10px;
    `;

    const description = document.createElement("p");

    description.textContent = movie.description;

    description.style.cssText = `
        color: #999;
        font-size: 14px;
        line-height: 1.7;
        margin-bottom: 18px;
    `;

    const actions = document.createElement("div");

    actions.style.cssText = `
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    `;

    const trailerLink = document.createElement("a");

    trailerLink.href = movie.link;
    trailerLink.target = "_blank";
    trailerLink.rel = "noopener noreferrer";
    trailerLink.textContent = "Movie / Trailer";
    trailerLink.className = "manage-button";

    trailerLink.style.cssText = `
        display: inline-block;
        text-decoration: none;
    `;

    const editButton = document.createElement("button");

    editButton.type = "button";
    editButton.textContent = "Edit";

    editButton.style.cssText = `
        padding: 11px 20px;
        border: 1px solid #d4af37;
        border-radius: 7px;
        background: transparent;
        color: #d4af37;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
    `;

    editButton.addEventListener("click", function () {
        editMovie(movie.id);
    });

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.textContent = "Delete";

    deleteButton.style.cssText = `
        padding: 11px 20px;
        border: 1px solid #7a2b2b;
        border-radius: 7px;
        background: transparent;
        color: #ff6b6b;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
    `;

    deleteButton.addEventListener("click", function () {
        deleteMovie(movie.id);
    });

    actions.append(trailerLink, editButton, deleteButton);
    details.append(title, meta, description, actions);
    layout.append(poster, details);
    card.appendChild(layout);

    moviesList.appendChild(card);
});


}

// =========================================
// POSTER URL
// =========================================

function getPosterUrl(poster) {
if (!poster) {
return "";
}


if (/^https?:\/\//i.test(poster)) {
    return poster;
}

return `${BACKEND_URL}${poster.startsWith("/") ? "" : "/"}${poster}`;


}

// =========================================
// EDIT MOVIE
// =========================================

function editMovie(movieId) {
const movie = currentMovies.find(
item => String(item.id) === String(movieId)
);


if (!movie) {
    alert("Movie not found.");
    return;
}

editingMovieId = movie.id;

movieOptions.style.display = "none";
allMoviesSection.style.display = "none";
addMovieSection.style.display = "block";

document.getElementById("movieFormTitle").textContent =
    "Edit Movie";

movieName.value = movie.name || "";
movieYear.value = movie.year || "";
movieCharacter.value = movie.character || "";
movieDescription.value = movie.description || "";
movieLink.value = movie.link || "";

// Leave the file input empty to retain the existing poster.
moviePoster.value = "";
moviePoster.required = false;

clearPosterPreview();

if (movie.poster) {
    posterPreview.src = getPosterUrl(movie.poster);
    posterPreview.style.display = "block";
}

submitButton.textContent = "Save Changes";

showMessage(
    "To keep the current poster, leave the upload field empty."
);

history.replaceState(
    null,
    "",
    "movies-admin.html?section=add"
);


}

// =========================================
// ADD OR UPDATE MOVIE
// =========================================

movieForm.addEventListener("submit", async function (event) {
event.preventDefault();


const isEditing = editingMovieId !== null;
const movieIdBeingEdited = editingMovieId;
const posterFile = moviePoster.files[0];

if (!isEditing && !posterFile) {
    showMessage("Please select a movie poster.", true);
    return;
}

if (posterFile) {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(posterFile.type)) {
        showMessage("Choose a JPG, PNG or WebP image.", true);
        return;
    }

    if (posterFile.size > 5 * 1024 * 1024) {
        showMessage("Poster must be 5 MB or smaller.", true);
        return;
    }
}

const formData = new FormData();

formData.append("name", movieName.value.trim());
formData.append("year", movieYear.value);
formData.append("character", movieCharacter.value.trim());
formData.append("description", movieDescription.value.trim());
formData.append("link", movieLink.value.trim());

if (posterFile) {
    formData.append("posterFile", posterFile);
}

const url = isEditing
    ? `${API_URL}/admin/movies/${movieIdBeingEdited}`
    : `${API_URL}/admin/movies`;

submitButton.disabled = true;

submitButton.textContent = isEditing
    ? "Saving..."
    : "Uploading...";

showMessage(
    isEditing
        ? "Saving movie changes..."
        : "Uploading movie and poster..."
);

try {
    const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        credentials: "include",
        cache: "no-store",
        body: formData
    });

    if (response.status === 401) {
        window.location.replace("owner.html");
        return;
    }

    const data = await readResponse(response);

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not save the movie.");
    }

    // =====================================
    // AFTER SUCCESSFUL SAVE
    // =====================================

    resetMovieForm();

    if (isEditing) {
        // Editing: return to All Movies.
        history.replaceState(
            null,
            "",
            "movies-admin.html?section=all"
        );

        await showAllMovies();
    } else {
        // Adding: remain on Add Movie.
        history.replaceState(
            null,
            "",
            "movies-admin.html?section=add"
        );

        showAddMovie();

        showMessage(
            data.message || "Movie added successfully."
        );
    }
} catch (error) {
    console.error("Movie save error:", error);

    showMessage(
        error.message || "Failed to save movie.",
        true
    );
} finally {
    submitButton.disabled = false;

    if (editingMovieId === null) {
        submitButton.textContent = "Add Movie";
    } else {
        submitButton.textContent = "Save Changes";
    }
}


});

// =========================================
// DELETE MOVIE
// =========================================

async function deleteMovie(movieId) {
const movie = currentMovies.find(
item => String(item.id) === String(movieId)
);


if (!movie) {
    return;
}

const confirmed = confirm(
    `Are you sure you want to delete "${movie.name}"?`
);

if (!confirmed) {
    return;
}

try {
    const response = await fetch(
        `${API_URL}/admin/movies/${movieId}`,
        {
            method: "DELETE",
            credentials: "include",
            cache: "no-store"
        }
    );

    if (response.status === 401) {
        window.location.replace("owner.html");
        return;
    }

    const data = await readResponse(response);

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete movie.");
    }

    await loadMovies();
} catch (error) {
    console.error("Delete movie error:", error);
    alert(error.message || "Cannot connect to the server.");
}


}

// =========================================
// START
// =========================================

document.addEventListener("DOMContentLoaded", checkOwnerLogin);

// =========================================
// RECHECK WHEN PAGE IS RESTORED
// =========================================

window.addEventListener("pageshow", function (event) {
if (event.persisted) {
checkOwnerLogin();
}
});
