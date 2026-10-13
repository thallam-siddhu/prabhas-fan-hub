
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { verifyOwner } = require("./auth");

const app = express();
const PORT = 3000;

// =========================================
// UPLOAD DIRECTORIES
// =========================================

const posterDirectory = path.join(__dirname, "uploads", "posters");
const songAudioDirectory = path.join(__dirname, "uploads", "songs", "audio");
const songCoverDirectory = path.join(__dirname, "uploads", "songs", "covers");
const wallpaperDirectory = path.join(__dirname, "uploads", "wallpapers");

[
    posterDirectory,
    songAudioDirectory,
    songCoverDirectory,
    wallpaperDirectory
].forEach(function (directory) {
    fs.mkdirSync(directory, { recursive: true });
});

// =========================================
// FILE TYPES
// =========================================

const allowedImageTypes = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
};

const allowedAudioTypes = {
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/ogg": ".ogg",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "audio/x-m4a": ".m4a"
};

function getAudioExtension(file) {
    const originalExtension = path
        .extname(file.originalname)
        .toLowerCase();

    const mpegExtensions = [".mpeg", ".mpg"];

    if (
        mpegExtensions.includes(originalExtension) &&
        [
            "audio/mpeg",
            "video/mpeg",
            "application/octet-stream"
        ].includes(file.mimetype)
    ) {
        return originalExtension;
    }

    return allowedAudioTypes[file.mimetype] || null;
}

// =========================================
// UPLOAD STORAGE
// =========================================

function createStorage(directory, allowedTypes, label) {
    return multer.diskStorage({
        destination: function (req, file, callback) {
            callback(null, directory);
        },

        filename: function (req, file, callback) {
            const extension = allowedTypes[file.mimetype];

            if (!extension) {
                return callback(
                    new Error("Invalid " + label + " file type.")
                );
            }

            callback(null, crypto.randomUUID() + extension);
        }
    });
}

// =========================================
// MOVIE POSTER UPLOAD
// =========================================

const uploadPoster = multer({
    storage: createStorage(
        posterDirectory,
        allowedImageTypes,
        "poster image"
    ),

    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },

    fileFilter: function (req, file, callback) {
        if (!allowedImageTypes[file.mimetype]) {
            return callback(
                new Error("Only JPG, PNG and WebP images are allowed.")
            );
        }

        callback(null, true);
    }
});

// =========================================
// WALLPAPER IMAGE UPLOAD
// =========================================

const uploadWallpaper = multer({
    storage: createStorage(
        wallpaperDirectory,
        allowedImageTypes,
        "wallpaper image"
    ),

    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    },

    fileFilter: function (req, file, callback) {
        if (!allowedImageTypes[file.mimetype]) {
            return callback(
                new Error("Only JPG, PNG and WebP images are allowed.")
            );
        }

        callback(null, true);
    }
});

// =========================================
// SONG AUDIO AND COVER UPLOAD
// =========================================

const uploadSongFiles = multer({
    storage: multer.diskStorage({

        destination: function (req, file, callback) {
            if (file.fieldname === "audioFile") {
                return callback(null, songAudioDirectory);
            }

            if (file.fieldname === "coverFile") {
                return callback(null, songCoverDirectory);
            }

            callback(new Error("Unexpected upload field."), null);
        },

        filename: function (req, file, callback) {
            let extension;

            if (file.fieldname === "audioFile") {
                extension = getAudioExtension(file);
            } else if (file.fieldname === "coverFile") {
                extension = allowedImageTypes[file.mimetype];
            }

            if (!extension) {
                return callback(
                    new Error("Unsupported song audio or cover file type.")
                );
            }

            callback(null, crypto.randomUUID() + extension);
        }
    }),

    limits: {
        fileSize: 30 * 1024 * 1024,
        files: 2
    },

    fileFilter: function (req, file, callback) {
        if (
            file.fieldname === "audioFile" &&
            !getAudioExtension(file)
        ) {
            return callback(
                new Error(
                    "Upload MP3, WAV, OGG, M4A, AAC or MPEG audio (.mpeg/.mpg)."
                )
            );
        }

        if (
            file.fieldname === "coverFile" &&
            !allowedImageTypes[file.mimetype]
        ) {
            return callback(
                new Error("Song covers must be JPG, PNG or WebP.")
            );
        }

        if (
            file.fieldname !== "audioFile" &&
            file.fieldname !== "coverFile"
        ) {
            return callback(new Error("Unexpected upload field."));
        }

        callback(null, true);
    }
});

