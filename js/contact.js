/* =====================================================
   MEX — CONTACT COMMAND INTERFACE
   ===================================================== */

const contactOpenButton = document.getElementById("contact-open-modal");
const contactModal = document.getElementById("contact-modal");
const contactForm = document.getElementById("contact-form");

if (contactOpenButton && contactModal && contactForm) {

    const closeButtons = contactModal.querySelectorAll("[data-contact-close]");
    const firstField = document.getElementById("contact-name");
    const submitButton = contactForm.querySelector('button[type="submit"]');
    let previousFocusedElement = null;
    let isSending = false;

    function openContactModal() {
        previousFocusedElement = document.activeElement;
        contactModal.classList.add("is-open");
        contactModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("contact-modal-open");
        window.setTimeout(() => firstField.focus(), 220);
    }

    function closeContactModal() {
        contactModal.classList.remove("is-open");
        contactModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("contact-modal-open");

        if (previousFocusedElement) {
            previousFocusedElement.focus();
        }
    }

    function setFieldError(field, message) {
        const error = contactModal.querySelector(`[data-error-for="${field.id}"]`);
        field.classList.toggle("has-error", Boolean(message));
        field.setAttribute("aria-invalid", message ? "true" : "false");

        if (error) {
            error.textContent = message;
        }
    }

    function validateForm() {
        const name = document.getElementById("contact-name");
        const email = document.getElementById("contact-email");
        const message = document.getElementById("contact-message");
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let valid = true;

        if (!name.value.trim()) {
            setFieldError(name, "Name is required.");
            valid = false;
        } else {
            setFieldError(name, "");
        }

        if (!email.value.trim()) {
            setFieldError(email, "Email is required.");
            valid = false;
        } else if (!emailPattern.test(email.value.trim())) {
            setFieldError(email, "Enter a valid email address.");
            valid = false;
        } else {
            setFieldError(email, "");
        }

        if (!message.value.trim()) {
            setFieldError(message, "Message is required.");
            valid = false;
        } else {
            setFieldError(message, "");
        }

        return valid;
    }

    contactOpenButton.addEventListener("click", openContactModal);
    closeButtons.forEach((button) => button.addEventListener("click", closeContactModal));

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && contactModal.classList.contains("is-open")) {
            closeContactModal();
        }
    });

    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = contactModal.querySelector(".contact-form-status");

        if (isSending) {
            return;
        }

        if (!validateForm()) {
            status.textContent = "CHECK REQUIRED FIELDS.";
            return;
        }

        const name = document.getElementById("contact-name").value.trim();
        const email = document.getElementById("contact-email").value.trim();
        const message = document.getElementById("contact-message").value.trim();

        isSending = true;
        submitButton.disabled = true;
        status.textContent = "SENDING MESSAGE...";

        try {
            if (!window.emailjs) {
                throw new Error("EmailJS SDK failed to load.");
            }

            await window.emailjs.send(
                "service_k59r66n",
                "template_c6b9rdx",
                {
                    from_name: name,
                    from_email: email,
                    message
                },
                {
                    publicKey: "TrO3ieRBSCH0iW4Tw"
                }
            );

            status.textContent = "MESSAGE SENT SUCCESSFULLY.";
        } catch (error) {
            console.error("EmailJS contact form submission failed:", error);
            status.textContent = "MESSAGE COULD NOT BE SENT. PLEASE TRY AGAIN.";
        } finally {
            isSending = false;
            submitButton.disabled = false;
        }
    });

}