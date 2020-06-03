import puppeteer, { Page, Browser } from 'puppeteer'
import { expect, use, Assertion } from 'chai';
import { utils } from 'mocha';

// TODO: Change tests to use new method
use(function (_chai) {
  _chai.Assertion.addMethod('disposed', function (bool) {
    new Assertion(this._obj).to.have.property('_disposed', bool)
  })
})

declare global {
  export namespace Chai {
      interface Assertion {
          disposed(bool: Boolean): Promise<void>;
      }
  }
}

let browser: Browser;
let page: Page;

describe("Hi Inbox - Automation", () => {
  before(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000)
    page.setDefaultTimeout(30000)
    page.setViewport({ 
      width: 1280,
      height: 768
    });
  });

  after(async () => {
    browser.close();
  });

  beforeEach(async () => {
    await page.waitFor(1000)

    const awaitNav = page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.goto('https://app.hiplatform.com/agent/ticket/');
    await awaitNav
  }); 

  it('should show an error if "Login" is clicked with empty fields', async () => {
    await page.click('button[type="submit"]')

    const userError = await page.waitForXPath('//p[contains(.,"Precisa informar seu usuário")]')
    const passwordError = await page.waitForXPath('//p[contains(.,"Precisa informar seu usuário")]')

    expect(userError).to.have.property('_disposed', false)
    expect(passwordError).to.have.property('_disposed', false)
  });

  it('should login', async () => {
    await page.type('[name="UserLogin"]', 'mdtalan')
    await page.type('[name="Password"]', 'abc001')
    await page.click('button[type="submit"]')
    const orderByMenu = await page.waitFor('[aria-controls="page-menu"]')

    expect(orderByMenu).to.have.disposed(false)
  });

  it('should switch theme when clicking theme button on header', async () => {
    await page.click('#darkmode-switch');
    const response = await (await page.waitForResponse(response => response.url().includes('/user/darkmode'))).ok()
    expect(response).to.be.true
  });

  it('should collapse left sidebar when clicking "Menu principal" on header', async () => {
    await page.click('button[aria-label="menu-sidebar"][title="Menu principal"]');

    const newTckBtn = await page.waitFor('button[data-id="btn_new_ticket_left"].sidebarClose')
    expect(newTckBtn).to.have.property('_disposed', false)  
  });

  it('should expand left sidebar when clicking "Menu principal" and collapsed', async () => {
    const menuButton = await page.$('button[aria-label="menu-sidebar"][title="Menu principal"]'); 
    await menuButton.click();
    const newTckBtnCollapsed = await page.waitFor('button[data-id="btn_new_ticket_left"].sidebarClose')
    expect(newTckBtnCollapsed).to.have.property('_disposed', false)  

    await menuButton.click()
    const newTckBtnExpanded = await page.waitFor('button[data-id="btn_new_ticket_left"]:not(.sidebarClose)');    
    expect(newTckBtnExpanded).to.have.property('_disposed', false)  
  });

  it('should redirect to "Caixa de entrada" when clicking on Hi Logo on header', async () => {
    await (await page.$('a[role="button"][href="/agent/ticket/inbox"]')).click();
    const inboxPage = await page.waitForXPath('//li[@aria-controls="page-menu"]')
    expect(inboxPage).to.have.property('_disposed', false)
    expect(await page.title()).to.be.eqls('Caixa de entrada - Inbox')
  });

  it('should create a ticket', async () => {
    await page.click('[data-id="btn_new_ticket_left"]')
    await page.type('input[name="subject"]', 'Test Puppeteer Sadlycio')
    await page.type('textarea[name="description"]', 'Tudum, TSS! 🥁')
  
    await page.click('#react-select-Tipo--value')
    const typeSelectEls = await page.$$('.Select-menu-outer #react-select-Tipo--list [role="menuitem"]')
    await typeSelectEls[0].click()
  
    await page.click('#react-select-Grupos--value')
    const groupsSelectEls = await page.$$('.Select-menu-outer #react-select-Grupos--list [role="menuitem"]')
    await groupsSelectEls[1].click()

    // Expecting only that Create button is true. I don't want to create tickets for now...
    const createBtn = await page.waitForXPath('//button[@type="submit"]/span[contains(., "criar ticket")]')
    expect(createBtn).to.have.property('_disposed', false)
  });

  it('should render "Email do consumidor" input when creating a ticket if "Tipo" and "Grupo" has an e-mail account', async function() {
    await page.click('[data-id="btn_new_ticket_left"]');

    await page.click('#react-select-Tipo--value')
    const typeSelectEl = await page.waitForXPath('//div[@class="Select-menu-outer"]/div[@id="react-select-Tipo--list"]/div[@role="menuitem"][contains(.,"Automatizado")]')
    await typeSelectEl.click();

    await page.click('#react-select-Grupos--value')
    const groupsSelectEl = await page.waitForXPath('//div[@class="Select-menu-outer"]/div[@id="react-select-Grupos--list"]/div[@role="menuitem"][contains(.,"Atendimento")]');
    await groupsSelectEl.click()

    const hasEmail = await (await page.waitForResponse(response => response.url().includes('hasemailaccount'))).text()
    
    if (hasEmail) {
      const consumerEmail = await page.$('input[name="consumerEmail"]')
      expect(consumerEmail).to.have.property('_disposed', false)
    } else {
      this.skip();
    }
  });

  it('should render "Nenhum ticket encontrado" if searching for a nonexistent ticket', async () => {
    await page.type('[data-id="search_area"]','123456789012345')
    await page.keyboard.press('Enter')

    const emptyHeader = await page.waitForXPath('//h2[contains(., "Nenhum ticket encontrado")]')
    expect(emptyHeader).to.have.property('_disposed', false)
  });

  it('should render list item with searched ticket id', async () => {
    await page.type('[data-id="search_area"]','956')
    await page.keyboard.press('Enter')

    const ticketList = await page.waitForXPath('//span[contains(., "#956")]')
    expect(ticketList).to.have.property('_disposed', false)
  });

  it('should render ticket list or "Nenhum ticket pendente" when clicking "Caixa de entrada" on left sidebar', async () => {
    await page.click('div[data-id="btn_box"]')
    const inboxPage = await page.waitForXPath('(//li[@aria-controls="page-menu"] | //h2[contains(., "Nenhum ticket pendente")])[last()]')
    expect(inboxPage).to.have.property('_disposed', false)
  });

  it('should render ticket list or "Nenhuma nova interação" when clicking "Com novas interações" on left sidebar', async () => {
    await page.click('div[data-id="btn_newexternalusersinteractions_box"]')
    const newInteractionPage = await page.waitForXPath('(//li[@aria-controls="page-menu"] | //h2[contains(., "Nenhuma nova interação")])[last()]')
    expect(newInteractionPage).to.have.property('_disposed', false)
  });

  it('should render ticket list or "Nenhum ticket com estrela" when clicking "Com estrela" on left sidebar', async () => {
    await page.click('div[data-id="btn_starred_box"]')
    const starredPage = await page.waitForXPath('(//li[@aria-controls="page-menu"] | //h2[contains(., "Nenhum ticket com estrela")])[last()]')
    expect(starredPage).to.have.property('_disposed', false)
  });

  it('should render ticket list or "Nenhum ticket finalizado" when clicking "Finalizados" on left sidebar', async () => {
    await page.click('div[data-id="btn_finished_box"]')
    const donePage = await page.waitForXPath('(//li[@aria-controls="page-menu"] | //h2[contains(., "Nenhum ticket finalizado")])[last()]')
    expect(donePage).to.have.property('_disposed', false)
  });

  it('should render ticket list or "Nenhum ticket reaberto" when clicking "Reabertos" on left sidebar', async () => {
    await page.click('div[data-id="btn_reopen_box"]')
    const reopenPage = await page.waitForXPath('(//li[@aria-controls="page-menu"] | //h2[contains(., "Nenhum ticket reaberto")])[last()]')
    expect(reopenPage).to.have.property('_disposed', false)
  });

  it('should render "Não há tickets na lixeira" when clicking "Lixeira" on left sidebar if offline', async () => {
    await page.setOfflineMode(true)
    await page.click('div[data-id="btn_trash"]')
    const trashPage = await page.waitForXPath('(//li[@aria-controls="page-menu"] | //h2[contains(., "Não há tickets na lixeira")])[last()]')
    await page.setOfflineMode(false)
    expect(trashPage).to.have.property('_disposed', false)
  });

  it('should open a ticket from list', async () => {
    await page.click('a.firstOfType');
    const selectState = await page.waitFor('#select-state')
    expect(selectState).to.have.property('_disposed', false)    
  });
})