// =========================================
// MIDDLEWARE
// =========================================

app.use(express.json({ limit: "1mb" }));

app.use(
    cors({
        origin: [
            "http://localhost:5500",
            "http://127.0.0.1:5500"
        ],
        credentials: true
    })
);

// =========================================
// SESSION
// =========================================

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "prabhas-fan-hub-secret-change-this",

        resave: false,
        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60
        }
    })
);

// =========================================
// NO CACHE FOR API
// =========================================

app.use(function (req, res, next) {
    if (req.path.startsWith("/api/")) {
        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, private"
        );

        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
    }

    next();
});

// =========================================
// SERVE UPLOADED FILES
// =========================================

app.use(
    "/uploads/posters",
    express.static(posterDirectory, {
        dotfiles: "deny",
        index: false,
        maxAge: "1d"
    })
);

app.use(
    "/uploads/songs/audio",
    express.static(songAudioDirectory, {
        dotfiles: "deny",
        index: false,
        maxAge: "1d"
    })
);

app.use(
    "/uploads/songs/covers",
    express.static(songCoverDirectory, {
        dotfiles: "deny",
        index: false,
        maxAge: "1d"
    })
);

app.use(
    "/uploads/wallpapers",
    express.static(wallpaperDirectory, {
        dotfiles: "deny",
        index: false,
        maxAge: "1d"
    })
);

// =========================================
// PERMANENT JSON STORAGE
// =========================================

const moviesFile = path.join(__dirname, "movies.json");
const songsFile = path.join(__dirname, "songs.json");
const wallpapersFile = path.join(__dirname, "wallpapers.json");

function loadArray(filePath, label) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]", "utf8");
    }

    const savedData = JSON.parse(
        fs.readFileSync(filePath, "utf8")
    );

    if (!Array.isArray(savedData)) {
        throw new Error(label + " must contain a JSON array.");
    }

    return savedData;
}

function saveArray(filePath, data, label) {
    const temporaryFile = filePath + ".tmp";

    try {
        fs.writeFileSync(
            temporaryFile,
            JSON.stringify(data, null, 2),
            "utf8"
        );

        fs.renameSync(temporaryFile, filePath);
        return true;

    } catch (error) {
        console.error("Could not save " + label + ":", error);

        try {
            if (fs.existsSync(temporaryFile)) {
                fs.unlinkSync(temporaryFile);
            }
        } catch (cleanupError) {
            console.error(
                "Temporary file cleanup failed:",
                cleanupError
            );
        }

        return false;
    }
}

let movies = loadArray(moviesFile, "movies.json");
let songs = loadArray(songsFile, "songs.json");
let wallpapers = loadArray(wallpapersFile, "wallpapers.json");

function saveMovies() {
    return saveArray(moviesFile, movies, "movies.json");
}

function saveSongs() {
    return saveArray(songsFile, songs, "songs.json");
}

function saveWallpapers() {
    return saveArray(
        wallpapersFile,
        wallpapers,
        "wallpapers.json"
    );
}

// =========================================
// FILE CLEANUP HELPERS
// =========================================

function deleteFile(directory, filename) {
    if (!filename) return;

    const safeName = path.basename(filename);
    const filePath = path.join(directory, safeName);

    fs.unlink(filePath, function (error) {
        if (error && error.code !== "ENOENT") {
            console.error("File cleanup failed:", error);
        }
    });
}

function deleteUploadedFile(file) {
    if (file && file.filename) {
        const directory = path.dirname(file.path);
        deleteFile(directory, file.filename);
    }
}

function deleteMoviePoster(posterUrl) {
    if (
        posterUrl &&
        posterUrl.startsWith("/uploads/posters/")
    ) {
        deleteFile(
            posterDirectory,
            path.basename(posterUrl)
        );
    }
}

function deleteSongAudio(audioUrl) {
    if (
        audioUrl &&
        audioUrl.startsWith("/uploads/songs/audio/")
    ) {
        deleteFile(
            songAudioDirectory,
            path.basename(audioUrl)
        );
    }
}

function deleteSongCover(coverUrl) {
    if (
        coverUrl &&
        coverUrl.startsWith("/uploads/songs/covers/")
    ) {
        deleteFile(
            songCoverDirectory,
            path.basename(coverUrl)
        );
    }
}

