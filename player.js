/* =========================================================
   SIMPLEESTREAM PLAYER
========================================================= */

const BASE_PATH = "/simpleestream/";
const OMDB_API_KEY = "b3aa6957";
const TMDB_API_KEY = "355c7191de5cb3f569b2a6b34cc274bc";


/* =========================================================
   DOM
========================================================= */

const favoriteButton =
    document.getElementById("favoriteButton");

const player =
    document.getElementById("player");

const playerWrapper =
    document.querySelector(
        ".player-wrapper"
    );

const playerLoading =
    document.getElementById(
        "playerLoading"
    );


const watchTitle =
    document.getElementById(
        "watchTitle"
    );

const watchDescription =
    document.getElementById(
        "watchDescription"
    );

const watchMeta =
    document.getElementById(
        "watchMeta"
    );

const watchType =
    document.getElementById(
        "watchType"
    );


const episodePanel =
    document.getElementById(
        "episodePanel"
    );

const seasonSelect =
    document.getElementById(
        "seasonSelect"
    );

const episodesContainer =
    document.getElementById(
        "episodesContainer"
    );


const similarContainer =
    document.getElementById(
        "similarContainer"
    );


const playerSearchToggle =
    document.getElementById(
        "playerSearchToggle"
    );


/* =========================================================
   URL STATE
========================================================= */

const url =
    new URL(window.location.href);

const params =
    url.searchParams;

let imdbID =
    params.get("imdb");

let mediaType =
    params.get("type") || "movie";

const slug =
    getSlugFromPath();


let currentSeason =
    Number(
        params.get("season") || 1
    );


let currentEpisode =
    Number(
        params.get("episode") || 1
    );


let currentShowData =
    null;


let currentEpisodeData =
    null;


/* =========================================================
   VALIDATE
========================================================= */

if (imdbID) {

    loadTitle();

} else {

    showPlayerError(
        "No movie or TV show was specified."
    );

}


/* =========================================================
   LOAD TITLE
========================================================= */

   async function initialiseFromSlug() {

    const result =
        await findTitleBySlug(slug);

    if (!result) {

        showPlayerError(
            "This title could not be found."
        );

        return;

    }

    imdbID =
        result.imdbID;

    mediaType =
        result.Type === "series"
            ? "series"
            : "movie";

    loadTitle();

}

async function loadTitle() {

    try {

        const response =
            await fetch(
                `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${encodeURIComponent(imdbID)}`
            );


        const data =
            await response.json();


        if (
            data.Response === "False"
        ) {

            showPlayerError(
                "This title could not be found."
            );

            return;
        }


        currentShowData =
            data;

       updateFavoriteButton();


        updateTitleInfo(
            data
        );


        if (
            mediaType === "series" ||
            data.Type === "series"
        ) {

            await setupTV(
                data
            );

        } else {

            setupMovie(
                data
            );

        }


        await loadSimilar(
            data
        );

    } catch (error) {

        console.error(
            error
        );


        showPlayerError(
            "Unable to load this title."
        );

    }

}


/* =========================================================
   TITLE INFORMATION
========================================================= */

function updateTitleInfo(
    data
) {

    document.title =
        `Watch ${data.Title} — SimpleeStream`;


    watchTitle.textContent =
        data.Title;


    watchDescription.textContent =
        data.Plot &&
        data.Plot !== "N/A"
            ? data.Plot
            : "";


    watchType.textContent =
        data.Type === "series"
            ? "TV SERIES"
            : "MOVIE";


    const metadata = [];


    if (
        data.Year &&
        data.Year !== "N/A"
    ) {

        metadata.push(
            data.Year
        );

    }


    if (
        data.Rated &&
        data.Rated !== "N/A"
    ) {

        metadata.push(
            data.Rated
        );

    }


    if (
        data.Runtime &&
        data.Runtime !== "N/A"
    ) {

        metadata.push(
            data.Runtime
        );

    }


    if (
        data.imdbRating &&
        data.imdbRating !== "N/A"
    ) {

        metadata.push(
            `★ ${data.imdbRating}`
        );

    }


    watchMeta.innerHTML =
        metadata
            .map(
                item =>
                    `<span>${escapeHTML(item)}</span>`
            )
            .join(" · ");

}


