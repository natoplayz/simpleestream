const TV_SELECTOR = [
    "a[href]",
    "button",
    "input",
    "select",
    "iframe",
    ".movie-card",
    ".episode-button",
    "#suggestions > *",
    "[data-tv-focus='true']"
].join(",");

function getFocusableElements() {
    return [...document.querySelectorAll(TV_SELECTOR)].filter(el => {
        const style = window.getComputedStyle(el);

        // Ignore hidden elements
        if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            el.disabled ||
            el.offsetWidth <= 0 ||
            el.offsetHeight <= 0
        ) {
            return false;
        }

        // Ignore anything explicitly marked tabindex="-1"
        if (el.getAttribute("tabindex") === "-1") {
            return false;
        }

        // IMPORTANT:
        // Search controls must NOT be navigable unless search is open
        if (
            (el.id === "searchInput" || el.id === "closeSearch") &&
            !document.getElementById("searchPanel")?.classList.contains("open")
        ) {
            return false;
        }

        return true;
    });
}

function makeFocusable() {
    document.querySelectorAll(TV_SELECTOR).forEach(el => {

        // Never automatically enable the hidden search controls
        if (
            el.id === "searchInput" ||
            el.id === "closeSearch"
        ) {
            return;
        }

        if (!el.hasAttribute("tabindex")) {
            el.setAttribute("tabindex", "0");
        }
    });
}

function getCenter(element) {
    const rect = element.getBoundingClientRect();

    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function moveFocus(direction) {
    const elements = getFocusableElements();

    if (!elements.length) return;

    let current = document.activeElement;

    if (!elements.includes(current)) {
        elements[0].focus();
        return;
    }

    const currentCenter = getCenter(current);

    let bestElement = null;
    let bestScore = Infinity;

    elements.forEach(element => {
        if (element === current) return;

        const target = getCenter(element);

        const dx = target.x - currentCenter.x;
        const dy = target.y - currentCenter.y;

        let valid = false;

        switch (direction) {
            case "left":
                valid = dx < -10;
                break;

            case "right":
                valid = dx > 10;
                break;

            case "up":
                valid = dy < -10;
                break;

            case "down":
                valid = dy > 10;
                break;
        }

        if (!valid) return;

        const primary =
            direction === "left" || direction === "right"
                ? Math.abs(dx)
                : Math.abs(dy);

        const secondary =
            direction === "left" || direction === "right"
                ? Math.abs(dy)
                : Math.abs(dx);

        // Prefer things primarily in the requested direction.
        const score = primary + secondary * 3;

        if (score < bestScore) {
            bestScore = score;
            bestElement = element;
        }
    });

    if (bestElement) {
        bestElement.focus({
            preventScroll: true
        });

        bestElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        });
    }
}

document.addEventListener("keydown", event => {
    switch (event.key) {
        case "ArrowLeft":
            event.preventDefault();
            moveFocus("left");
            break;

        case "ArrowRight":
            event.preventDefault();
            moveFocus("right");
            break;

        case "ArrowUp":
            event.preventDefault();
            moveFocus("up");
            break;

        case "ArrowDown":
            event.preventDefault();
            moveFocus("down");
            break;

        case "Enter":
    const focused = document.activeElement;

    if (!focused) {
        break;
    }

    if (focused.tagName === "IFRAME") {
        event.preventDefault();
        focused.focus();
        break;
    }

    if (
        !["A", "BUTTON", "INPUT", "SELECT"].includes(
            focused.tagName
        )
    ) {
        event.preventDefault();
        focused.click();
    }

    break;
    }
});

// Search controls start disabled for TV navigation
const tvSearchInput = document.getElementById("searchInput");
const tvCloseSearch = document.getElementById("closeSearch");

if (tvSearchInput) {
    tvSearchInput.setAttribute("tabindex", "-1");
}

if (tvCloseSearch) {
    tvCloseSearch.setAttribute("tabindex", "-1");
}

makeFocusable();

const observer = new MutationObserver(() => {
    makeFocusable();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

document.addEventListener("focusin", (event) => {
    console.log("TV FOCUS:", event.target);
});
