const TV_SELECTOR = [
    "a[href]",
    "button",
    "input",
    "select",
    ".movie-card",
    ".episode-btn",
    "[data-tv-focus='true']"
].join(",");

function getFocusableElements() {
    return [...document.querySelectorAll(TV_SELECTOR)].filter(el => {
        const style = window.getComputedStyle(el);

        return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            !el.disabled &&
            el.offsetWidth > 0 &&
            el.offsetHeight > 0
        );
    });
}

function makeFocusable() {
    getFocusableElements().forEach(el => {
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
            // The browser normally activates focused buttons/links itself.
            break;

        case "Escape":
        case "BrowserBack":
            event.preventDefault();

            if (window.history.length > 1) {
                window.history.back();
            }

            break;
    }
});

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
