/* =========================================================
   SIMPLEESTREAM HOME
========================================================= */

const OMDB_API_KEY = "b3aa6957";
const TMDB_API_KEY = "355c7191de5cb3f569b2a6b34cc274bc";

const BASE_PATH = "/simplestream/";


const TMDB_IMAGE = "https://image.tmdb.org/t/p/w780";
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/original";


/* =========================================================
   DOM
========================================================= */

const searchToggle =
    document.getElementById("searchToggle");

const searchPanel =
    document.getElementById("searchPanel");

const searchInput =
    document.getElementById("searchInput");

const closeSearch =
    document.getElementById("closeSearch");

const suggestions =
    document.getElementById("suggestions");


const popularMovies =
    document.getElementById("popularMovies");

const trendingMovies =
    document.getElementById("trendingMovies");

const topRatedMovies =
    document.getElementById("topRatedMovies");

const recentMovies =
    document.getElementById("recentMovies");


const hero =
    document.getElementById("hero");

const heroBackdrop =
    document.querySelector(".hero-backdrop");

const heroTitle =
    document.getElementById("heroTitle");

const heroDescription =
    document.getElementById("heroDescription");

const heroMeta =
    document.getElementById("heroMeta");

const heroWatch =
    document.getElementById("heroWatch");

const heroDetails =
    document.getElementById("heroDetails");

const heroDots =
    document.getElementById("heroDots");


const detailsModal =
    document.getElementById("detailsModal");

const modalBackdrop =
    document.getElementById("modalBackdrop");

const modalClose =
    document.getElementById("modalClose");

const modalImage =
    document.getElementById("modalImage");

const modalTitle =
    document.getElementById("modalTitle");

const modalDescription =
    document.getElementById("modalDescription");

const modalMeta =
    document.getElementById("modalMeta");

const modalWatch =
    document.getElementById("modalWatch");


let debounceTimer = null;

let heroItems = [];

let currentHeroIndex = 0;

let heroTimer = null;


/* =========================================================
   TMDB
========================================================= */