function deleteWallpaperImage(imageUrl) {
    if (
        imageUrl &&
        imageUrl.startsWith("/uploads/wallpapers/")
    ) {
        deleteFile(
            wallpaperDirectory,
            path.basename(imageUrl)
        );
    }
}

function cleanupSongUploads(req) {
    if (!req.files) return;

    Object.values(req.files)
        .flat()
        .forEach(deleteUploadedFile);
}

// =========================================
// MOVIE UPLOAD ERROR HANDLER
// =========================================

function handlePosterUpload(req, res, next) {
    uploadPoster.single("posterFile")(req, res, function (error) {
        if (!error) return next();

        if (req.file) {
            deleteUploadedFile(req.file);
        }

        if (error instanceof multer.MulterError) {
            const message =
                error.code === "LIMIT_FILE_SIZE"
                    ? "Poster must be 5 MB or smaller."
                    : "Poster upload failed. Please try again.";

            return res.status(400).json({
                success: false,
                message
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message || "Invalid poster image."
        });
    });
}

// =========================================
// WALLPAPER UPLOAD ERROR HANDLER
// =========================================

function handleWallpaperUpload(req, res, next) {
    uploadWallpaper.single("wallpaperFile")(
        req,
        res,
        function (error) {
            if (!error) return next();

            if (req.file) {
                deleteUploadedFile(req.file);
            }

            if (error instanceof multer.MulterError) {
                const message =
                    error.code === "LIMIT_FILE_SIZE"
                        ? "Wallpaper image must be 10 MB or smaller."
                        : "Wallpaper upload failed. Please try again.";

                return res.status(400).json({
                    success: false,
                    message
                });
            }

            return res.status(400).json({
                success: false,
                message: error.message || "Invalid wallpaper image."
            });
        }
    );
}

// =========================================
// SONG UPLOAD ERROR HANDLER
// =========================================

function handleSongUpload(req, res, next) {
    uploadSongFiles.fields([
        { name: "audioFile", maxCount: 1 },
        { name: "coverFile", maxCount: 1 }
    ])(req, res, function (error) {
        if (!error) return next();

        cleanupSongUploads(req);

        if (error instanceof multer.MulterError) {
            let message = "Song upload failed. Please try again.";

            if (error.code === "LIMIT_FILE_SIZE") {
                message = "Each song file must be 30 MB or smaller.";
            } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
                message = "Unexpected file field. Check the upload form.";
            }

            return res.status(400).json({
                success: false,
                message
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message || "Invalid song upload."
        });
    });
}

// =========================================
// TEST ROUTE
// =========================================

app.get("/api/test", function (req, res) {
    res.json({
        success: true,
        message: "Prabhas Fan Hub backend is working!"
    });
});

// =========================================
// OWNER LOGIN
// =========================================

app.post("/api/owner/login", async function (req, res) {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: "Username and password are required."
        });
    }

    try {
        const validOwner = await verifyOwner(username, password);

        if (!validOwner) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        req.session.isOwner = true;
        req.session.username = username;

        req.session.save(function (error) {
            if (error) {
                console.error("Session save error:", error);

                return res.status(500).json({
                    success: false,
                    message: "Could not create owner session."
                });
            }

            res.json({
                success: true,
                message: "Owner login successful."
            });
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Server error during login."
        });
    }
});

// =========================================
// CHECK OWNER SESSION
// =========================================

app.get("/api/owner/check", function (req, res) {
    if (!req.session.isOwner) {
        return res.status(401).json({
            success: false,
            loggedIn: false
        });
    }

    res.json({
        success: true,
        loggedIn: true,
        username: req.session.username
    });
});

// =========================================
// OWNER LOGOUT
// =========================================

