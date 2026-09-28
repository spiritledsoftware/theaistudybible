describe('Home Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('shows the signed-out landing page', () => {
    cy.get('h1').should('be.visible');
    cy.contains('a', 'Sign In').should('be.visible');
    cy.contains('a', 'Read Now').should('have.attr', 'href', '/bible');
    cy.contains('a', 'Try Pro Free').should('have.attr', 'href', '/pro');
  });

  it('redirects signed-in users to the Bible page', () => {
    cy.login(Cypress.env('TEST_USER_EMAIL'), Cypress.env('TEST_USER_PASSWORD'));
    cy.visit('/');
    cy.url().should('include', '/bible');
  });

  it('navigates to the Bible page from "Read Now"', () => {
    cy.contains('a', 'Read Now').click();
    cy.url().should('include', '/bible');
  });

  it('navigates to the Pro page from "Try Pro Free"', () => {
    cy.contains('a', 'Try Pro Free').click();
    cy.url().should('include', '/pro');
  });
});
