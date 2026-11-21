document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const submitBtn = document.getElementById("btn-submit");
  const requiredFields = ["contactName", "email", "mobileNumber", "message"];

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const values = Object.fromEntries(new FormData(form).entries());
    const invalidFields = requiredFields.filter((id) => {
      const value = (values[id] || "").trim();
      return id === "email"
        ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        : value.length === 0;
    });

    if (invalidFields.length) {
      alert("Please complete all required fields with a valid email address.");
      document.getElementById(invalidFields[0]).focus();
      return;
    }

    const submission = {
      contactName: values.contactName.trim(),
      companyName: (values.companyName || "").trim(),
      email: values.email.trim(),
      mobileNumber: values.mobileNumber.trim(),
      message: values.message.trim(),
    };

    // Prevent double submissions while the request is in flight
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Something went wrong.");
      }

      alert("Thank you! Your message has been sent.");
      form.reset();
    } catch (error) {
      console.error("Unable to send contact submission:", error);
      alert(error.message || "Unable to send your message. Please try again.");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});