/* =========================================================
   MOVIE
========================================================= */

function setupMovie(
    data
) {

    episodePanel.classList.remove(
        "visible"
    );


    player.src =
        `https://vsembed.su/embed/movie/${encodeURIComponent(imdbID)}`;


    saveState({

        imdb: imdbID,

        type: "movie",

        title: data.Title

    });

}

/* =========================================================
   TV
========================================================= */

async function setupTV(
    data
) {

    episodePanel.classList.add(
        "visible"
    );


    const totalSeasons =
        Number(
            data.totalSeasons || 0
        );


    seasonSelect.innerHTML = "";

if (
    currentSeason > totalSeasons
) {
    currentSeason = 1;
}

for (
    let season = 1;
    season <= totalSeasons;
    season++
) {

    const button =
        document.createElement("button");

    button.className =
        "season-button";

    button.textContent =
        `Season ${season}`;

    button.dataset.season =
        season;

    if (
        season === currentSeason
    ) {
        button.classList.add(
            "selected"
        );
    }

    button.addEventListener(
        "click",
        () => {

            currentSeason =
                season;

            currentEpisode =
                1;

            document
                .querySelectorAll(
                    ".season-button"
                )
                .forEach(btn =>
                    btn.classList.remove(
                        "selected"
                    )
                );

            button.classList.add(
                "selected"
            );

            updateURL();

            loadEpisodes();
        }
    );

    seasonSelect.appendChild(
        button
    );
}


    await loadEpisodes();

}


/* =========================================================
   EPISODES
========================================================= */

async function loadEpisodes() {

    episodesContainer.innerHTML = `
        <div style="
            color:#777;
            padding:15px 0;
        ">
            Loading episodes...
        </div>
    `;

    try {

        /*
            Convert IMDb ID -> TMDB TV ID
        */
        const findResponse = await fetch(
            `https://api.themoviedb.org/3/find/${encodeURIComponent(imdbID)}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
        );

        if (!findResponse.ok) {
            throw new Error(
                `TMDB lookup failed: ${findResponse.status}`
            );
        }

        const findData =
            await findResponse.json();

        const show =
            findData.tv_results?.[0];

        if (!show) {
            throw new Error(
                "Could not find TV show on TMDB."
            );
        }

        /*
            Load requested season
        */
        const seasonResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${show.id}/season/${currentSeason}?api_key=${TMDB_API_KEY}&language=en-US`
        );

        if (!seasonResponse.ok) {
            throw new Error(
                `TMDB season failed: ${seasonResponse.status}`
            );
        }

        const seasonData =
            await seasonResponse.json();

        const episodes =
            seasonData.episodes || [];

        episodesContainer.innerHTML = "";

        if (!episodes.length) {

            episodesContainer.innerHTML = `
                <div style="
                    color:#777;
                    padding:15px 0;
                ">
                    No episodes found.
                </div>
            `;

            return;
        }

        /*
            Make sure selected episode exists
        */
        if (
            !episodes.some(
                episode =>
                    episode.episode_number ===
                    currentEpisode
            )
        ) {
            currentEpisode =
                episodes[0].episode_number;
        }

        currentEpisodeData =
            episodes;

        episodes.forEach(
            episode => {

                const episodeNumber =
                    episode.episode_number;

                const button =
                    document.createElement(
                        "button"
                    );

                button.className =
                    "episode-button";

                if (
                    episodeNumber ===
                    currentEpisode
                ) {
                    button.classList.add(
                        "selected"
                    );
                }

                button.innerHTML = `

                    <span class="episode-number">
                        Episode ${episodeNumber}
                    </span>

                    <span class="episode-name">
                        ${
                            escapeHTML(
                                episode.name ||
                                `Episode ${episodeNumber}`
                            )
                        }
                    </span>

                `;

                button.addEventListener(
                    "click",
                    () => {

                        playEpisode(
                            currentSeason,
                            episodeNumber
                        );

                    }
                );

                episodesContainer.appendChild(
                    button
                );
            }
        );

        playEpisode(
            currentSeason,
            currentEpisode,
            false
        );

    } catch (error) {

        console.error(
            "Episode loading failed:",
            error
        );

        episodesContainer.innerHTML = `
            <div style="
                color:#777;
                padding:15px 0;
            ">
                Unable to load episodes.
            </div>
        `;
    }
}


