/* =========================================================
   MEX WELCOME SEQUENCE
   Slow Digital Letter Draw
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const enterButton = document.getElementById("enter-btn");

    const welcomeSequence =
        document.getElementById("welcome-sequence");

    const welcomeMessage =
        document.getElementById("welcome-message");

    const mainContent =
        document.getElementById("main-content");

    const hello =
        document.querySelector(".welcome-hello");


    // Safety check
    if (
        !enterButton ||
        !welcomeSequence ||
        !welcomeMessage ||
        !mainContent ||
        !hello
    ) {
        return;
    }


    let hasStarted = false;


    /* =====================================================
       DRAW HELLO — ONE LETTER AT A TIME
       ===================================================== */

    function drawHello() {

        const text = "HELLO";

        hello.textContent = "";

        hello.style.opacity = "1";
        hello.style.transform = "none";

        let index = 0;

        function drawNextLetter() {

            if (index < text.length) {

                hello.textContent +=
                    text.charAt(index);

                index++;

                // Slow cinematic drawing
                setTimeout(
                    drawNextLetter,
                    600
                );

            }

        }

        drawNextLetter();
    }


    /* =====================================================
       TYPE WELCOME MESSAGE
       ===================================================== */

    function typeMessage() {

        const message =
            "HELLO, WELCOME TO MY PORTFOLIO.";

        welcomeMessage.textContent = "";

        let index = 0;

        const typingSpeed = 70;


        function typeNextCharacter() {

            if (index < message.length) {

                welcomeMessage.textContent +=
                    message.charAt(index);

                index++;

                setTimeout(
                    typeNextCharacter,
                    typingSpeed
                );

            }

        }

        typeNextCharacter();
    }


    /* =====================================================
       START WELCOME SEQUENCE
       ===================================================== */

    function startWelcomeSequence() {

        // Prevent double click
        if (hasStarted) {
            return;
        }

        hasStarted = true;


        // Show welcome screen
        welcomeSequence.classList.add(
            "is-active"
        );

        welcomeSequence.setAttribute(
            "aria-hidden",
            "false"
        );


        // Lock scrolling
        document.body.style.overflow = "hidden";


        // Draw HELLO first
        drawHello();


        // Start welcome message after HELLO
        setTimeout(() => {

            typeMessage();

        }, 1800);


        /* ================================================
           EXIT WELCOME SCREEN
           ================================================ */

        setTimeout(() => {

            welcomeSequence.classList.remove(
                "is-active"
            );

            welcomeSequence.setAttribute(
                "aria-hidden",
                "true"
            );


            // Restore scrolling
            document.body.style.overflow = "";


            // Activate main portfolio
            setTimeout(() => {

                mainContent.classList.add(
                    "system-active"
                );

            }, 500);


        }, 6500);

    }


    /* =====================================================
       ENTER BUTTON
       ===================================================== */

    enterButton.addEventListener(
        "click",
        startWelcomeSequence
    );

});