async function tmdbRequest(endpoint) {

    if (
        !TMDB_API_KEY ||
        TMDB_API_KEY === "YOUR_TMDB_API_KEY"
    ) {
        console.warn(
            "TMDB API key has not been configured."
        );

        return null;
    }


    const url =
        `https://api.themoviedb.org/3${endpoint}` +
        `?api_key=${TMDB_API_KEY}` +
        `&language=en-US`;


    try {

        const response =
            await fetch(url);

        if (!response.ok) {
            throw new Error(
                `TMDB HTTP ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {

        console.error(
            "TMDB request failed:",
            error
        );

        return null;
    }
}


/* =========================================================
   HOME DATA
========================================================= */

async function loadHome() {

    if (
        !TMDB_API_KEY ||
        TMDB_API_KEY === "YOUR_TMDB_API_KEY"
    ) {

        showTMDBSetupMessage();

        return;
    }


    const [
        popular,
        trending,
        topRated,
        recent
    ] = await Promise.all([

        tmdbRequest(
            "/trending/all/week"
        ),

        tmdbRequest(
            "/trending/all/day"
        ),

        tmdbRequest(
            "/movie/top_rated"
        ),

        tmdbRequest(
            "/movie/now_playing"
        )

    ]);


    renderMovieRow(
        popularMovies,
        popular?.results || []
    );


    renderMovieRow(
        trendingMovies,
        trending?.results || []
    );


    renderMovieRow(
        topRatedMovies,
        topRated?.results || []
    );


    renderMovieRow(
        recentMovies,
        recent?.results || []
    );


    heroItems =
        (popular?.results || [])
            .filter(item => item.backdrop_path)
            .slice(0, 5);


    setupHero();

}


function showTMDBSetupMessage() {

    const message = `
        <div style="
            padding:30px;
            color:#777;
            background:#101010;
            border-radius:8px;
            width:100%;
        ">
            Add your TMDB API key to
            <strong>app.js</strong>
            to enable the home catalogue.
        </div>
    `;


    popularMovies.innerHTML = message;
}


/* =========================================================
   CARD RENDERING
========================================================= */

function renderMovieRow(
    container,
    items
) {

    container.innerHTML = "";


    items
        .filter(item => item.poster_path)
        .forEach((item, index) => {

            const card =
                createMovieCard(
                    item,
                    index
                );

            container.appendChild(card);

        });
}


function createMovieCard(
    item,
    index = 0
) {

    const card =
        document.createElement("article");

    card.className = "movie-card";


    const title =
        item.title ||
        item.name ||
        "Unknown";


    const year =
        (
            item.release_date ||
            item.first_air_date ||
            ""
        ).substring(0, 4);


    const type =
        item.media_type ||
        (
            item.first_air_date
                ? "tv"
                : "movie"
        );


    const poster =
        item.poster_path
            ? TMDB_IMAGE + item.poster_path
            : "";


    card.innerHTML = `

        <div class="movie-poster">

            <img
                src="${poster}"
                alt="${escapeHTML(title)}"
                loading="lazy"
            >

            <div class="movie-overlay">

                <div class="play-circle">
                    ▶
                </div>

            </div>

            ${
                index < 10
                    ? `<div class="card-number">${index + 1}</div>`
                    : ""
            }

        </div>

        <div class="movie-info">

            <div class="movie-title">
                ${escapeHTML(title)}
            </div>

            <div class="movie-meta">

                <span>${year || "—"}</span>

                <span>
                    ${
                        type === "tv"
                            ? "TV"
                            : "Movie"
                    }
                </span>

            </div>

        </div>

    `;


    card.addEventListener(
        "click",
        () => openTMDBItem(item)
    );


    return card;
}


/* =========================================================
   TMDB → IMDb → PLAYER
========================================================= */

async function openTMDBItem(item) {

    const type =
        item.media_type ||
        (
            item.first_air_date
                ? "tv"
                : "movie"
        );


    const endpoint =
        type === "tv"
            ? `/tv/${item.id}/external_ids`
            : `/movie/${item.id}/external_ids`;


    const external =
        await tmdbRequest(endpoint);


    if (
        !external ||
        !external.imdb_id
    ) {

        alert(
            "This title does not currently have an IMDb ID."
        );

        return;
    }


    openPlayer(
        item,
        external.imdb_id,
        type
    );
}


function openPlayer(
    item,
    imdbID,
    type
) {

    const title =
        item.title ||
        item.name ||
        "watch";


    const slug =
        slugify(title);


    const params =
        new URLSearchParams({

            imdb: imdbID,

            type: type

        });


    window.location.href =
    `${BASE_PATH}player/${slug}?${params.toString()}`;
}


/* =========================================================
   HERO
========================================================= */

function setupHero() {

    if (!heroItems.length) {
        return;
    }


    heroDots.innerHTML = "";


    heroItems.forEach(
        (_, index) => {

            const dot =
                document.createElement("div");

            dot.className =
                "hero-dot";


            if (index === 0) {
                dot.classList.add("active");
            }


            heroDots.appendChild(dot);

        }
    );


    showHero(0);


    clearInterval(heroTimer);


    heroTimer =
        setInterval(
            () => {

                currentHeroIndex =
                    (
                        currentHeroIndex + 1
                    ) %
                    heroItems.length;


                showHero(
                    currentHeroIndex
                );

            },
            9000
        );
}


function showHero(index) {

    const item =
        heroItems[index];


    if (!item) {
        return;
    }


    const title =
        item.title ||
        item.name ||
        "Unknown";


    const year =
        (
            item.release_date ||
            item.first_air_date ||
            ""
        ).substring(0, 4);


    heroBackdrop.style.backgroundImage =
        `url("${TMDB_BACKDROP}${item.backdrop_path}")`;


    heroTitle.textContent =
        title;


    heroDescription.textContent =
        item.overview ||
        "Discover this title on SimpleeStream.";


    heroMeta.innerHTML = `

        <span class="rating">
            ★ ${item.vote_average
                ? item.vote_average.toFixed(1)
                : "N/A"}
        </span>

        <span>
            ${year || "—"}
        </span>

        <span>
            ${
                item.media_type === "tv"
                    ? "TV"
                    : "Movie"
            }
        </span>

    `;


    heroWatch.onclick =
        () => openTMDBItem(item);


    heroDetails.onclick =
        () => showDetails(item);


    [...heroDots.children]
        .forEach(
            (dot, dotIndex) => {

                dot.classList.toggle(
                    "active",
                    dotIndex === index
                );

            }
        );
}


/* =========================================================
   DETAILS MODAL
========================================================= */

async function showDetails(item) {

    modalTitle.textContent =
        item.title ||
        item.name ||
        "Unknown";


    modalDescription.textContent =
        item.overview ||
        "No description available.";


    modalImage.style.backgroundImage =
        item.poster_path
            ? `url("${TMDB_BACKDROP}${item.backdrop_path || item.poster_path}")`
            : "none";


    const year =
        (
            item.release_date ||
            item.first_air_date ||
            ""
        ).substring(0, 4);


    modalMeta.innerHTML = `

        <span class="rating">
            ★ ${
                item.vote_average
                    ? item.vote_average.toFixed(1)
                    : "N/A"
            }
        </span>

        <span>${year}</span>

        <span>
            ${
                item.media_type === "tv"
                    ? "TV"
                    : "Movie"
            }
        </span>

    `;


    modalWatch.onclick =
        () => openTMDBItem(item);


    detailsModal.classList.add(
        "open"
    );


    document.body.style.overflow =
        "hidden";
}


function closeDetails() {

    detailsModal.classList.remove(
        "open"
    );


    document.body.style.overflow =
        "";
}


modalClose.addEventListener(
    "click",
    closeDetails
);


modalBackdrop.addEventListener(
    "click",
    closeDetails
);


/* =========================================================
   SEARCH
========================================================= */

searchToggle.addEventListener(
    "click",
    openSearch
);


closeSearch.addEventListener(
    "click",
    closeSearchPanel
);


function openSearch() {

    searchPanel.classList.add(
        "open"
    );


    setTimeout(
        () => searchInput.focus(),
        100
    );
}


function closeSearchPanel() {

    searchPanel.classList.remove(
        "open"
    );

}


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeSearchPanel();

            closeDetails();

        }

    }
);


searchInput.addEventListener(
    "input",
    () => {

        const query =
            searchInput.value.trim();


        clearTimeout(
            debounceTimer
        );


        if (!query) {

            suggestions.innerHTML =
                "";

            return;
        }


        debounceTimer =
            setTimeout(
                () =>
                    fetchSuggestions(query),
                300
            );

    }
);


/* =========================================================
   OMDB SEARCH
========================================================= */

async function fetchSuggestions(
    query
) {

    try {

        const response =
            await fetch(
                `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}`
            );


        const data =
            await response.json();


        suggestions.innerHTML =
            "";


        if (
            data.Response === "False" ||
            !data.Search
        ) {

            suggestions.innerHTML = `
                <div style="
                    padding:20px;
                    color:#777;
                ">
                    No results found.
                </div>
            `;

            return;
        }


        data.Search
            .slice(0, 8)
            .forEach(
                item => {

                    const result =
                        document.createElement(
                            "div"
                        );


                    result.className =
                        "search-result";


                    const poster =
                        item.Poster !== "N/A"
                            ? item.Poster
                            : "";


                    result.innerHTML = `

                        ${
                            poster
                                ? `
                                    <img
                                        src="${poster}"
                                        alt=""
                                    >
                                `
                                : `
                                    <div style="
                                        width:48px;
                                        height:68px;
                                        background:#222;
                                        border-radius:4px;
                                    "></div>
                                `
                        }

                        <div>

                            <div class="search-result-title">
                                ${escapeHTML(item.Title)}
                            </div>

                            <div class="search-result-meta">
                                ${item.Year}
                                ·
                                ${item.Type === "series"
                                    ? "TV"
                                    : "Movie"}
                            </div>

                        </div>

                    `;


                    result.addEventListener(
                        "click",
                        () =>
                            selectSearchResult(
                                item
                            )
                    );


                    suggestions.appendChild(
                        result
                    );

                }
            );

    } catch (error) {

        console.error(
            "Search failed:",
            error
        );

    }
}


async function selectSearchResult(
    item
) {

    suggestions.innerHTML =
        "";


    searchInput.value =
        `${item.Title} (${item.Year})`;


    /*
        We already have the IMDb ID
        directly from OMDb.
    */

    const type =
        item.Type === "series"
            ? "series"
            : "movie";


    const slug =
        slugify(item.Title);


    const params =
        new URLSearchParams({

            imdb: item.imdbID,

            type: type

        });


    window.location.href =
        `${BASE_PATH}player/${slug}?${params.toString()}`;
}


/* =========================================================
   CAROUSEL BUTTONS
========================================================= */

document
    .querySelectorAll(".carousel-arrow")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const direction =
                    Number(
                        button.dataset.direction
                    );


                const row =
                    popularMovies;


                row.scrollBy({

                    left:
                        direction *
                        700,

                    behavior:
                        "smooth"

                });

            }
        );

    });


/* =========================================================
   HELPERS
========================================================= */

function slugify(text) {

    return String(text)

        .toLowerCase()

        .trim()

        .replace(
            /[^a-z0-9]+/g,
            "-"
        )

        .replace(
            /^-+|-+$/g,
            ""
        );

}


function escapeHTML(text) {

    return String(text)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   START
========================================================= */

loadHome();
