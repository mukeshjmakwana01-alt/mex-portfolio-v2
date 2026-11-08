(() => {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactLayout = window.matchMedia("(max-width: 900px), (pointer: coarse)");
    const cursorColors = ["cyan", "amber", "purple", "green", "white"];
    const RUN_DURATION = 8200;
    const START_STAGGER = 110;
    let activeEffect = null;

    function svg(tag, attributes = {}) {
        const element = document.createElementNS(SVG_NS, tag);
        for (const [name, value] of Object.entries(attributes)) {
            element.setAttribute(name, String(value));
        }
        return element;
    }

    function makeCursor(role, color) {
        const group = svg("g", {
            class: `mex-construction-cursor mex-construction-cursor--${color}`,
            "data-construction-cursor": role,
            "aria-hidden": "true"
        });

        const shapes = {
            architect: [
                ["circle", { cx: 0, cy: 0, r: 9 }],
                ["path", { d: "M-15 0H-6 M6 0H15 M0-15V-6 M0 6V15" }],
                ["circle", { class: "mex-construction-cursor-fill", cx: 0, cy: 0, r: 2 }]
            ],
            "text-builder": [
                ["path", { d: "M-10-9H10 M0-9V9 M-8 9H8" }],
                ["path", { d: "M-14-13L-10-9 M14-13L10-9" }]
            ],
            "rail-welder": [
                ["polygon", { points: "0,-12 4,-4 12,0 4,4 0,12 -4,4 -12,0 -4,-4" }],
                ["path", { d: "M0-18V-13 M18 0H13 M0 18V13 M-18 0H-13" }]
            ],
            "data-scanner": [
                ["circle", { cx: 0, cy: 0, r: 8 }],
                ["path", { d: "M-14 0H14 M0-14V14" }],
                ["circle", { class: "mex-construction-cursor-fill", cx: 0, cy: 0, r: 2 }]
            ],
            calibrator: [
                ["path", { d: "M-10 7V-10H7 M-5-5L10-10 M-5 5L-10 10" }],
                ["circle", { cx: 0, cy: 0, r: 2.5 }]
            ]
        };

        shapes[role].forEach(([tag, attributes]) => group.append(svg(tag, attributes)));
        return group;
    }

    const contact = {
        section: document.querySelector("#contact"),
        name: "contact",
        targets: [
            { selector: ".contact-copy h2", role: "architect", incoming: "top-left" },
            { selector: ".contact-terminal", role: "text-builder", incoming: "top-right" },
            { selector: ".contact-social-links", mobileSelector: ".terminal-data", role: "rail-welder", incoming: "bottom-right" },
            { selector: ".contact-command-btn", role: "data-scanner", incoming: "bottom-left" },
            { sectionFrame: true, role: "calibrator", incoming: "top-center" }
        ]
    };

    const footer = {
        section: document.querySelector(".mex-footer"),
        name: "footer",
        targets: [
            { sectionFrame: true, role: "architect", incoming: "top-left" },
            { selector: ".mex-footer-logo", mobileSelector: ".mex-footer-tagline", role: "text-builder", incoming: "top-right", mobileIncoming: "bottom-right" },
            { selector: ".mex-footer-top > .mex-footer-column:nth-of-type(2)", role: "rail-welder", incoming: "bottom-right" },
            { selector: ".mex-footer-divider", role: "data-scanner", incoming: "bottom-left" },
            { selector: ".mex-footer-bottom", role: "calibrator", incoming: "top-center" }
        ]
    };

    const effects = [contact, footer].filter(effect => effect.section);

    function createEffect(effect) {
        effect.section.dataset.mexConstructionState = "waiting";
        effect.frameId = 0;
        effect.observer = null;
        effect.resizeHandler = null;
        effect.startedAt = 0;
        effect.overlay = null;
        effect.cursorGroups = [];
        effect.lastProgress = 0;
    }

    function targetRect(effect, target) {
        const sectionRect = effect.section.getBoundingClientRect();
        if (target.sectionFrame) {
            const insetX = Math.min(24, sectionRect.width / 16);
            const insetY = compactLayout.matches && effect.name === "footer"
                ? Math.min(100, sectionRect.height / 5)
                : insetX;
            return {
                x: insetX,
                y: insetY,
                width: Math.max(1, sectionRect.width - insetX * 2),
                height: Math.max(1, sectionRect.height - insetY * 2)
            };
        }

        const element = effect.section.querySelector(target.selector);
        if (!element) {
            return null;
        }
        target.element = element;

        const selector = compactLayout.matches && target.mobileSelector
            ? target.mobileSelector
            : target.selector;
        const targetElement = selector === target.selector
            ? element
            : effect.section.querySelector(selector);
        const targetRect = targetElement.getBoundingClientRect();
        target.element = targetElement;
        const inset = compactLayout.matches ? 2 : 7;
        const left = Math.max(22, targetRect.left - sectionRect.left - inset);
        const top = Math.max(22, targetRect.top - sectionRect.top - inset);
        const right = Math.min(sectionRect.width - 22, targetRect.right - sectionRect.left + inset);
        const bottom = Math.min(sectionRect.height - 22, targetRect.bottom - sectionRect.top + inset);
        return {
            x: left,
            y: top,
            width: Math.max(1, right - left),
            height: Math.max(1, bottom - top)
        };
    }

    function pointsForRoute(rect, incoming, sectionWidth, sectionHeight) {
        const corners = [
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            { x: rect.x, y: rect.y + rect.height }
        ];
        const routes = {
            "top-left": { start: { x: rect.x - 42, y: rect.y - 36 }, index: 0 },
            "top-right": { start: { x: rect.x + rect.width + 42, y: rect.y - 36 }, index: 1 },
            "bottom-right": { start: { x: rect.x + rect.width + 42, y: rect.y + rect.height + 36 }, index: 2 },
            "bottom-left": { start: { x: rect.x - 42, y: rect.y + rect.height + 36 }, index: 3 },
            "top-center": { start: { x: rect.x + rect.width / 2, y: rect.y - 48 }, index: 0 }
        };
        const { start, index } = routes[incoming];
        start.x = Math.max(19, Math.min(sectionWidth - 19, start.x));
        start.y = Math.max(19, Math.min(sectionHeight - 19, start.y));
        const perimeter = Array.from({ length: 5 }, (_, step) => corners[(index + step) % 4]);
        return [start, ...perimeter];
    }

    function pathData(points) {
        return points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ");
    }

    function createOverlay(effect) {
        const rect = effect.section.getBoundingClientRect();
        const overlay = svg("svg", {
            class: `mex-construction-layer mex-construction-layer--${effect.name}`,
            "aria-hidden": "true",
            focusable: "false",
            preserveAspectRatio: "none",
            viewBox: `0 0 ${rect.width} ${rect.height}`
        });
        effect.section.append(overlay);
        effect.overlay = overlay;
        effect.targets.forEach(target => {
            target.glowPath = svg("path", { class: "mex-construction-trail-glow" });
            target.trailPath = svg("path", { class: "mex-construction-trail" });
            target.framePath = svg("path", {
                class: `mex-construction-frame mex-construction-frame--${cursorColors[effect.targets.indexOf(target)]}`
            });
            target.cursor = makeCursor(target.role, cursorColors[effect.targets.indexOf(target)]);
            overlay.append(target.glowPath, target.trailPath, target.framePath, target.cursor);
            effect.cursorGroups.push(target.cursor);
        });
        effect.resizeHandler = () => {
            if (effect.section.dataset.mexConstructionState === "running") {
                updateGeometry(effect);
                render(effect, effect.lastProgress);
            }
        };
        window.addEventListener("resize", effect.resizeHandler, { passive: true });
        updateGeometry(effect);
    }

    function updateGeometry(effect) {
        const sectionRect = effect.section.getBoundingClientRect();
        effect.overlay.setAttribute("viewBox", `0 0 ${sectionRect.width} ${sectionRect.height}`);
        effect.targets.forEach(target => {
            const rect = targetRect(effect, target);
            target.rect = rect;
            if (!rect) {
                target.length = 0;
                return;
            }
            const incoming = compactLayout.matches && target.mobileIncoming
                ? target.mobileIncoming
                : target.incoming;
            const points = pointsForRoute(rect, incoming, sectionRect.width, sectionRect.height);
            const data = pathData(points);
            target.glowPath.setAttribute("d", data);
            target.trailPath.setAttribute("d", data);
            target.framePath.setAttribute("d", data);
            target.length = target.trailPath.getTotalLength();
            [target.glowPath, target.trailPath, target.framePath].forEach(path => {
                path.style.strokeDasharray = String(target.length);
                path.style.strokeDashoffset = String(target.length);
            });
        });
    }

    function clamp(value) {
        return Math.max(0, Math.min(1, value));
    }

    function ease(value) {
        return value * value * (3 - 2 * value);
    }

    function render(effect, progress) {
        effect.lastProgress = progress;
        effect.targets.forEach((target, index) => {
            if (!target.rect || !target.length) {
                target.cursor.setAttribute("opacity", "0");
                return;
            }
            const start = index * START_STAGGER;
            const localProgress = clamp((progress * (RUN_DURATION + START_STAGGER * (effect.targets.length - 1)) - start) / RUN_DURATION);
            const easedProgress = ease(localProgress);
            const remaining = target.length * (1 - easedProgress);

            target.glowPath.style.strokeDashoffset = String(remaining);
            target.trailPath.style.strokeDashoffset = String(remaining);
            target.framePath.style.strokeDashoffset = String(remaining);
            if (localProgress >= 1) {
                target.cursor.style.opacity = "0";
                return;
            }

            const point = target.trailPath.getPointAtLength(target.length * easedProgress);
            target.cursor.setAttribute("transform", `translate(${point.x} ${point.y})`);
            target.cursor.style.opacity = localProgress > 0 ? "1" : "0";
        });
    }

    function finish(effect) {
        if (effect.section.dataset.mexConstructionState === "complete") {
            return;
        }
        effect.observer?.disconnect();
        effect.observer = null;
        if (effect.frameId) {
            window.cancelAnimationFrame(effect.frameId);
            effect.frameId = 0;
        }
        if (effect.resizeHandler) {
            window.removeEventListener("resize", effect.resizeHandler);
            effect.resizeHandler = null;
        }
        effect.overlay?.remove();
        effect.overlay = null;
        effect.section.dataset.mexConstructionState = "complete";
        if (activeEffect === effect) {
            activeEffect = null;
            effects.forEach(pending => {
                if (pending.visible && pending.section.dataset.mexConstructionState === "waiting") {
                    start(pending);
                }
            });
        }
    }

    function finishStatic(effect) {
        finish(effect);
    }

    function tick(effect, timestamp) {
        effect.frameId = 0;
        if (reducedMotion.matches) {
            finishStatic(effect);
            return;
        }
        const elapsed = timestamp - effect.startedAt;
        const duration = RUN_DURATION + START_STAGGER * (effect.targets.length - 1);
        const progress = clamp(elapsed / duration);
        render(effect, progress);
        if (progress >= 1) {
            finish(effect);
            return;
        }
        effect.frameId = window.requestAnimationFrame(next => tick(effect, next));
    }

    function start(effect) {
        if (effect.section.dataset.mexConstructionState !== "waiting" || (activeEffect && activeEffect !== effect)) {
            return;
        }
        activeEffect = effect;
        effect.observer?.disconnect();
        effect.observer = null;
        effect.section.dataset.mexConstructionState = "running";
        if (reducedMotion.matches) {
            finishStatic(effect);
            return;
        }
        createOverlay(effect);
        effect.startedAt = performance.now();
        render(effect, 0);
        effect.frameId = window.requestAnimationFrame(timestamp => tick(effect, timestamp));
    }

    function observe(effect) {
        createEffect(effect);
        effect.visible = false;
        if (!("IntersectionObserver" in window)) {
            finishStatic(effect);
            return;
        }
        effect.observer = new IntersectionObserver(entries => {
            effect.visible = entries.some(entry => entry.isIntersecting);
            if (effect.visible) start(effect);
        }, { threshold: 0.12 });
        effect.observer.observe(effect.section);
    }

    effects.forEach(observe);

    window.addEventListener("pagehide", () => {
        effects.forEach(effect => {
            effect.visible = false;
            effect.observer?.disconnect();
            effect.observer = null;
            if (effect.frameId) {
                window.cancelAnimationFrame(effect.frameId);
                effect.frameId = 0;
            }
            if (effect.resizeHandler) {
                window.removeEventListener("resize", effect.resizeHandler);
                effect.resizeHandler = null;
            }
            if (effect.section.dataset.mexConstructionState === "running") {
                finish(effect);
            }
        });
    });

    window.addEventListener("pageshow", event => {
        if (!event.persisted) return;
        effects.forEach(effect => {
            if (effect.section.dataset.mexConstructionState === "waiting" && !effect.observer) {
                observe(effect);
            }
        });
    });
})();
