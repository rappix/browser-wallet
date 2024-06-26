import { resetElement, updateElement } from "../screens.js";
import { sendMessage } from "../messaging.js";
import {
  formatAddress,
  getCurrentBrowser,
  isAndroid, isIOs,
  isMacOs,
  isStandaloneApp,
  isWindows,
  sleep
} from "@bitgreen/browser-wallet-utils";
import { AccountStore, CacheStore, NetworkStore, databaseService } from "@bitgreen/browser-wallet-core";
import { hideNotification } from "../notifications.js";
import { Clipboard } from '@capacitor/clipboard';
import { App } from '@capacitor/app';
import anime from 'animejs';
import * as jdenticon from "jdenticon";
import {Tooltip} from "bootstrap";

/* all screens */
import welcomeScreen from './welcome.js'
import walletScreen from './wallet.js'
import walletImportScreen from "./walletImport.js";
import walletCreateScreen from "./walletCreate.js";
import walletConfirmScreen from "./walletConfirm.js";
import walletPasswordScreen from "./walletPassword.js";
import walletFinishScreen from "./walletFinish.js";
import walletBackupScreen from "./walletBackup.js";
import dashboardScreen from "./dashboard.js";
import signInScreen from "./signIn.js";
import assetAllScreen from "./assetAll.js";
import assetSendScreen from "./assetSend.js";
import accountManageScreen from "./accountManage.js";
import accountCreateScreen from "./accountCreate.js";
import settingsScreen from "./settings.js";
import accountEditScreen from "./accountEdit.js";
import assetReceiveScreen from "./assetReceive.js";
import assetTransactionReviewScreen from "./assetTransactionReview.js";
import assetTransactionFinishScreen from "./assetTransactionFinish.js";
import extrinsicSendScreen from "./extrinsicSend.js";
import transactionHistoryScreen from "./transactionHistory.js";
import transactionDetailsScreen from "./transactionDetails.js";
import tokenAllScreen from "./tokenAll.js";
import tokenBBBScreen from "./tokenBBB.js";
import stakingHomeScreen from "./stakingHome.js";
import stakingIntroScreen from "./stakingIntro.js";
import stakingCollatorsScreen from "./stakingCollators.js";
import stakingCollatorScreen from "./stakingCollator.js";
import kycStartScreen from "./kycStart.js";
import kycBasicScreen from "./kycBasic.js";
import connectionErrorScreen from "./connectionError.js";
import kycAdvancedScreen from "./kycAdvanced.js";
import kycAccreditedScreen from "./kycAccredited.js";
import assetCreditsScreen from "./assetCredits.js";
import retiredCreditsScreen from "./retiredCredits.js";
import walletDeleteScreen from "./walletDelete.js";

const current_browser = getCurrentBrowser()

let logged_in = false
let lock_timeout = null

class Screen {
  initialized = false
  tab = false

  options = {
    element: '#root',
    template_name: 'init',
    template_params: {},
    header: false,
    footer: false,
    login: true,
    auto_load: true,
    smooth_load: false,
    freeze_root: false,
    freeze_root_delay: 0,
    win_width: 400,
    win_height: 600
  }

  constructor(opts) {
    this.header_el = document.querySelector('#header')
    this.footer_el = document.querySelector('#main_footer')

    this.options = {
      ...this.options,
      ...opts
    }
  }

  async init() {
    logged_in = await this.fastCheckLogin(true)

    this.options.login ? await showLogin(true) : hideLogin(true)

    this.resizeTo(this.options.win_width, this.options.win_height)

    this.options.freeze_root ? this.freezeRoot() : this.unFreezeRoot

    this.options.header ? this.showHeader() : this.hideHeader()
    this.options.footer ? this.showFooter() : this.hideFooter()

    if(this.options.smooth_load) this.resetRoot()
    if(this.options.auto_load) await this.set() && hideInit()
    if(this.options.tab_id && this.options.message_id) await this.loadTab()

    setTimeout(this.unFreezeRoot, this.options.freeze_root_delay)

    this.initialized = true

    return this.initialized
  }

