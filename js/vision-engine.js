(() => {
    const vision = document.querySelector("#vision.vision-section");

    if (!vision) {
        return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!reducedMotion.matches) {
        vision.classList.add("vision-pending");

        let started = false;
        const revealVision = () => {
            if (started) {
                return;
            }

            started = true;
            vision.classList.remove("vision-pending");
            vision.classList.add("vision-entered");
        };

        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    observer.disconnect();
                    revealVision();
                }
            }, { threshold: 0.15 });

            observer.observe(vision);
        } else {
            const checkVisibility = () => {
                const bounds = vision.getBoundingClientRect();

                if (bounds.top < window.innerHeight && bounds.bottom > 0) {
                    window.removeEventListener("scroll", checkVisibility);
                    window.removeEventListener("resize", checkVisibility);
                    revealVision();
                }
            };

            window.addEventListener("scroll", checkVisibility, { passive: true });
            window.addEventListener("resize", checkVisibility);
            checkVisibility();
        }
    }

    const stage = vision.querySelector(".vision-face-stage");
    const roboticFace = vision.querySelector(".jarvis-robotic-face");
    const humanReveal = vision.querySelector(".jarvis-human-reveal");
    const scanner = vision.querySelector(".jarvis-scanner-ring");

    if (!stage || !roboticFace || !humanReveal || !scanner) {
        return;
    }

    const keyboardPosition = { x: 50, y: 45 };
    const revealRadius = 90;

    function renderKeyboardScan() {
        const x = `${keyboardPosition.x}%`;
        const y = `${keyboardPosition.y}%`;

        humanReveal.style.clipPath = `circle(${revealRadius}px at ${x} ${y})`;
        roboticFace.style.setProperty("--scan-x", x);
        roboticFace.style.setProperty("--scan-y", y);
        roboticFace.style.setProperty("--scan-radius", `${revealRadius}px`);
        scanner.style.left = x;
        scanner.style.top = y;
    }

    function beginKeyboardScan() {
        humanReveal.classList.add("is-visible");
        roboticFace.classList.add("is-scanning");
        scanner.classList.add("is-active");
    }

    function closeKeyboardScan() {
        humanReveal.classList.remove("is-visible");
        roboticFace.classList.remove("is-scanning");
        scanner.classList.remove("is-active");
        humanReveal.style.removeProperty("clip-path");
        keyboardPosition.x = 50;
        keyboardPosition.y = 45;
        scanner.style.left = "50%";
        scanner.style.top = "50%";
    }

    stage.addEventListener("focus", () => {
        beginKeyboardScan();
        renderKeyboardScan();
    });

    stage.addEventListener("blur", closeKeyboardScan);

    stage.addEventListener("keydown", event => {
        const step = event.shiftKey ? 10 : 5;
        let handled = true;

        switch (event.key) {
            case "ArrowUp":
                beginKeyboardScan();
                keyboardPosition.y = Math.max(8, keyboardPosition.y - step);
                break;
            case "ArrowDown":
                beginKeyboardScan();
                keyboardPosition.y = Math.min(92, keyboardPosition.y + step);
                break;
            case "ArrowLeft":
                beginKeyboardScan();
                keyboardPosition.x = Math.max(8, keyboardPosition.x - step);
                break;
            case "ArrowRight":
                beginKeyboardScan();
                keyboardPosition.x = Math.min(92, keyboardPosition.x + step);
                break;
            case "Escape":
                stage.blur();
                break;
            default:
                handled = false;
        }

        if (handled) {
            event.preventDefault();
            renderKeyboardScan();
        }
    });
})();
