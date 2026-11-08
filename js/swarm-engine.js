(async () => {
    const mainContent = document.querySelector("#main-content");
    const welcomeSequence = document.querySelector("#welcome-sequence");

    if (!mainContent) {
        return;
    }

    const isPortfolioReady = () => getComputedStyle(mainContent).display !== "none" &&
        !welcomeSequence?.classList.contains("is-active");

    await new Promise(resolve => {
        if (isPortfolioReady()) {
            resolve();
            return;
        }

        const startupObserver = new MutationObserver(() => {
            if (isPortfolioReady()) {
                startupObserver.disconnect();
                resolve();
            }
        });
        startupObserver.observe(mainContent, {
            attributes: true,
            attributeFilter: ["class", "style"]
        });
        if (welcomeSequence) {
            startupObserver.observe(welcomeSequence, {
                attributes: true,
                attributeFilter: ["class"]
            });
        }
    });

    const hero = document.querySelector("#hero.hero-section");
    const content = hero?.querySelector(".hero-content");

    if (!hero || !content) {
        return;
    }

    const SVG_NS = "http://www.w3.org/2000/svg";
    const DURATION = 6.7;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const identityPanelMobile = window.matchMedia("(max-width: 767.98px)");
    const isMobile = window.matchMedia("(max-width: 700px), (pointer: coarse)").matches;
    const layer = document.createElementNS(SVG_NS, "svg");
    const framePaths = [];
    const cornerPaths = [];
    const cursors = [];
    let geometry;
    let startedAt = 0;
    let animationFrame = 0;
    let handoffTimer = 0;
    let handoffStyles = null;
    let pointerInteracted = false;
    let finished = false;
    let resizeObserver = null;

    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const point = (x, y) => ({ x, y });
    const easeCubic = value => 1 - Math.pow(1 - value, 3);
    const easeSmooth = value => value * value * (3 - 2 * value);
    const easeQuint = value => value < 0.5
        ? 16 * Math.pow(value, 5)
        : 1 - Math.pow(-2 * value + 2, 5) / 2;

    function svgElement(tag, attributes = {}) {
        const element = document.createElementNS(SVG_NS, tag);
        for (const [name, value] of Object.entries(attributes)) {
            element.setAttribute(name, String(value));
        }
        return element;
    }

    function createPath(className) {
        const path = svgElement("path", { class: className });
        layer.append(path);
        return path;
    }

    function addCursor(name, className, shape) {
        const group = svgElement("g", {
            class: `mex-swarm-cursor ${className}`,
            "data-cursor": name,
            "aria-hidden": "true"
        });
        shape(group);
        layer.append(group);
        cursors.push({ name, group, keyframes: [], easing: easeCubic });
        return cursors[cursors.length - 1];
    }

    const architect = addCursor("Architect", "cursor-architect", group => {
        group.append(
            svgElement("circle", { cx: 0, cy: 0, r: 8 }),
            svgElement("path", { d: "M-13 0H-5 M5 0H13 M0-13V-5 M0 5V13" }),
            svgElement("circle", { class: "cursor-fill", cx: 0, cy: 0, r: 1.7 })
        );
    });

    const railWelder = addCursor("Rail Welder", "cursor-rail-welder", group => {
        group.append(
            svgElement("polygon", { points: "0,-10 3,-3 10,0 3,3 0,10 -3,3 -10,0 -3,-3" }),
            svgElement("path", { d: "M0-15V-11 M15 0H11 M0 15V11 M-15 0H-11" })
        );
    });

    const sideFabricator = addCursor("Side Fabricator", "cursor-side-fabricator", group => {
        group.append(
            svgElement("polygon", { points: "0,-10 10,0 0,10 -10,0" }),
            svgElement("circle", { class: "cursor-fill", cx: 0, cy: 0, r: 2 })
        );
    });

    const cornerAssembler = addCursor("Corner Assembler", "cursor-corner-assembler", group => {
        group.append(
            svgElement("path", { d: "M-10 2V-10H2 M4-4L10-10 M-4 4L-10 10" }),
            svgElement("circle", { cx: 0, cy: 0, r: 2 })
        );
    });

    const identityCalibrator = addCursor(
        "Identity Calibrator",
        "cursor-identity-calibrator",
        group => {
            group.append(
                svgElement("circle", { cx: 0, cy: 0, r: 8 }),
                svgElement("circle", { cx: 0, cy: 0, r: 2 }),
                svgElement("path", { d: "M0-13V-10 M13 0H10 M0 13V10 M-13 0H-10" })
            );
        }
    );

    const topRail = createPath("mex-swarm-frame");
    const bottomRail = createPath("mex-swarm-frame");
    const leftRail = createPath("mex-swarm-side");
    const rightRail = createPath("mex-swarm-side");
    framePaths.push(topRail, bottomRail, leftRail, rightRail);

    for (let index = 0; index < 4; index += 1) {
        cornerPaths.push(createPath("mex-swarm-corner"));
    }

    const monogram = createPath("mex-swarm-monogram");
    const anchors = Array.from({ length: 4 }, () => {
        const anchor = svgElement("circle", { class: "mex-swarm-anchor", r: 2.2 });
        layer.append(anchor);
        return anchor;
    });

    layer.classList.add("mex-swarm-layer");
    layer.setAttribute("aria-hidden", "true");
    layer.setAttribute("focusable", "false");
    hero.append(layer);

    function updatePath(path, d) {
        path.setAttribute("d", d);
        const length = path.getTotalLength();
        path.dataset.length = String(length);
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
    }

    function frameCorners() {
        const { left, top, right, bottom } = geometry.frame;
        return [
            point(left, top),
            point(right, top),
            point(right, bottom),
            point(left, bottom)
        ];
    }

    function setKeyframes() {
        const { left, top, right, bottom } = geometry.frame;
        const { width, height } = geometry;
        const outside = isMobile ? 18 : 54;
        const middleX = (left + right) / 2;
        const monogramX = Math.max(left + 18, right - 104);
        const monogramY = top + 8;
        const monogramPoint = point(monogramX + 42, monogramY + 10);

        architect.easing = easeCubic;
        architect.keyframes = [
            { time: 0, ...point(left - outside, top - outside) },
            { time: 0.72, ...point(left, top) },
            { time: 1.42, ...point(right, top) },
            { time: 2.25, ...point(right, bottom) },
            { time: 3.15, ...point(left, bottom) },
            { time: 4.3, ...monogramPoint },
            { time: 5.05, ...point(right + outside / 2, top) }
        ];

        railWelder.easing = easeSmooth;
        railWelder.keyframes = [
            { time: 0.28, ...point(right + outside, top + 40) },
            { time: 1.42, ...point(left, top) },
            { time: 2.62, ...point(right, top) },
            { time: 2.78, ...point(right, bottom) },
            { time: 3.78, ...point(left, bottom) },
            { time: 4.52, ...point(left - outside / 2, bottom + 12) }
        ];

        sideFabricator.easing = easeQuint;
        sideFabricator.keyframes = [
            { time: 0.12, ...point(left - outside, bottom + 34) },
            { time: 1.68, ...point(left, top) },
            { time: 3.02, ...point(left, bottom) },
            { time: 3.24, ...point(right, bottom) },
            { time: 4.08, ...point(right, top) },
            { time: 4.62, ...point(right + outside, top - 8) }
        ];

        cornerAssembler.easing = easeCubic;
        cornerAssembler.keyframes = [
            { time: 0.44, ...point(right + outside, bottom + 20) },
            { time: 1.78, ...point(left, top) },
            { time: 2.48, ...point(right, top) },
            { time: 3.14, ...point(right, bottom) },
            { time: 3.82, ...point(left, bottom) },
            { time: 4.36, ...point(left - outside / 2, top - outside / 2) }
        ];

        identityCalibrator.easing = easeSmooth;
        identityCalibrator.keyframes = [
            { time: 0.58, ...point(middleX, bottom + outside) },
            { time: 3.88, ...point(monogramX - 12, monogramY + 10) },
            { time: 4.16, ...point(monogramX + 2, monogramY + 20) },
            { time: 4.88, ...point(monogramX + 84, monogramY + 20) },
            { time: 5.3, ...point(right + outside / 2, monogramY) }
        ];

        if (width < 380 || height < 520) {
            for (const cursor of cursors) {
                cursor.keyframes = cursor.keyframes.map(keyframe => ({
                    ...keyframe,
                    x: clamp(keyframe.x, -12, width + 12),
                    y: clamp(keyframe.y, -12, height + 12)
                }));
            }
        }
    }

    function measure() {
        const heroBounds = hero.getBoundingClientRect();
        const contentBounds = content.getBoundingClientRect();
        const width = heroBounds.width;
        const height = heroBounds.height;
        const padding = isMobile ? 12 : 20;

        geometry = {
            width,
            height,
            frame: {
                left: clamp(contentBounds.left - heroBounds.left - padding, 8, width - 8),
                top: clamp(contentBounds.top - heroBounds.top - padding, 8, height - 8),
                right: clamp(contentBounds.right - heroBounds.left + padding, 8, width - 8),
                bottom: clamp(contentBounds.bottom - heroBounds.top + padding, 8, height - 8)
            }
        };

        layer.setAttribute("viewBox", `0 0 ${width} ${height}`);
        const { left, top, right, bottom } = geometry.frame;
        const cornerSize = isMobile ? 10 : 13;

        updatePath(topRail, `M${left} ${top}H${right}`);
        updatePath(bottomRail, `M${right} ${bottom}H${left}`);
        updatePath(leftRail, `M${left} ${top}V${bottom}`);
        updatePath(rightRail, `M${right} ${bottom}V${top}`);
        updatePath(cornerPaths[0], `M${left + cornerSize} ${top}H${left}V${top + cornerSize}`);
        updatePath(cornerPaths[1], `M${right - cornerSize} ${top}H${right}V${top + cornerSize}`);
        updatePath(cornerPaths[2], `M${right} ${bottom - cornerSize}V${bottom}H${right - cornerSize}`);
        updatePath(cornerPaths[3], `M${left + cornerSize} ${bottom}H${left}V${bottom - cornerSize}`);

        const markX = Math.max(left + 18, right - 104);
        const markY = top + 8;
        const letterWidth = 22;
        const gap = 9;
        const heightMark = 20;
        const mexPath = [
            `M${markX} ${markY + heightMark}V${markY}L${markX + letterWidth / 2} ${markY + 10}L${markX + letterWidth} ${markY}V${markY + heightMark}`,
            `M${markX + letterWidth + gap} ${markY}H${markX + letterWidth * 2 + gap}M${markX + letterWidth + gap} ${markY}V${markY + heightMark}H${markX + letterWidth * 2 + gap}M${markX + letterWidth + gap} ${markY + 10}H${markX + letterWidth * 1.7 + gap}`,
            `M${markX + letterWidth * 2 + gap * 2} ${markY}L${markX + letterWidth * 3 + gap * 2} ${markY + heightMark}M${markX + letterWidth * 3 + gap * 2} ${markY}L${markX + letterWidth * 2 + gap * 2} ${markY + heightMark}`
        ].join(" ");
        updatePath(monogram, mexPath);

        frameCorners().forEach((corner, index) => {
            anchors[index].setAttribute("cx", String(corner.x));
            anchors[index].setAttribute("cy", String(corner.y));
        });
        setKeyframes();
    }

    function drawProgress(path, elapsed, start, end, easing = easeCubic) {
        const length = Number(path.dataset.length || 0);
        const progress = easing(clamp((elapsed - start) / (end - start)));
        path.style.strokeDashoffset = `${length * (1 - progress)}`;
    }

    function setCursorPositions(elapsed) {
        for (const cursor of cursors) {
            const frames = cursor.keyframes;
            let segment = 0;
            while (segment < frames.length - 2 && elapsed > frames[segment + 1].time) {
                segment += 1;
            }

            const from = frames[segment];
            const to = frames[segment + 1];
            const progress = cursor.easing(clamp((elapsed - from.time) / (to.time - from.time)));
            const x = from.x + (to.x - from.x) * progress;
            const y = from.y + (to.y - from.y) * progress;
            const fadeIn = clamp((elapsed - from.time) / 0.13);
            const fadeOut = clamp((frames[frames.length - 1].time - elapsed) / 0.28);
            cursor.group.setAttribute("transform", `translate(${x} ${y})`);
            cursor.group.style.opacity = String(Math.min(fadeIn, fadeOut));
        }
    }

    function animate(elapsed) {
        drawProgress(topRail, elapsed, 1.48, 2.65, easeSmooth);
        drawProgress(bottomRail, elapsed, 2.82, 3.82, easeCubic);
        drawProgress(leftRail, elapsed, 1.74, 3.08, easeQuint);
        drawProgress(rightRail, elapsed, 3.28, 4.12, easeCubic);

        cornerPaths.forEach((path, index) => {
            const start = 3.18 + index * 0.23;
            drawProgress(path, elapsed, start, start + 0.25, easeCubic);
        });
        drawProgress(monogram, elapsed, 4.12, 4.92, easeSmooth);

        const anchorProgress = clamp((elapsed - 0.72) / 0.12);
        anchors.forEach(anchor => {
            anchor.style.opacity = String(anchorProgress * (1 - clamp((elapsed - 4.4) / 0.3)));
        });

        setCursorPositions(elapsed);

        if (elapsed >= 4.92) {
            hero.classList.add("swarm-engine-title-visible");
        }
        if (elapsed >= 5.45) {
            showHandoff();
        }
    }

    function getSavedStyle(element, property) {
        return {
            element,
            property,
            value: element.style.getPropertyValue(property),
            priority: element.style.getPropertyPriority(property),
            assigned: property === "transform"
                ? "translateY(-50%) translateX(0)"
                : "1"
        };
    }

    function restoreHandoff() {
        if (!handoffStyles) {
            return;
        }

        window.clearTimeout(handoffTimer);
        for (const saved of handoffStyles) {
            if (saved.element.style.getPropertyValue(saved.property) !== saved.assigned) {
                continue;
            }
            if (saved.value) {
                saved.element.style.setProperty(saved.property, saved.value, saved.priority);
            } else {
                saved.element.style.removeProperty(saved.property);
            }
        }
        handoffStyles = null;
    }

    function handleIdentityPanelBreakpointChange(event) {
        if (event.matches) {
            restoreHandoff();
        }
    }

    function showHandoff() {
        if (identityPanelMobile.matches || handoffStyles || pointerInteracted) {
            return;
        }

        const scanner = hero.querySelector(".scanner-hud");
        const panel = hero.querySelector(".identity-panel");
        if (!scanner || !panel) {
            return;
        }

        handoffStyles = [
            getSavedStyle(scanner, "opacity"),
            getSavedStyle(panel, "opacity"),
            getSavedStyle(panel, "transform")
        ];
        scanner.style.setProperty("opacity", "1");
        panel.style.setProperty("opacity", "1");
        panel.style.setProperty("transform", "translateY(-50%) translateX(0)");
        handoffTimer = window.setTimeout(restoreHandoff, 900);
    }

    function markPointerInteraction(event) {
        if (event.type === "pointermove" && event.pointerType === "touch") {
            return;
        }
        if (hero.contains(event.target)) {
            pointerInteracted = true;
        }
        restoreHandoff();
    }

    function removeListeners() {
        document.removeEventListener("pointermove", markPointerInteraction, true);
        document.removeEventListener("mousemove", markPointerInteraction, true);
        window.removeEventListener("resize", markGeometryDirty);
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
        if (prefersReducedMotion.removeEventListener) {
            prefersReducedMotion.removeEventListener("change", handleMotionChange);
        } else if (prefersReducedMotion.removeListener) {
            prefersReducedMotion.removeListener(handleMotionChange);
        }
        if (identityPanelMobile.removeEventListener) {
            identityPanelMobile.removeEventListener("change", handleIdentityPanelBreakpointChange);
        } else if (identityPanelMobile.removeListener) {
            identityPanelMobile.removeListener(handleIdentityPanelBreakpointChange);
        }
    }

    function finish(completed) {
        if (finished) {
            return;
        }
        finished = true;
        if (animationFrame) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = 0;
        }
        restoreHandoff();
        removeListeners();
        if (completed) {
            for (const path of [...framePaths, ...cornerPaths, monogram]) {
                const length = Number(path.dataset.length || 0);
                path.style.strokeDashoffset = "0";
                path.style.strokeDasharray = `${length}`;
            }
            anchors.forEach(anchor => { anchor.style.opacity = "1"; });
            hero.classList.remove("swarm-engine-building");
            hero.classList.add("swarm-engine-title-visible", "swarm-engine-complete");
            for (const cursor of cursors) {
                cursor.group.remove();
            }
        }
    }

    function handleMotionChange(event) {
        if (event.matches) {
            finish(true);
            hero.classList.add("swarm-engine-static");
        }
    }

    function markGeometryDirty() {
        if (!finished) {
            measure();
        }
    }

    function tick(timestamp) {
        if (finished) {
            return;
        }
        const elapsed = (timestamp - startedAt) / 1000;
        animate(elapsed);

        if (elapsed >= DURATION) {
            finish(true);
            return;
        }
        animationFrame = window.requestAnimationFrame(tick);
    }

    measure();
    document.addEventListener("pointermove", markPointerInteraction, true);
    document.addEventListener("mousemove", markPointerInteraction, true);
    window.addEventListener("resize", markGeometryDirty, { passive: true });

    if (prefersReducedMotion.addEventListener) {
        prefersReducedMotion.addEventListener("change", handleMotionChange);
    } else if (prefersReducedMotion.addListener) {
        prefersReducedMotion.addListener(handleMotionChange);
    }
    if (identityPanelMobile.addEventListener) {
        identityPanelMobile.addEventListener("change", handleIdentityPanelBreakpointChange);
    } else if (identityPanelMobile.addListener) {
        identityPanelMobile.addListener(handleIdentityPanelBreakpointChange);
    }

    if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(markGeometryDirty);
        resizeObserver.observe(hero);
        resizeObserver.observe(content);
    }

    if (prefersReducedMotion.matches) {
        hero.classList.add("swarm-engine-static");
        finish(true);
        return;
    }

    hero.classList.add("swarm-engine-building");
    startedAt = performance.now();
    animationFrame = window.requestAnimationFrame(tick);
})();