function highlightEpisode() {

    document

        .querySelectorAll(".episode-button")

        .forEach((button, index) => {

            button.classList.toggle(

                "selected",

                index + 1 === currentEpisode

            );

        });

}

/* =========================================================
   PLAY EPISODE
========================================================= */

function playEpisode(
    season,
    episode,
    updateHistory = true
) {

    currentSeason =
        Number(season);


    currentEpisode =
        Number(episode);


    player.src =
        `https://vsembed.su/embed/tv?imdb=${encodeURIComponent(imdbID)}&season=${currentSeason}&episode=${currentEpisode}`;


    highlightEpisode();


    /*
        Update URL without reloading page.
    */

    if (updateHistory) {

        updateURL();

    }


    saveState({

        imdb: imdbID,

        type: "series",

        title:
            currentShowData?.Title || "",

        season:
            currentSeason,

        episode:
            currentEpisode

    });

}


/* =========================================================
   URL
========================================================= */

function updateURL() {

    const title =
        currentShowData?.Title ||
        getSlugFromPath() ||
        "watch";


    const slug =
        slugify(title);


    const newParams =
        new URLSearchParams();


    newParams.set(
        "imdb",
        imdbID
    );


    newParams.set(
        "type",
        mediaType === "series"
            ? "series"
            : "movie"
    );


    if (
        mediaType === "series"
    ) {

        newParams.set(
            "season",
            currentSeason
        );


        newParams.set(
            "episode",
            currentEpisode
        );

    }


    const newURL =
        `${BASE_PATH}player/${slug}?${newParams.toString()}`;


    history.replaceState(
        {
            season: currentSeason,
            episode: currentEpisode
        },
        "",
        newURL
    );

}


/* =========================================================
   RESTORE LOCAL STATE
========================================================= */

function saveState(
    state
) {

    try {

        localStorage.setItem(
            "simpleestream:lastPlayed",
            JSON.stringify({
                ...state,
                savedAt: Date.now()
            })
        );

    } catch (error) {

        console.warn(
            "Could not save player state.",
            error
        );

    }

}


/* =========================================================
   SIMILAR
========================================================= */

async function loadSimilar(
    data
) {

    similarContainer.innerHTML =
        "";


    if (
        !data.Title
    ) {

        return;
    }


    try {

        const response =
            await fetch(
                `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(data.Title)}`
            );


        const result =
            await response.json();


        if (
            result.Response === "False" ||
            !result.Search
        ) {

            return;
        }


        result.Search
            .filter(
                item =>
                    item.imdbID !== imdbID
            )
            .slice(0, 8)
            .forEach(
                item => {

                    const card =
                        createSimilarCard(
                            item
                        );


                    similarContainer.appendChild(
                        card
                    );

                }
            );

    } catch (error) {

        console.error(
            "Similar titles failed:",
            error
        );

    }

}


function createSimilarCard(
    item
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "movie-card";


    const poster =
        item.Poster &&
        item.Poster !== "N/A"
            ? item.Poster
            : "";


    card.innerHTML = `

        <div class="movie-poster">

            ${
                poster
                    ? `
                        <img
                            src="${poster}"
                            alt="${escapeHTML(item.Title)}"
                            loading="lazy"
                        >
                    `
                    : ""
            }

            <div class="movie-overlay">

                <div class="play-circle">
                    ▶
                </div>

            </div>

        </div>

        <div class="movie-info">

            <div class="movie-title">
                ${escapeHTML(item.Title)}
            </div>

            <div class="movie-meta">

                <span>
                    ${item.Year || ""}
                </span>

                <span>
                    ${
                        item.Type === "series"
                            ? "TV"
                            : "Movie"
                    }
                </span>

            </div>

        </div>

    `;


    card.onclick =
        () => {

            const type =
                item.Type === "series"
                    ? "series"
                    : "movie";


            const slug =
                slugify(
                    item.Title
                );


            const newParams =
                new URLSearchParams({

                    imdb:
                        item.imdbID,

                    type

                });


            window.location.href =
    `${BASE_PATH}player/${slug}?${newParams.toString()}`;

        };


    return card;
}