  async fastCheckLogin(init = true) {
    if(init) {
      clearTimeout(lock_timeout)
    }

    // refresh status every 10 seconds
    lock_timeout = setTimeout(async() => {
      logged_in = await this.fastCheckLogin(false)

      if(this.options.login && !logged_in) await showLogin()
    }, 10000)

    return await sendMessage('fast_check_login')
  }

  resizeTo(width, height) {
    if(isWindows()) {
      // Add 16px width and 39px height on windows.
      width += 16
      height += 39
    } else if(isMacOs()) {
      // Add 39px height on macOS.
      height += 39
    }

    window.resizeTo(width, height) // Set window height
  }

  resetRoot() {
    document.querySelector('#root').classList.remove('init')
  }

  showRoot() {
    document.querySelector('#root').classList.add('init')
  }

  freezeRoot() {
    document.querySelector('#root').classList.add('freeze')
  }

  unFreezeRoot() {
    document.querySelector('#root').classList.remove('freeze')
  }

  showInit() {
    document.querySelector("#init_screen").classList.remove("inactive")
  }

  async set(element = this.options.element, template_name = this.options.template_name, params = this.options.template_params) {
    await updateElement(element, template_name, params, false)

    if(element === '#root') this.showRoot()

    return true
  }

  async append(element, template_name, params) {
    return await updateElement(element, template_name, params, true)
  }

  async reset(element) {
    return await resetElement(element)
  }

  // used for ios to adjust footer
  async moveFooterOnTop() {
    const root = document.querySelector('#root')
    const footer_old = root.querySelector('.footer')

    root.appendChild(footer_old)
  }

  setParam(element, value) {
    document.querySelector(element).innerHTML = value
  }

  setListeners(options = []) {
    for(let option of options) {
      if(option.element) {
        for(let element of document.querySelectorAll(option.element)) {
          this.setListener(element, option.listener, option.type)
        }
      }
    }
  }

  setListener(element, method, type = 'click') {
    return element.addEventListener(type, method)
  }

  showHeader() {
    if(!this.header_el.classList.contains('visible')) {
      anime({
        targets: '#header',
        duration: 400,
        translateY: [-60, 0],
        opacity: 1,
        easing: 'linear',
        delay: !this.header_el.classList.contains('init') ? 400 : 0
      });
    }

    this.header_el.classList.add('visible')
    this.header_el.classList.add('init')
  }

  hideHeader() {
    if(this.header_el.classList.contains('visible')) {
      anime({
        targets: '#header',
        duration: 400,
        translateY: [0, -60],
        opacity: [1, 0],
        easing: 'linear',
        delay: 0
      });
    }

    this.header_el.classList.remove('visible')
  }

  showFooter() {
    // if(!logged_in) return false
    if(!this.footer_el.classList.contains('visible') && !this.footer_el.classList.contains('disabled')) {
      anime({
        targets: '#main_footer',
        duration: 300,
        translateY: [60, 0],
        opacity: 1,
        easing: 'linear',
        delay: 400
      });
    }
    
    const current_screen = currentScreen()
    for(let element of this.footer_el.querySelectorAll('.item')) {
      element.classList.remove('active')

      if(element.id === 'go_' + current_screen.name) {
        element.classList.add('active')
      }

      if(element.id === 'go_stakingHomeScreen' && current_screen.name.includes('staking')) {
        element.classList.add('active')
      }
    }

    this.footer_el.classList.add('visible')
  }

  hideFooter() {
    if(this.footer_el.classList.contains('visible')) {
      anime({
        targets: '#main_footer',
        duration: 300,
        translateY: [0, 120],
        opacity: [1, 0],
        easing: 'linear',
        delay: 0
      });
    }

    this.footer_el.classList.remove('visible')
  }

  hideInit() {
    setTimeout(function() {
      document.querySelector("#init_screen").classList.add("fade-out");
    }, 200);
    setTimeout(function() {
      document.querySelector("#init_screen").classList.add("inactive")
      document.querySelector("#init_screen").classList.remove("fade-out")
    }, 400)
  }

