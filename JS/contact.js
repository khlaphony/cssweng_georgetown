document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const submitBtn = document.getElementById("btn-submit");
  if (!form) return;

  const submitText = submitBtn ? submitBtn.querySelector(".btn-text") : null;
  const MOBILE_REGEX = /^(\+63|0)\s?9\d{2}\s?\d{3}\s?\d{4}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const FIELDS = ["contactName", "companyName", "email", "mobileNumber", "message"];

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
    if (!EMAIL_REGEX.test(v.email) || v.email.length > 255) errors.email = "Please enter a valid email address.";
    if (!MOBILE_REGEX.test(v.mobileNumber)) {
      errors.mobileNumber = "Please enter a valid Philippine mobile number (e.g. +63 900 000 0000 or 0900 000 0000).";
    }
    if (!v.message) errors.message = "Please enter a message.";
    else if (v.message.length > 2000) errors.message = "Message must be 2000 characters or fewer.";
    return errors;
  };

  FIELDS.forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("input", () => setFieldError(id, ""));
  });

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

      showMessage("success", "Thank you! Your message has been sent. Our team will get back to you soon.");
      form.reset();
    } catch (error) {
      console.error("Unable to send contact submission:", error);
      showMessage("error", "Could not reach the server. Please check your connection and try again.");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitText) submitText.textContent = "Send message";
    }
  });
});