app.post("/api/owner/logout", function (req, res) {
    req.session.destroy(function (error) {
        if (error) {
            console.error("Logout error:", error);

            return res.status(500).json({
                success: false,
                message: "Logout failed."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            success: true,
            message: "Owner logged out."
        });
    });
});

// =========================================
// OWNER AUTHENTICATION
// =========================================

function requireOwner(req, res, next) {
    if (!req.session || !req.session.isOwner) {
        return res.status(401).json({
            success: false,
            message: "Owner login required."
        });
    }

    next();
}

// =========================================
// PUBLIC MOVIES API
// =========================================

app.get("/api/movies", function (req, res) {
    res.json({
        success: true,
        movies
    });
});

// =========================================
// ADD MOVIE - OWNER ONLY
// =========================================

app.post(
    "/api/admin/movies",
    requireOwner,
    handlePosterUpload,
    function (req, res) {
        const {
            name,
            year,
            character,
            description,
            link
        } = req.body;

        if (
            !name?.trim() ||
            !year?.trim() ||
            !character?.trim() ||
            !description?.trim() ||
            !link?.trim()
        ) {
            if (req.file) deleteUploadedFile(req.file);

            return res.status(400).json({
                success: false,
                message: "All movie fields are required."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a movie poster."
            });
        }

        const newMovie = {
            id: Date.now(),
            name: name.trim(),
            year: year.trim(),
            character: character.trim(),
            poster: "/uploads/posters/" + req.file.filename,
            description: description.trim(),
            link: link.trim()
        };

        movies.push(newMovie);

        if (!saveMovies()) {
            movies.pop();
            deleteUploadedFile(req.file);

            return res.status(500).json({
                success: false,
                message: "Could not save movie. Please try again."
            });
        }

        res.status(201).json({
            success: true,
            message: "Movie and poster added successfully.",
            movie: newMovie
        });
    }
);

// =========================================
// GET ALL MOVIES - OWNER ONLY
// =========================================

app.get("/api/admin/movies", requireOwner, function (req, res) {
    res.json({
        success: true,
        movies
    });
});

// =========================================
// EDIT MOVIE - OWNER ONLY
// =========================================

app.put(
    "/api/admin/movies/:id",
    requireOwner,
    handlePosterUpload,
    function (req, res) {
        const movieId = Number(req.params.id);

        const movieIndex = movies.findIndex(function (item) {
            return Number(item.id) === movieId;
        });

        if (movieIndex === -1) {
            if (req.file) deleteUploadedFile(req.file);

            return res.status(404).json({
                success: false,
                message: "Movie not found."
            });
        }

        const {
            name,
            year,
            character,
            description,
            link
        } = req.body;

        if (
            !name?.trim() ||
            !year?.trim() ||
            !character?.trim() ||
            !description?.trim() ||
            !link?.trim()
        ) {
            if (req.file) deleteUploadedFile(req.file);

            return res.status(400).json({
                success: false,
                message: "All movie fields are required."
            });
        }

        const oldMovie = { ...movies[movieIndex] };

        const updatedMovie = {
            ...oldMovie,
            name: name.trim(),
            year: year.trim(),
            character: character.trim(),
            description: description.trim(),
            link: link.trim()
        };

        if (req.file) {
            updatedMovie.poster =
                "/uploads/posters/" + req.file.filename;
        }

        movies[movieIndex] = updatedMovie;

        if (!saveMovies()) {
            movies[movieIndex] = oldMovie;

            if (req.file) deleteUploadedFile(req.file);

            return res.status(500).json({
                success: false,
                message: "Could not save movie changes. Please try again."
            });
        }

        if (req.file && oldMovie.poster) {
            deleteMoviePoster(oldMovie.poster);
        }

        res.json({
            success: true,
            message: "Movie updated successfully.",
            movie: updatedMovie
        });
    }
);

// =========================================
// DELETE MOVIE - OWNER ONLY
// =========================================

app.delete("/api/admin/movies/:id", requireOwner, function (req, res) {
    const movieId = Number(req.params.id);

    const movieIndex = movies.findIndex(function (item) {
        return Number(item.id) === movieId;
    });

    if (movieIndex === -1) {
        return res.status(404).json({
            success: false,
            message: "Movie not found."
        });
    }

    const removedMovie = movies[movieIndex];

    movies.splice(movieIndex, 1);

    if (!saveMovies()) {
        movies.splice(movieIndex, 0, removedMovie);

        return res.status(500).json({
            success: false,
            message: "Could not save movie deletion. Please try again."
        });
    }

    deleteMoviePoster(removedMovie.poster);

    res.json({
        success: true,
        message: "Movie deleted successfully."
    });
});

// =========================================
// PUBLIC SONGS API
// =========================================

app.get("/api/songs", function (req, res) {
    res.json({
        success: true,
        songs
    });
});

// =========================================
// ADD SONG - OWNER ONLY
// =========================================

app.post(
    "/api/admin/songs",
    requireOwner,
    handleSongUpload,
    function (req, res) {
        const { title, movie, description } = req.body;

        const audioFile = req.files?.audioFile?.[0];
        const coverFile = req.files?.coverFile?.[0];

        if (!title?.trim()) {
            cleanupSongUploads(req);

            return res.status(400).json({
                success: false,
                message: "Song title is required."
            });
        }

        if (!audioFile) {
            cleanupSongUploads(req);

            return res.status(400).json({
                success: false,
                message: "Please upload a song audio file."
            });
        }

        const newSong = {
            id: Date.now(),
            title: title.trim(),
            movie: movie?.trim() || "",
            description: description?.trim() || "",
            audio: "/uploads/songs/audio/" + audioFile.filename,
            cover: coverFile
                ? "/uploads/songs/covers/" + coverFile.filename
                : "",
            createdAt: new Date().toISOString()
        };

        songs.push(newSong);

        if (!saveSongs()) {
            songs.pop();
            cleanupSongUploads(req);

            return res.status(500).json({
                success: false,
                message: "Could not save song. Please try again."
            });
        }

        res.status(201).json({
            success: true,
            message: "Song added successfully.",
            song: newSong
        });
    }
);

// =========================================
// GET ALL SONGS - OWNER ONLY
// =========================================

app.get("/api/admin/songs", requireOwner, function (req, res) {
    res.json({
        success: true,
        songs
    });
});

// =========================================
// EDIT SONG - OWNER ONLY
// =========================================

app.put(
    "/api/admin/songs/:id",
    requireOwner,
    handleSongUpload,
    function (req, res) {
        const songId = Number(req.params.id);

        const songIndex = songs.findIndex(function (item) {
            return Number(item.id) === songId;
        });

        if (songIndex === -1) {
            cleanupSongUploads(req);

            return res.status(404).json({
                success: false,
                message: "Song not found."
            });
        }

        const { title, movie, description } = req.body;

        const audioFile = req.files?.audioFile?.[0];
        const coverFile = req.files?.coverFile?.[0];

        if (!title?.trim()) {
            cleanupSongUploads(req);

            return res.status(400).json({
                success: false,
                message: "Song title is required."
            });
        }

        const oldSong = { ...songs[songIndex] };

        const updatedSong = {
            ...oldSong,
            title: title.trim(),
            movie: movie?.trim() || "",
            description: description?.trim() || ""
        };

        if (audioFile) {
            updatedSong.audio =
                "/uploads/songs/audio/" + audioFile.filename;
        }

        if (coverFile) {
            updatedSong.cover =
                "/uploads/songs/covers/" + coverFile.filename;
        }

        songs[songIndex] = updatedSong;

        if (!saveSongs()) {
            songs[songIndex] = oldSong;
            cleanupSongUploads(req);

            return res.status(500).json({
                success: false,
                message: "Could not save song changes. Please try again."
            });
        }

        if (audioFile && oldSong.audio) {
            deleteSongAudio(oldSong.audio);
        }

        if (coverFile && oldSong.cover) {
            deleteSongCover(oldSong.cover);
        }

        res.json({
            success: true,
            message: "Song updated successfully.",
            song: updatedSong
        });
    }
);

// =========================================
// DELETE SONG - OWNER ONLY
// =========================================

app.delete("/api/admin/songs/:id", requireOwner, function (req, res) {
    const songId = Number(req.params.id);

    const songIndex = songs.findIndex(function (item) {
        return Number(item.id) === songId;
    });

    if (songIndex === -1) {
        return res.status(404).json({
            success: false,
            message: "Song not found."
        });
    }

    const removedSong = songs[songIndex];

    songs.splice(songIndex, 1);

    if (!saveSongs()) {
        songs.splice(songIndex, 0, removedSong);

        return res.status(500).json({
            success: false,
            message: "Could not save song deletion. Please try again."
        });
    }

    deleteSongAudio(removedSong.audio);
    deleteSongCover(removedSong.cover);

    res.json({
        success: true,
        message: "Song deleted successfully."
    });
});

// =========================================
// PUBLIC WALLPAPERS API
// =========================================

app.get("/api/wallpapers", function (req, res) {
    res.json({
        success: true,
        wallpapers
    });
});

// =========================================
// DOWNLOAD WALLPAPER - PUBLIC
// =========================================

app.get("/api/wallpapers/download/:id", function (req, res) {
    try {
        const wallpaper = wallpapers.find(function (item) {
            return String(item.id) === String(req.params.id);
        });

        if (!wallpaper) {
            return res.status(404).json({
                success: false,
                message: "Wallpaper not found."
            });
        }

        const imageValue =
            wallpaper.image ||
            wallpaper.image_url ||
            wallpaper.imageUrl;

        if (!imageValue) {
            return res.status(404).json({
                success: false,
                message: "Wallpaper image path is missing."
            });
        }

        // Use only the stored filename, not a supplied filesystem path.
        const filenameOnDisk = path.basename(
            String(imageValue).replace(/\\/g, "/")
        );

        const imagePath = path.join(
            wallpaperDirectory,
            filenameOnDisk
        );

        const extension = path.extname(filenameOnDisk).toLowerCase();

        if (![".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
            return res.status(400).json({
                success: false,
                message: "Unsupported wallpaper image format."
            });
        }

        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                success: false,
                message: "Wallpaper image file not found."
            });
        }

        const downloadName = String(
            req.query.filename || wallpaper.title || "prabhas-wallpaper"
        )
            .replace(/[\\/:*?"<>|]/g, "-")
            .trim() || "prabhas-wallpaper";

        res.download(
            imagePath,
            downloadName + extension,
            function (error) {
                if (error) {
                    console.error("Wallpaper download error:", error);

                    if (!res.headersSent) {
                        res.status(500).json({
                            success: false,
                            message: "Unable to download wallpaper."
                        });
                    }
                }
            }
        );

    } catch (error) {
        console.error("Wallpaper download error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Unable to download wallpaper."
            });
        }
    }
});

