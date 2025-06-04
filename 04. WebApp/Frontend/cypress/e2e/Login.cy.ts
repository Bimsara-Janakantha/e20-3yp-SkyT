// Login Page Testing
describe("Login Page", () => {
  // Test 01: Should logs in a user successfully
  it("logs in a user successfully", () => {
    // Visit
    cy.visit("/login");

    cy.get("input[name=email]").type("john@example.com");
    cy.get("input[name=password]").type("abcd123");
    cy.get("button[type=submit]").click();

    cy.url().should("include", "/home");
    cy.contains("Welcome"); // or a dashboard element
  });
});
