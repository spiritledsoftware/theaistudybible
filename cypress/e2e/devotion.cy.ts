const DEVOTION_PATH = /^\/devotion\/[\w-]+$/;
const EMPTY_STATE_TEXT = 'Latest devotion not found';

describe('Devotion Pages', () => {
  // A fresh deployment has no published devotion until the daily job succeeds, so the
  // index page either redirects to the latest devotion or renders its empty state.
  let latestDevotionPath: string | null = null;

  before(() => {
    cy.visit('/devotion');
    cy.window()
      .should((win) => {
        const redirected = DEVOTION_PATH.test(win.location.pathname);
        const empty = win.document.body.innerText.includes(EMPTY_STATE_TEXT);
        expect(redirected || empty, 'devotion index settled').to.equal(true);
      })
      .then((win) => {
        latestDevotionPath = DEVOTION_PATH.test(win.location.pathname)
          ? win.location.pathname
          : null;
      });
  });

  it('redirects to the latest devotion or shows the empty state from the index page', () => {
    cy.visit('/devotion');
    if (latestDevotionPath) {
      cy.location('pathname').should('eq', latestDevotionPath);
    } else {
      cy.contains(EMPTY_STATE_TEXT).should('be.visible');
      cy.location('pathname').should('eq', '/devotion');
    }
  });

  it('displays the devotion content correctly', function () {
    if (!latestDevotionPath) {
      this.skip();
    }
    cy.visit(latestDevotionPath as string);
    cy.get('img[alt="Illustration for the devotion"]').scrollIntoView().should('be.visible');
    cy.get('h2').contains('Reading').scrollIntoView().should('be.visible');
    cy.get('h2').contains('Summary').scrollIntoView().should('be.visible');
    cy.get('h2').contains('Reflection').scrollIntoView().should('be.visible');
    cy.get('h2').contains('Prayer').scrollIntoView().should('be.visible');
  });

  it('opens and closes the devotion history sheet', () => {
    // The devotion page renders the history sheet whether or not the devotion exists, and
    // opens it on load.
    const sheet = '[data-slot="sidebar"][data-mobile="true"]';
    cy.visit(latestDevotionPath ?? '/devotion/non-existent-id');
    cy.get(sheet).should('be.visible').and('contain.text', 'Devotion History');
    cy.get('body').type('{esc}');
    cy.get(sheet).should('not.exist');
    cy.get('button[aria-label="View Devotions"]').should('be.enabled').click();
    cy.get(sheet).should('be.visible');
  });

  it('handles non-existent devotion gracefully', () => {
    cy.visit('/devotion/non-existent-id');
    cy.contains('Devotion not found').should('be.visible');
  });
});
