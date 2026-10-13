const wallpaperContainer =
document.getElementById("wallpaperContainer");

const categoryTitle =
document.getElementById("categoryTitle");

const categoryButtons =
document.querySelectorAll(".category-button");

// =========================================
// DISPLAY WALLPAPERS
// =========================================

function displayWallpapers(category) {


if (!wallpaperContainer) {
    return;
}

wallpaperContainer.innerHTML = "";


// Category title

if (category === "pc") {

    categoryTitle.textContent =
        "🖥️ PC / LAPTOP WALLPAPERS";

} else {

    categoryTitle.textContent =
        "📱 MOBILE WALLPAPERS";

}


// Active category button

categoryButtons.forEach(function (button) {

    button.classList.remove("active");

});


if (category === "pc") {

    categoryButtons[0].classList.add("active");

} else {

    categoryButtons[1].classList.add("active");

}


// Create wallpaper cards

wallpapers[category].forEach(function (wallpaper) {

    const card =
        document.createElement("div");

    card.className = "wallpaper-card";


    card.innerHTML = `

        <img
            src="${wallpaper.image}"
            alt="${wallpaper.title}"
            class="wallpaper-image"
        >

        <h3>
            ${wallpaper.title}
        </h3>

        <a
            class="wallpaper-download"
            href="${wallpaper.image}"
            download
        >
            ↓ Download
        </a>

    `;


    wallpaperContainer.appendChild(card);


    // Open wallpaper viewer

    const image =
        card.querySelector(".wallpaper-image");


    image.addEventListener(
        "click",
        function () {

            openWallpaperViewer(
                wallpaper.image,
                wallpaper.title
            );

        }
    );

});


}

// =========================================
// FULLSCREEN WALLPAPER VIEWER
// =========================================

function openWallpaperViewer(imageSrc, title) {


// Prevent duplicate viewer

const existingViewer =
    document.getElementById("wallpaperViewer");

if (existingViewer) {
    existingViewer.remove();
}


// Create viewer

const viewer =
    document.createElement("div");

viewer.id = "wallpaperViewer";

viewer.className =
    "wallpaper-viewer";


viewer.innerHTML = `

    <div class="wallpaper-viewer-header">

        <span>
            ${title}
        </span>

        <button
            type="button"
            class="wallpaper-close"
            aria-label="Close wallpaper">

            ×

        </button>

    </div>


    <div class="wallpaper-viewer-area">

        <img
            src="${imageSrc}"
            alt="${title}"
            class="viewer-image"
        >

    </div>

`;


document.body.appendChild(viewer);


const viewerArea =
    viewer.querySelector(
        ".wallpaper-viewer-area"
    );

const image =
    viewer.querySelector(
        ".viewer-image"
    );


// Close button

const closeButton =
    viewer.querySelector(
        ".wallpaper-close"
    );


closeButton.addEventListener(
    "click",
    closeWallpaperViewer
);


// Close when tapping outside image

viewerArea.addEventListener(
    "click",
    function (event) {

        if (event.target === viewerArea) {

            closeWallpaperViewer();

        }

    }
);


// Prevent page scrolling

document.body.classList.add(
    "wallpaper-viewer-open"
);


// Enable pinch zoom

setupPinchZoom(
    viewerArea,
    image
);


// ESC key on desktop

document.addEventListener(
    "keydown",
    wallpaperEscapeHandler
);


}

// =========================================
// CLOSE VIEWER
// =========================================

function closeWallpaperViewer() {


const viewer =
    document.getElementById(
        "wallpaperViewer"
    );


if (viewer) {

    viewer.remove();

}


document.body.classList.remove(
    "wallpaper-viewer-open"
);


document.removeEventListener(
    "keydown",
    wallpaperEscapeHandler
);


}

// =========================================
// ESC KEY
// =========================================

function wallpaperEscapeHandler(event) {


if (event.key === "Escape") {

    closeWallpaperViewer();

}


}

// =========================================
// PINCH TO ZOOM
// =========================================

function setupPinchZoom(container, image) {


let startDistance = 0;

let currentScale = 1;

let startScale = 1;


// Touch start

container.addEventListener(
    "touchstart",
    function (event) {

        if (event.touches.length === 2) {

            startDistance =
                getTouchDistance(event.touches);

            startScale =
                currentScale;

        }

    },
    {
        passive: false
    }
);


// Touch move

container.addEventListener(
    "touchmove",
    function (event) {

        if (event.touches.length !== 2) {
            return;
        }


        event.preventDefault();


        const currentDistance =
            getTouchDistance(
                event.touches
            );


        if (!startDistance) {
            return;
        }


        const scaleChange =
            currentDistance /
            startDistance;


        currentScale =
            startScale * scaleChange;


        // Minimum zoom

        if (currentScale < 1) {
            currentScale = 1;
        }


        // Maximum zoom

        if (currentScale > 4) {
            currentScale = 4;
        }


        image.style.transform =
            "scale(" + currentScale + ")";

    },
    {
        passive: false
    }
);


// Reset when fingers leave

container.addEventListener(
    "touchend",
    function (event) {

        if (event.touches.length < 2) {

            startDistance = 0;

        }

    },
    {
        passive: false
    }
);


}

// =========================================
// TOUCH DISTANCE
// =========================================

function getTouchDistance(touches) {


const touch1 =
    touches[0];

const touch2 =
    touches[1];


const x =
    touch2.clientX -
    touch1.clientX;


const y =
    touch2.clientY -
    touch1.clientY;


return Math.sqrt(
    x * x +
    y * y
);


}

// =========================================
// INITIAL DISPLAY
// =========================================

displayWallpapers("pc");
