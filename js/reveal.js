/* =====================================================
   MEX — CURSOR FACE REVEAL
   ===================================================== */

const hero = document.querySelector(".hero-section");
const face = document.querySelector(".face-reveal-image");
const statusText = document.querySelector(".reveal-status");

if (hero && face) {

    hero.addEventListener("mousemove", (e) => {

        const faceBox = face.getBoundingClientRect();

        // Cursor position relative to image
        const x = e.clientX - faceBox.left;
        const y = e.clientY - faceBox.top;

        // Reveal size
        const radius = 120;

        // Move reveal circle
        face.style.clipPath =
            `circle(${radius}px at ${x}px ${y}px)`;

        // Make revealed image visible
        face.style.opacity = "1";

        // Status text
        if (statusText) {
            statusText.textContent = "SCANNING...";
        }

    });


    hero.addEventListener("mouseleave", () => {

        // Hide revealed face
        face.style.opacity = "0";

        // Reset circle
        face.style.clipPath =
            "circle(0px at 50% 50%)";

        // Reset text
        if (statusText) {
            statusText.textContent =
                "MOVE CURSOR TO DISCOVER";
        }

    });

}

/* =====================================================
   MEX — SCANNER CURSOR
   ===================================================== */

const scanner = document.querySelector(".scanner-hud");

if (hero && scanner) {

    hero.addEventListener("mousemove", (e) => {

        scanner.style.left = `${e.clientX}px`;
        scanner.style.top = `${e.clientY}px`;

        scanner.style.opacity = "1";

    });

    hero.addEventListener("mouseleave", () => {

        scanner.style.opacity = "0";

    });

}

/* =====================================================
   MEX — INTELLIGENT SCAN
   ===================================================== */

if (hero && scanner) {

    hero.addEventListener("mousemove", (e) => {

        const faceBox = document.querySelector(".face-reveal").getBoundingClientRect();

        const faceCenterX = faceBox.left + faceBox.width / 2;
        const faceCenterY = faceBox.top + faceBox.height / 2;

        const distance = Math.sqrt(
            Math.pow(e.clientX - faceCenterX, 2) +
            Math.pow(e.clientY - faceCenterY, 2)
        );

        if (distance < 250) {

            scanner.classList.add("active");

            if (statusText) {
                statusText.textContent = "IDENTITY DETECTED";
            }

        } else {

            scanner.classList.remove("active");

            if (statusText) {
                statusText.textContent = "SCANNING...";
            }

        }

    });

}

/* =====================================================
   MEX — IDENTITY PANEL
   ===================================================== */

const identityPanel = document.querySelector(".identity-panel");

if (hero && identityPanel) {
    const identityPanelMobile = window.matchMedia("(max-width: 767.98px)");

    function resetIdentityPanel() {
        identityPanel.style.opacity = "0";
        identityPanel.style.transform = "translateY(-50%) translateX(30px)";
    }

    function handleIdentityPanelBreakpointChange(event) {
        if (event.matches) {
            resetIdentityPanel();
        }
    }

    if (identityPanelMobile.addEventListener) {
        identityPanelMobile.addEventListener("change", handleIdentityPanelBreakpointChange);
    } else if (identityPanelMobile.addListener) {
        identityPanelMobile.addListener(handleIdentityPanelBreakpointChange);
    }

    hero.addEventListener("mousemove", (e) => {
        if (identityPanelMobile.matches) {
            resetIdentityPanel();
            return;
        }

        const faceBox = document.querySelector(".face-reveal").getBoundingClientRect();

        const faceCenterX = faceBox.left + faceBox.width / 2;
        const faceCenterY = faceBox.top + faceBox.height / 2;

        const distance = Math.sqrt(
            Math.pow(e.clientX - faceCenterX, 2) +
            Math.pow(e.clientY - faceCenterY, 2)
        );

        if (distance < 250) {

            identityPanel.style.opacity = "1";
            identityPanel.style.transform =
                "translateY(-50%) translateX(0)";

        } else {

            identityPanel.style.opacity = "0";
            identityPanel.style.transform =
                "translateY(-50%) translateX(30px)";

        }

    });

    hero.addEventListener("mouseleave", () => {

        identityPanel.style.opacity = "0";

    });

}

