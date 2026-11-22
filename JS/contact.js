document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const submitBtn = document.getElementById("btn-submit");
  if (!form) return;

  const submitText = submitBtn ? submitBtn.querySelector(".btn-text") : null;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Phone: mobile or landline, e.g. 0917 123 4567, +63 917 123 4567, (02) 8123 4567
  const phoneOk = (v) => /^\+?[\d\s()-]+$/.test(v) && /^\d{7,13}$/.test(v.replace(/\D/g, ""));
  const TOPICS = ["quotation", "services", "products", "careers", "other"];
  const FIELDS = ["contactName", "companyName", "email", "mobileNumber", "topic", "message"];

  /* ---------- inline messages ---------- */

  const showMessage = (type, text) => {
    let box = document.getElementById("formMessage");
    if (!box) {
      box = document.createElement("div");
      box.id = "formMessage";
      box.setAttribute("role", "alert");
      form.prepend(box);
    }
    box.className = `form-message ${type}`;
    box.textContent = text;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const setFieldError = (id, text) => {
    const input = document.getElementById(id);
    const el = document.getElementById(`${id}-error`);
    if (input) input.classList.toggle("error", Boolean(text));
    if (el) {
      if (text) el.textContent = text;
      el.classList.toggle("visible", Boolean(text));
    }
  };

  const clearErrors = () => {
    FIELDS.forEach((id) => setFieldError(id, ""));
    const box = document.getElementById("formMessage");
    if (box) box.remove();
  };

  const validate = (v) => {
    const errors = {};
    if (!v.contactName) errors.contactName = "Please enter your name.";
    else if (v.contactName.length > 150) errors.contactName = "Name must be 150 characters or fewer.";

    if (v.companyName.length > 150) errors.companyName = "Company name must be 150 characters or fewer.";

    if (!v.email && !v.mobileNumber) {
      errors.email = "Please enter an email address or a phone number so our team can get back to you.";
    } else {
      if (v.email && (!EMAIL_REGEX.test(v.email) || v.email.length > 255)) {
        errors.email = "Please enter a valid email address.";
      }
      if (v.mobileNumber && !phoneOk(v.mobileNumber)) {
        errors.mobileNumber = "Please enter a valid phone number.";
      }
    }

    if (!TOPICS.includes(v.topic)) errors.topic = "Please choose a topic.";

    if (!v.message) errors.message = "Please enter a message.";
    else if (v.message.length > 2000) errors.message = "Message must be 2000 characters or fewer.";
    return errors;
  };

  FIELDS.forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    const evt = input.tagName === "SELECT" ? "change" : "input";
    input.addEventListener(evt, () => {
      setFieldError(id, "");
      // typing in either contact field clears the "at least one" error on the other
      if (id === "email" || id === "mobileNumber") {
        setFieldError(id === "email" ? "mobileNumber" : "email", "");
      }
    });
  });

  /* -------- popup alert (confirmation) ---------- */

  const modal = document.getElementById("sent-modal");
  const modalText = document.getElementById("sent-text");
  const modalClose = document.getElementById("sent-close");

  const replyChannel = (email, phone) => {
    if (email && phone) return `email (${email}) or phone number (${phone})`;
    if (email) return `email (${email})`;
    return `phone number (${phone})`;
  };

  const openModal = (name, email, phone) => {
    const firstName = name.split(/\s+/)[0];
    modalText.textContent =
      `Thank you, ${firstName}! We've received your message. ` +
      `Our team will reply to you through your provided ${replyChannel(email, phone)}.`;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    modalClose.focus();
  };

  const closeModal = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (submitBtn) submitBtn.focus();
  };

  if (modal) {
    modalClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }

  /* ---------- submit ---------- */

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();

    const data = new FormData(form);
    const submission = {};
    FIELDS.forEach((id) => { submission[id] = (data.get(id) || "").trim(); });

    const errors = validate(submission);
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([id, text]) => setFieldError(id, text));
      showMessage("error", "Please fix the fields marked below.");
      document.getElementById(Object.keys(errors)[0]).focus();
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.textContent = "Sending...";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        Object.entries(result.errors || {}).forEach(([id, text]) => setFieldError(id, text));
        showMessage("error", result.error || "Something went wrong. Please try again.");
        return;
      }

      form.reset();
      openModal(submission.contactName, submission.email, submission.mobileNumber);
    } catch (error) {
      console.error("Unable to send contact submission:", error);
      showMessage("error", "Could not reach the server. Please check your connection and try again.");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitText) submitText.textContent = "Send message";
    }
  });
});