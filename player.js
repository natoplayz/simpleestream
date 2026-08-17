/* =========================================================
   SIMPLEESTREAM PLAYER
========================================================= */

const BASE_PATH = "/simplestream/";
const OMDB_API_KEY = "b3aa6957";


/* =========================================================
   DOM
========================================================= */

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


const imdbID =
    params.get("imdb");


const mediaType =
    params.get("type") || "movie";


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

if (!imdbID) {

    showPlayerError(
        "No title was specified."
    );

} else {

    loadTitle();

}


/* =========================================================
   LOAD TITLE
========================================================= */

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
        `https://vidsrc.me/embed/${imdbID}`;


    markPlayerLoaded();


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


    seasonSelect.innerHTML =
        "";


    for (
        let season = 1;
        season <= totalSeasons;
        season++
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            season;


        option.textContent =
            `Season ${season}`;


        seasonSelect.appendChild(
            option
        );

    }


    /*
        If the URL contains a season,
        restore it.
    */

    if (
        currentSeason > totalSeasons
    ) {

        currentSeason = 1;

    }


    seasonSelect.value =
        currentSeason;


    seasonSelect.onchange =
        () => {

            currentSeason =
                Number(
                    seasonSelect.value
                );


            currentEpisode = 1;


            updateURL();


            loadEpisodes();

        };


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

        const response =
            await fetch(
                `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${encodeURIComponent(imdbID)}&Season=${currentSeason}`
            );


        const data =
            await response.json();


        episodesContainer.innerHTML =
            "";


        if (
            data.Response === "False" ||
            !data.Episodes
        ) {

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
            If someone opens an invalid
            episode number, use episode 1.
        */

        if (
            currentEpisode >
            data.Episodes.length
        ) {

            currentEpisode = 1;

        }


        currentEpisodeData =
            data.Episodes;


        data.Episodes.forEach(
            (episode, index) => {

                const episodeNumber =
                    index + 1;


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
                                episode.Title ||
                                "Episode " +
                                episodeNumber
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


    markPlayerLoaded();


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
            "simplestream:lastPlayed",
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
                href="/"
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


    return parts[1] || "watch";

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
