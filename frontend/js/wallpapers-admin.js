
const API_URL = "http://127.0.0.1:3000";

document.addEventListener("DOMContentLoaded", () => {
    const wallpaperForm = document.getElementById("wallpaperForm");
    const wallpaperTitle = document.getElementById("wallpaperTitle");
    const wallpaperCategory = document.getElementById("wallpaperCategory");
    const wallpaperDescription = document.getElementById("wallpaperDescription");
    const wallpaperImage = document.getElementById("wallpaperImage");
    const imagePreview = document.getElementById("imagePreview");
    const imagePreviewContainer = document.getElementById("imagePreviewContainer");

    const uploadButton = document.getElementById("uploadWallpaperButton");
    const showAddButton = document.getElementById("showAddButton");
    const showAllButton = document.getElementById("showAllButton");
    const addSection = document.getElementById("addWallpaperSection");
    const allSection = document.getElementById("allWallpapersSection");

    const wallpaperGrid = document.getElementById("wallpaperGrid");
    const wallpaperCount = document.getElementById("wallpaperCount");
    const refreshButton = document.getElementById("refreshWallpapersButton");
    const statusMessage = document.getElementById("statusMessage");
    const backButton = document.getElementById("backButton");

    let previewURL = null;

    function showStatus(message, type = "info") {
        statusMessage.textContent = message;
        statusMessage.className = `wallpaper-status ${type}`;
        statusMessage.hidden = false;
    }

    function clearStatus() {
        statusMessage.textContent = "";
        statusMessage.hidden = true;
    }

    function showSection(section) {
        const showAdd = section === "add";

        addSection.hidden = !showAdd;
        allSection.hidden = showAdd;

        showAddButton.classList.toggle("active", showAdd);
        showAllButton.classList.toggle("active", !showAdd);

        if (!showAdd) {
            loadWallpapers();
        }

        clearStatus();
    }

    async function checkOwner() {
        try {
            const response = await fetch(`${API_URL}/api/owner/check`, {
                credentials: "include"
            });

            if (!response.ok) {
                window.location.href = "owner.html";
                return false;
            }

            return true;
        } catch (error) {
            showStatus(
                "Cannot connect to the backend. Make sure your server is running.",
                "error"
            );
            return false;
        }
    }

    function resetPreview() {
        if (previewURL) {
            URL.revokeObjectURL(previewURL);
            previewURL = null;
        }

        imagePreview.removeAttribute("src");
        imagePreviewContainer.hidden = true;
    }

    wallpaperImage.addEventListener("change", () => {
        resetPreview();

        const file = wallpaperImage.files[0];

        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type)) {
            wallpaperImage.value = "";
            showStatus("Choose a JPG, PNG, or WebP image.", "error");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            wallpaperImage.value = "";
            showStatus("Image size must be 10 MB or less.", "error");
            return;
        }

        previewURL = URL.createObjectURL(file);
        imagePreview.src = previewURL;
        imagePreviewContainer.hidden = false;

        clearStatus();
    });

    wallpaperForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const file = wallpaperImage.files[0];

        if (!file) {
            showStatus("Please select a wallpaper image.", "error");
            return;
        }

        const formData = new FormData();
        formData.append("title", wallpaperTitle.value.trim());
        formData.append("category", wallpaperCategory.value.trim());
        formData.append("description", wallpaperDescription.value.trim());
        formData.append("wallpaperFile", file);

        uploadButton.disabled = true;
        uploadButton.textContent = "Uploading...";
        clearStatus();

        try {
            const response = await fetch(`${API_URL}/api/admin/wallpapers`, {
                method: "POST",
                credentials: "include",
                body: formData
            });

            const result = await response.json().catch(() => ({}));

            if (response.status === 401 || response.status === 403) {
                window.location.href = "owner.html";
                return;
            }

            if (!response.ok) {
                throw new Error(result.message || "Wallpaper upload failed.");
            }

            showStatus("Wallpaper uploaded successfully!", "success");

            wallpaperForm.reset();
            resetPreview();

            await loadWallpapers();
        } catch (error) {
            showStatus(error.message || "Could not upload wallpaper.", "error");
        } finally {
            uploadButton.disabled = false;
            uploadButton.textContent = "Upload Wallpaper";
        }
    });

    async function loadWallpapers() {
        wallpaperGrid.innerHTML = "<p>Loading wallpapers...</p>";

        try {
            const response = await fetch(`${API_URL}/api/admin/wallpapers`, {
                credentials: "include"
            });

            if (response.status === 401 || response.status === 403) {
                window.location.href = "owner.html";
                return;
            }

            const result = await response.json().catch(() => []);

            if (!response.ok) {
                throw new Error(
                    result.message || "Could not load wallpapers."
                );
            }

            const wallpapers = Array.isArray(result)
                ? result
                : result.wallpapers || [];

            wallpaperCount.textContent = wallpapers.length;

            if (wallpapers.length === 0) {
                wallpaperGrid.innerHTML = `
                    <div class="wallpaper-empty">
                        <h3>No Wallpapers Yet</h3>
                        <p>Upload your first Prabhas wallpaper.</p>
                    </div>
                `;
                return;
            }

            wallpaperGrid.innerHTML = "";

            wallpapers.forEach((wallpaper) => {
                const card = document.createElement("article");
                card.className = "wallpaper-card";

                const image = document.createElement("img");
                image.src = wallpaper.image.startsWith("http")
                    ? wallpaper.image
                    : `${API_URL}${wallpaper.image}`;
                image.alt = wallpaper.title || "Prabhas wallpaper";
                image.loading = "lazy";

                image.addEventListener("error", () => {
                    image.alt = "Wallpaper image could not be loaded";
                });

                const details = document.createElement("div");
                details.className = "wallpaper-card-details";

                const title = document.createElement("h3");
                title.textContent = wallpaper.title || "Untitled Wallpaper";

                const category = document.createElement("p");
                category.textContent = wallpaper.category || "Uncategorized";

                const description = document.createElement("p");
                description.textContent = wallpaper.description || "";

                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.className = "delete-wallpaper-button";
                deleteButton.textContent = "Delete";

                deleteButton.addEventListener("click", async () => {
                    const confirmed = window.confirm(
                        `Delete "${wallpaper.title}"? This cannot be undone.`
                    );

                    if (!confirmed) return;

                    deleteButton.disabled = true;
                    deleteButton.textContent = "Deleting...";

                    try {
                        const deleteResponse = await fetch(
                            `${API_URL}/api/admin/wallpapers/${encodeURIComponent(wallpaper.id)}`,
                            {
                                method: "DELETE",
                                credentials: "include"
                            }
                        );

                        const deleteResult = await deleteResponse
                            .json()
                            .catch(() => ({}));

                        if (
                            deleteResponse.status === 401 ||
                            deleteResponse.status === 403
                        ) {
                            window.location.href = "owner.html";
                            return;
                        }

                        if (!deleteResponse.ok) {
                            throw new Error(
                                deleteResult.message || "Delete failed."
                            );
                        }

                        showStatus("Wallpaper deleted successfully.", "success");
                        await loadWallpapers();
                    } catch (error) {
                        showStatus(error.message || "Could not delete wallpaper.", "error");
                        deleteButton.disabled = false;
                        deleteButton.textContent = "Delete";
                    }
                });

                details.append(title, category, description, deleteButton);
                card.append(image, details);
                wallpaperGrid.appendChild(card);
            });
        } catch (error) {
            wallpaperGrid.innerHTML = "";
            showStatus(error.message || "Could not load wallpapers.", "error");
        }
    }

    showAddButton.addEventListener("click", () => showSection("add"));
    showAllButton.addEventListener("click", () => showSection("all"));
    refreshButton.addEventListener("click", loadWallpapers);

    backButton.addEventListener("click", () => {
        window.location.href = "owner-panel.html";
    });

    const params = new URLSearchParams(window.location.search);
    const initialSection = params.get("section") === "all" ? "all" : "add";

    checkOwner().then((authorized) => {
        if (authorized) {
            showSection(initialSection);
        }
    });

    window.addEventListener("beforeunload", resetPreview);
});