// =========================================
// ADD WALLPAPER - OWNER ONLY
// =========================================

app.post(
    "/api/admin/wallpapers",
    requireOwner,
    handleWallpaperUpload,
    function (req, res) {
        const { title, category, description } = req.body;

        if (!title?.trim()) {
            if (req.file) deleteUploadedFile(req.file);

            return res.status(400).json({
                success: false,
                message: "Wallpaper title is required."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a wallpaper image."
            });
        }

        const newWallpaper = {
            id: Date.now(),
            title: title.trim(),
            category: category?.trim() || "",
            description: description?.trim() || "",
            image: "/uploads/wallpapers/" + req.file.filename,
            createdAt: new Date().toISOString()
        };

        wallpapers.push(newWallpaper);

        if (!saveWallpapers()) {
            wallpapers.pop();
            deleteUploadedFile(req.file);

            return res.status(500).json({
                success: false,
                message: "Could not save wallpaper. Please try again."
            });
        }

        res.status(201).json({
            success: true,
            message: "Wallpaper uploaded successfully.",
            wallpaper: newWallpaper
        });
    }
);

// =========================================
// GET ALL WALLPAPERS - OWNER ONLY
// =========================================

app.get(
    "/api/admin/wallpapers",
    requireOwner,
    function (req, res) {
        res.json({
            success: true,
            wallpapers
        });
    }
);