  async loadTab() {
    this.options.tab_id = parseInt(this.options.tab_id)
    this.options.message_id = parseFloat(this.options.message_id)

    if(!this.options.tab_id || !this.options.message_id) {
      return false
    }

    this.tab = await current_browser.tabs.connect(this.options.tab_id, { name: 'PORT_CONTENT_RESOLVE=' + this.options.message_id });

    return this.tab
  }

  sendMessageToTab(response) {
    try {
      this.tab.postMessage({
        id: this.options.message_id,
        response
      })

      return true
    } catch(e) {
      return false
    }
  }
}

const freezeRoot = () => {
  document.querySelector('#root').classList.add('freeze')
}

const unFreezeRoot = () => {
  document.querySelector('#root').classList.remove('freeze')
}

const showInit = (locked = false) => {
  document.querySelector("#init_screen").classList.remove("inactive")
  document.querySelector("#init_screen").classList.add("fade-in")

  if(locked) {
    document.querySelector("#init_screen").classList.add("locked")
  }

  document.querySelector("#init_screen").classList.add("loaded")
}

const hideInit = (unlocked = false) => {
  const isLoaded = document.querySelector("#init_screen").classList.contains("loaded")

  if(unlocked || !document.querySelector("#init_screen").classList.contains("locked")) {
    setTimeout(function() {
      document.querySelector("#init_screen").classList.remove("fade-in")
      document.querySelector("#init_screen").classList.add("fade-out");
    }, unlocked && isLoaded ? 0 : 300);
    setTimeout(function() {
      document.querySelector("#init_screen").classList.add("inactive")
      document.querySelector("#init_screen").classList.remove("fade-out")
    }, unlocked && isLoaded ? 300 : 600)
  }
}

const checkLogin = async() => {
  return await sendMessage('check_login')
}

const showLogin = async(instant = false, force = false) => {
  if(logged_in && !force) {
    return hideLogin()
  }

  logged_in = false
  screen_history = []

  if(document.querySelector("#login_screen").classList.contains('inactive')) {
    document.querySelector("#login_screen").classList.remove('inactive')
    document.querySelector("#login_screen").removeAttribute('style');

    anime({
      targets: '.separator',
      easing: 'linear',
      duration: 300,
      delay: 300,
      translateY: [20, 0],
      opacity: [0, 1]
    });

    anime({
      targets: '.browser-wallet',
      easing: 'linear',
      duration: 300,
      delay: 400,
      translateX: [-30, 0],
      opacity: [0, 1]
    });

    anime({
      targets: '.footer-only',
      easing: 'linear',
      duration: 400,
      delay: 500,
      opacity: [0, 1]
    });

    anime({
      targets: '#login_option',
      easing: 'linear',
      duration: 300,
      delay: 600,
      translateY: [-20, 0],
      opacity: [0, 1]
    });

    if(!instant) {
      anime({
        targets: '#login_screen',
        easing: 'linear',
        duration: 200,
        opacity: [0, 1]
      });
    }
  }

  setTimeout(() => {
    if(!isStandaloneApp()) document.querySelector("#login_screen #password").focus();
  }, 100)
}

const doLogin = async(password) => {
  const result = await sendMessage('unlock_wallet', {
    password
  })

  if(result) {
    logged_in = true
  }

  return result
}

const hideLogin = (instant = false) => {
  if(!instant) {
    document.querySelector("#login_screen").classList.add("fade-out");

    setTimeout(() => {
      document.querySelector("#login_screen").classList.add("inactive")
      document.querySelector("#login_screen").classList.remove("fade-out")
      document.querySelector("#login_screen #password").value = ''; // remove password from a field
    }, 400);
  } else {
    document.querySelector("#login_screen").classList.add("inactive")
    document.querySelector("#login_screen #password").value = ''; // remove password from a field
  }
}

const enableFooter = () => {
  const footer_el = document.querySelector('#main_footer')

  if(footer_el.classList.contains('disabled') && footer_el.classList.contains('visible')) {
    anime({
      targets: '#main_footer',
      duration: 300,
      translateY: [60, 0],
      opacity: 1,
      easing: 'linear',
      delay: 400
    });
  }

  footer_el.classList.remove('disabled')
}

