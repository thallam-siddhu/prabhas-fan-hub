
const movieContainer =
    document.getElementById("movieContainer");


// =========================================
// DISPLAY ALL MOVIES
// =========================================

function displayMovies() {

    if (!movieContainer) {
        return;
    }

    movieContainer.innerHTML = "";


    movies.forEach(function (movie) {

        const movieCard =
            document.createElement("div");

        movieCard.className = "movie-card";


        movieCard.innerHTML = `

            <div class="movie-poster">

                <img
                    src="${movie.poster}"
                    alt="${movie.title}"
                >

            </div>


            <div class="movie-info">

                <p class="movie-label">
                    PRABHAS FILM
                </p>


                <h2>
                    ${movie.title}
                </h2>


                <p class="movie-year">
                    ${movie.year}
                </p>


                <p class="movie-character">
                    Prabhas as ${movie.character}
                </p>


                <button
                    type="button"
                    class="watch-button"
                    onclick="watchMovie('${movie.id}')">

                    ▶ Watch Movie

                </button>

            </div>

        `;


        movieContainer.appendChild(movieCard);

    });

}


// =========================================
// WATCH MOVIE
// =========================================

function watchMovie(movieId) {

    const movie =
        movies.find(function (item) {

            return item.id === movieId;

        });


    if (!movie) {
        return;
    }


    if (movie.youtubeLink) {

        window.location.href =
            movie.youtubeLink;

    } else {

        alert(
            "Movie link is not available yet."
        );

    }

}


// =========================================
// START
// =========================================

displayMovies();