// =========================================
// DELETE WALLPAPER - OWNER ONLY
// =========================================

app.delete(
    "/api/admin/wallpapers/:id",
    requireOwner,
    function (req, res) {
        const wallpaperId = Number(req.params.id);

        const wallpaperIndex = wallpapers.findIndex(function (item) {
            return Number(item.id) === wallpaperId;
        });

        if (wallpaperIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Wallpaper not found."
            });
        }

        const removedWallpaper = wallpapers[wallpaperIndex];

        wallpapers.splice(wallpaperIndex, 1);

        if (!saveWallpapers()) {
            wallpapers.splice(wallpaperIndex, 0, removedWallpaper);

            return res.status(500).json({
                success: false,
                message: "Could not save wallpaper deletion. Please try again."
            });
        }

        deleteWallpaperImage(removedWallpaper.image);

        res.json({
            success: true,
            message: "Wallpaper deleted successfully."
        });
    }
);

// =========================================
// JSON ERROR HANDLER
// =========================================

app.use(function (error, req, res, next) {
    console.error("Unhandled backend error:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        message: "An unexpected backend error occurred."
    });
});

// =========================================
// START SERVER
// =========================================

app.listen(PORT, function () {
    console.log(
        `Prabhas Fan Hub backend running on http://localhost:${PORT}`
    );

    console.log(
        `Loaded ${movies.length} movie(s) from movies.json.`
    );

    console.log(
        `Loaded ${songs.length} song(s) from songs.json.`
    );

    console.log(
        `Loaded ${wallpapers.length} wallpaper(s) from wallpapers.json.`
    );
});