const disableFooter = () => {
  const footer_el = document.querySelector('#main_footer')

  if(!footer_el.classList.contains('disabled')) {
    anime({
      targets: '#main_footer',
      duration: isIOs() ? 300 : 0,
      translateY: [0, 120],
      opacity: [1, 0],
      easing: 'linear',
      delay: 0
    });
  }

  footer_el.classList.add('disabled')
}

const screens = {
  welcomeScreen,
  walletScreen,
  walletCreateScreen,
  walletImportScreen,
  walletConfirmScreen,
  walletPasswordScreen,
  walletFinishScreen,
  walletBackupScreen,
  walletDeleteScreen,
  accountManageScreen,
  accountCreateScreen,
  accountEditScreen,
  dashboardScreen,
  signInScreen,
  assetAllScreen,
  assetCreditsScreen,
  assetSendScreen,
  assetReceiveScreen,
  assetTransactionReviewScreen,
  assetTransactionFinishScreen,
  transactionHistoryScreen,
  transactionDetailsScreen,
  settingsScreen,
  extrinsicSendScreen,
  tokenAllScreen,
  tokenBBBScreen,
  stakingHomeScreen,
  stakingIntroScreen,
  stakingCollatorsScreen,
  stakingCollatorScreen,
  kycStartScreen,
  kycBasicScreen,
  kycAdvancedScreen,
  kycAccreditedScreen,
  connectionErrorScreen,
  retiredCreditsScreen
}

let screen_history = []
let active_screen = null
let transitioning = false

const goToScreen = async(name, params = {}, can_go_back = true, force = false) => {
  
  if(typeof screens[name] !== 'function') {
    console.warn(`Screen not found. [${name}]`)
    return false
  }

  if(force) {
    screen_history = []
  } else {
    hideNotification()
    // sometimes the history is empty, so we must give it at least the home screen
    if(screen_history.length === 0) {
      screen_history.push({
        name: 'dashboardScreen',
        params: {}
      })
    }
  }

  if(active_screen?.name === name) {
    if(force) {
      can_go_back = false
      updateCurrentParams(params)
    } else {
      return false
    }
  }

  // pause if still changing screen
  if(transitioning && !force) return false

  transitioning = true
  setTimeout(() => {
    transitioning = false
  }, 600)

  active_screen = {
    name, params
  }

  if(can_go_back) {
    screen_history.push(active_screen)
    history.pushState(active_screen, '')
  }

  if(!force) {
    anime({
      targets: '#root',
      opacity: [1, 0],
      easing: 'easeInOutSine',
      duration: 150
    });

    anime({
      targets: '#root',
      opacity: [0, 1],
      easing: 'easeInOutSine',
      duration: 1,
      delay: 300
    });

    await sleep(300)
  }

  await screens[name](params)

  anime({
    targets: '#root .footer',
    opacity: [0, 1],
    easing: 'easeInOutSine',
    duration: 200,
    delay: 300
  });

  transitioning = false

  return true
}

const currentScreen = () => {
  return active_screen;
}

const updateCurrentParams = (params) => {
  active_screen.params = {
    ...active_screen.params,
    ...params
  }
  let active_screen_index = screen_history.length > 0 ? screen_history.length - 1 : 0
  screen_history[active_screen_index] = active_screen
  history.replaceState(active_screen, '')
}

const goBackScreen = () => {
  screen_history.pop();
  if(screen_history.length) {
    let last_screen = screen_history[screen_history.length - 1]
    goToScreen(last_screen.name, last_screen.params, false)
  } else if(isStandaloneApp()) {
    App.minimizeApp();
  }
}

App.addListener('backButton', goBackScreen)

if(!isAndroid()) {
  window.addEventListener('popstate', goBackScreen)
}

const expireBrowserTabRequest = async() => {
  // send response to page if any
  for(const state of screen_history) {
    if(screen?.params?.message_id && screen?.params?.tab_id) {
      const tab = await current_browser.tabs.connect(parseInt(screen.params.tab_id), { name: 'PORT_CONTENT_RESOLVE=' + screen.params.message_id });

      try {
        tab.postMessage({
          id: screen.params.message_id,
          response: {
            success: false,
            status: 'expired',
            error: 'Request expired.'
          }
        })
      } catch(e) {
      }
    }
  }
  return true
}