/* =====================================================
   MEX — FACE ANALYSIS HUD
   ===================================================== */

const faceBrackets = document.querySelector(".face-brackets");
const scanData = document.querySelector(".scan-data");

if (hero && faceBrackets && scanData) {

    hero.addEventListener("mousemove", (e) => {

        const faceBox =
            document.querySelector(".face-reveal").getBoundingClientRect();

        const centerX = faceBox.left + faceBox.width / 2;
        const centerY = faceBox.top + faceBox.height / 2;

        const distance = Math.sqrt(
            Math.pow(e.clientX - centerX, 2) +
            Math.pow(e.clientY - centerY, 2)
        );

        if (distance < 250) {

            faceBrackets.style.opacity = "1";
            scanData.style.opacity = "1";

        } else {

            faceBrackets.style.opacity = "0";
            scanData.style.opacity = "0";

        }

    });

    hero.addEventListener("mouseleave", () => {

        faceBrackets.style.opacity = "0";
        scanData.style.opacity = "0";

    });

}

/* =====================================================
   MEX — JARVIS WHY FACE SCAN
   ===================================================== */

const jarvisStage = document.querySelector(".vision-face-stage");
const roboticFace = document.querySelector(".jarvis-robotic-face");
const humanReveal = document.querySelector(".jarvis-human-reveal");
const jarvisScanner = document.querySelector(".jarvis-scanner-ring");

if (jarvisStage && roboticFace && humanReveal && jarvisScanner) {

    const prefersTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const revealRadius = 90;
    const target = { x: 50, y: 50 };
    const current = { x: 50, y: 50 };
    let scanning = false;
    let framePending = false;

    function renderJarvisScan() {
        const distance = Math.hypot(target.x - current.x, target.y - current.y);
        const easing = distance > 20 ? 0.22 : 0.12;

        current.x += (target.x - current.x) * easing;
        current.y += (target.y - current.y) * easing;

        const x = `${current.x}%`;
        const y = `${current.y}%`;
        const radius = `${revealRadius}px`;

        humanReveal.style.clipPath = `circle(${radius} at ${x} ${y})`;
        roboticFace.style.setProperty("--scan-x", x);
        roboticFace.style.setProperty("--scan-y", y);
        roboticFace.style.setProperty("--scan-radius", radius);
        jarvisScanner.style.left = x;
        jarvisScanner.style.top = y;

        framePending = false;

        if (scanning && distance > 0.2) {
            window.requestAnimationFrame(renderJarvisScan);
        }
    }

    function queueJarvisScan(event) {
        const stageBox = jarvisStage.getBoundingClientRect();
        target.x = ((event.clientX - stageBox.left) / stageBox.width) * 100;
        target.y = ((event.clientY - stageBox.top) / stageBox.height) * 100;

        if (!framePending) {
            framePending = true;
            window.requestAnimationFrame(renderJarvisScan);
        }
    }

    function beginJarvisScan(event) {
        if (prefersTouch) {
            return;
        }

        scanning = true;
        humanReveal.classList.add("is-visible");
        roboticFace.classList.add("is-scanning");
        jarvisScanner.classList.add("is-active");
        queueJarvisScan(event);
    }

    function endJarvisScan() {
        if (prefersTouch) {
            return;
        }

        scanning = false;
        humanReveal.classList.remove("is-visible");
        roboticFace.classList.remove("is-scanning");
        jarvisScanner.classList.remove("is-active");
        target.x = 50;
        target.y = 50;
        queueJarvisScan({
            clientX: jarvisStage.getBoundingClientRect().left + jarvisStage.clientWidth / 2,
            clientY: jarvisStage.getBoundingClientRect().top + jarvisStage.clientHeight / 2
        });
    }

    jarvisStage.addEventListener("pointerenter", beginJarvisScan);
    jarvisStage.addEventListener("pointermove", queueJarvisScan);
    jarvisStage.addEventListener("pointerleave", endJarvisScan);
}