/* =========================================================
   PLAYER LOAD
========================================================= */

function markPlayerLoaded() {

    playerLoading.style.display =
        "none";


    playerWrapper.classList.add(
        "loaded"
    );

}


/* =========================================================
   ERROR
========================================================= */

function showPlayerError(
    message
) {

    playerLoading.innerHTML = `

        <div style="
            text-align:center;
            padding:30px;
        ">

            <div style="
                font-size:35px;
                margin-bottom:15px;
            ">
                ⚠
            </div>

            <div style="
                color:#aaa;
                font-size:14px;
            ">
                ${escapeHTML(message)}
            </div>

            <a
                href="/simpleestream/"
                style="
                    display:inline-block;
                    margin-top:20px;
                    padding:10px 18px;
                    background:white;
                    color:black;
                    border-radius:6px;
                    font-weight:700;
                "
            >
                Return Home
            </a>

        </div>

    `;

}


/* =========================================================
   BROWSER NAVIGATION
========================================================= */

window.addEventListener(
    "popstate",
    () => {

        window.location.reload();

    }
);


/* =========================================================
   SEARCH FROM PLAYER
========================================================= */

if (playerSearchToggle) {

    playerSearchToggle.addEventListener(
        "click",
        () => {

            /*
                Keep player page separate,
                but make the search button
                return to the home page's
                search UI.
            */

            window.location.href =
    `${BASE_PATH}?search=1`;

        }
    );

}

   player.addEventListener(
    "load",
    () => {

        markPlayerLoaded();

    }
);

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


function getSlugFromPath() {

    const parts =
        window.location.pathname
            .split("/")
            .filter(Boolean);

    const playerIndex =
        parts.indexOf("player");

    if (
        playerIndex !== -1 &&
        parts[playerIndex + 1]
    ) {

        return parts[playerIndex + 1];

    }

    return null;

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

async function findTitleBySlug(slug) {

    if (!slug) {
        return null;
    }

    const query =
        slug
            .replace(/-/g, " ")
            .trim();

    const url =
        `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}`;

    try {

        const response =
            await fetch(url);

        const data =
            await response.json();

        if (
            data.Response === "False" ||
            !data.Search ||
            !data.Search.length
        ) {
            return null;
        }

        /*
         * Prefer an exact title match.
         */

        const exact =
            data.Search.find(item =>
                slugify(item.Title) === slug
            );

        if (exact) {
            return exact;
        }

        return data.Search[0];

    } catch (error) {

        console.error(
            "Unable to find title:",
            error
        );

        return null;
    }
}

function getFavorites() {
    try {
        return JSON.parse(
            localStorage.getItem("simpleestream:favorites")
        ) || [];
    } catch (error) {
        return [];
    }
}

function saveFavorites(favorites) {
    localStorage.setItem(
        "simpleestream:favorites",
        JSON.stringify(favorites)
    );
}

function isFavorite() {
    return getFavorites().some(
        item => item.imdb === imdbID
    );
}

function updateFavoriteButton() {
    if (!favoriteButton) return;

    if (isFavorite()) {
        favoriteButton.textContent =
            "In My List";
    } else {
        favoriteButton.textContent =
            "Add to My List";
    }
}

function toggleFavorite() {
    if (!currentShowData) return;

    let favorites =
        getFavorites();

    const alreadySaved =
        favorites.some(
            item => item.imdb === imdbID
        );

    if (alreadySaved) {

        favorites =
            favorites.filter(
                item => item.imdb !== imdbID
            );

    } else {

        favorites.push({
            imdb: imdbID,
            title: currentShowData.Title,
            type:
                currentShowData.Type === "series"
                    ? "series"
                    : "movie",
            poster: currentShowData.Poster || "",
            year: currentShowData.Year || ""
        });

    }

    saveFavorites(
        favorites
    );

    updateFavoriteButton();
}

if (favoriteButton) {

    favoriteButton.addEventListener(
        "click",
        toggleFavorite
    );

}