const reloadScreen = async() => {
  const current_screen = currentScreen()

  if(current_screen) {
    return await goToScreen(current_screen.name, current_screen.params, false, true)
  } else {
    return await goToScreen('dashboardScreen', {}, false, true)
  }
}

const updateAccounts = async(current_account_id = null) => {
  const accounts_store = new AccountStore()
  const networks_store = new NetworkStore()
  const cache_store = new CacheStore(await networks_store.current())

  if(current_account_id) {
    await accounts_store.set('current', current_account_id)
  }

  const accounts = await accounts_store.all()
  const current_account = await accounts_store.current()

  const header_logo_el = document.querySelector("#header #top_logo");
  const accounts_modal_el = document.querySelector("#accounts_modal");
  const current_account_el = document.querySelector("#header #current_wallet");
  const go_copy_el = document.querySelector("#header #go_copy");

  if(!current_account) {
    header_logo_el.classList.add('full')
    current_account_el.classList.add('hidden')
    go_copy_el.classList.add('hidden')

  } else {
    header_logo_el.classList.remove('full')
    current_account_el.classList.remove('hidden')
    go_copy_el.classList.remove('hidden')
  }

  accounts_modal_el.querySelector('.address').innerHTML = formatAddress(current_account?.address, 16, 8)

  setTimeout(async() => {
    await resetElement('#accounts_modal #wallet_list')

    for(const a of accounts) {
      const account = a?.value
      const account_id = a?.key
      const account_jdenticon = jdenticon.toSvg(account.address,56)
      const is_current = account_id?.toString() === current_account?.id?.toString()
      const is_kyced = await cache_store.get('kyc_' + account.address)
      // const kyc_level = await cache_store.get('kyc_' + account.address)

      if(is_current) {
        current_account_el.querySelector('.jdenticon .jdenticon-content').innerHTML = account_jdenticon
        current_account_el.querySelector('.name').innerHTML = (account.name && account.name.length > 14) ? account.name.substring(0,14)+'...' : account.name
        current_account_el.querySelector('.address').innerHTML = formatAddress(account?.address, 8, 8)

        if(is_kyced) {
          current_account_el.querySelector('.kyc-status').classList.add(`verified`)
          current_account_el.querySelector('.kyc-status').classList.add(`verified-${is_kyced}`)
          current_account_el.querySelector('.kyc-status').classList.remove('unverified')
        } else {
          current_account_el.querySelector('.kyc-status').classList.remove('verified')
          current_account_el.querySelector('.kyc-status').classList.remove('verified-1')
          current_account_el.querySelector('.kyc-status').classList.remove('verified-2')
          current_account_el.querySelector('.kyc-status').classList.remove('verified-3')
          current_account_el.querySelector('.kyc-status').classList.remove('verified-4')
          current_account_el.querySelector('.kyc-status').classList.add('unverified')
        }

        go_copy_el.dataset.address = account?.address;
        accounts_modal_el.querySelector('#copy_address .btn').dataset.address = account?.address

        accounts_modal_el.querySelector('.title').innerHTML = (account.name && account.name.length > 14) ? account.name.substring(0,14)+'...' : account.name
        accounts_modal_el.querySelector('.address').innerHTML = formatAddress(account?.address, 12, 8)

        if(is_kyced) {
          accounts_modal_el.querySelector('.kyc-status').classList.add('verified')
          accounts_modal_el.querySelector('.kyc-status').classList.remove('unverified')
        } else {
          accounts_modal_el.querySelector('.kyc-status').classList.remove('verified')
          accounts_modal_el.querySelector('.kyc-status').classList.add('unverified')
        }

        if(account_id?.toString() === 'main') {
          accounts_modal_el.querySelector('.badge-primary').classList.remove('hidden')
        } else {
          accounts_modal_el.querySelector('.badge-primary').classList.add('hidden')
        }
      }

      const kyc_level = await cache_store.get('kyc_' + account.address)

      await updateElement('#accounts_modal #wallet_list', 'accounts/modal_item', {
        account_id,
        account_jdenticon,
        account_name: (account.name && account.name.length > 10) ? account.name.substring(0,10)+'...' : account.name,
        account_address: formatAddress(account?.address, 16, 8),
        is_main: account_id?.toString() === 'main' ? '' : 'hidden',
        is_current: is_current ? '' : 'hidden',
        is_kyc_verified: kyc_level ? `verified verified-${kyc_level}` : 'unverified',
      }, true)

      document.querySelectorAll('#current_wallet .kyc-status').forEach((el) => {
        kycTooltip(el, '#current_wallet', 'bottom')
      })

      document.querySelectorAll('#accounts_modal #wallet_list .wallet .kyc-status, #accounts_modal .current-wallet .kyc-status').forEach((el) => {
        kycTooltip(el, '#accounts_modal')
      })

      function kycTooltip(el, container, placement = 'top') {
        let status = 'Not KYC verified.'
        if(el.classList.contains('verified')) {
          if(el.classList.contains('verified-4')) {
            status = 'Accredited KYC.'
          } else if(el.classList.contains('verified-2') || (el.classList.contains('verified-3'))) {
            status = 'Advanced KYC.'
          } else {
            status = 'Basic KYC.'
          }
        }
        new Tooltip(el, {
          title: status,
          container: container,
          placement: placement
        })
      }
    }

    document.querySelectorAll("#accounts_modal #wallet_list .wallet").forEach(w => {
      w.addEventListener("click", async(e) => {
        const account_id = e.target.dataset?.id

        accounts_modal_el.classList.remove('fade')
        accounts_modal_el.classList.remove('show')

        await updateAccounts(account_id)

        await reloadScreen()
      })
    })
  }, 200)
}

