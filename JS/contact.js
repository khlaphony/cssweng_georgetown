document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const requiredFields = ["contactName", "email", "mobileNumber", "message"];

  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const values = Object.fromEntries(new FormData(form).entries());
    const invalidFields = requiredFields.filter((id) => {
      const value = values[id].trim();
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
      id: Date.now(),
      contactName: values.contactName.trim(),
      companyName: values.companyName.trim(),
      email: values.email.trim(),
      mobileNumber: values.mobileNumber.trim(),
      message: values.message.trim(),
      submittedAt: new Date().toISOString()
    };

    try {
      const submissions = JSON.parse(
        localStorage.getItem("gesContactSubmissions") || "[]"
      );
      submissions.push(submission);
      localStorage.setItem("gesContactSubmissions", JSON.stringify(submissions));
      alert("Thank you! Your message has been saved in this browser.");
      form.reset();
    } catch (error) {
      console.error("Unable to save contact submission:", error);
      alert("Unable to save your message in this browser. Please try again.");
    }
  });
});