const copyText = async(text) => {
  await Clipboard.write({string: text});
}

const scrollToBottom = async(delay = 0) => {
  if(delay > 0) await sleep(delay)

  const bodyElement = document.getElementsByTagName('body')[0]
  const bodyElementOffset = bodyElement.offsetHeight;
  const outerHeight = window.outerHeight

  const url_params = new URLSearchParams(window.location.search)
  if(url_params.has('popup')) {
    window.scrollTo(0, 1000)
  } else {
    window.scrollTo(0, outerHeight - bodyElementOffset + 90)
  }
}

const scrollContentTo = async (direction, element = '#root .scroll-content') => {
  const delay = 800; // Delay in milliseconds
  setTimeout(() => {
    const scrollableDiv = document.querySelector(element);
    const targetScrollTop = (direction === 'top') ? 0 : scrollableDiv.scrollHeight;

    // Check if the scroll position is already at the target
    if (
      (direction === 'top' && scrollableDiv.scrollTop === 0) ||
      (direction === 'bottom' && scrollableDiv.scrollTop === scrollableDiv.scrollHeight - scrollableDiv.clientHeight)
    ) {
      return; // No need to scroll if already at the target
    }

    const duration = 300; // Duration of the animation in milliseconds
    const startTime = performance.now();
    const startScrollTop = scrollableDiv.scrollTop;

    const animateScroll = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1); // Ensure progress does not exceed 1
      const easeProgress = easeOutQuad(progress); // Apply easing function for smoother animation
      scrollableDiv.scrollTop = startScrollTop + (easeProgress * (targetScrollTop - startScrollTop));

      if (elapsedTime < duration) {
        requestAnimationFrame(animateScroll);
      }
    };

    const easeOutQuad = (t) => t * (2 - t);

    requestAnimationFrame(animateScroll);
  }, delay);
};

export default Screen
export {
  screens,
  showLogin,
  doLogin,
  hideLogin,
  goToScreen,
  goBackScreen,
  reloadScreen,
  updateCurrentParams,
  currentScreen,
  expireBrowserTabRequest,
  updateAccounts,
  copyText,
  enableFooter,
  disableFooter,
  scrollToBottom,
  scrollContentTo,
  freezeRoot,
  unFreezeRoot,
  showInit,
  hideInit
}