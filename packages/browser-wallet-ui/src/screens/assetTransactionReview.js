import Screen, { goBackScreen, goToScreen } from './index.js'
import { sendMessage } from "../messaging.js";
import DOMPurify from "dompurify";
import {AccountStore, CacheStore} from "@bitgreen/browser-wallet-core";
import {
  balanceToHuman,
  getAmountDecimal,
  humanToBalance
} from "@bitgreen/browser-wallet-utils";
import { showNotification } from "../notifications.js";

export default async function assetTransactionReviewScreen(params) {
  const screen = new Screen({
    template_name: 'layouts/full_page',
    template_params: {
      title: 'Review Transaction'
    },
    login: false,
    header: false,
    footer: false,
    tab_id: params?.tab_id,
    message_id: params?.message_id
  })
  await screen.init()

  const accounts_store = new AccountStore()
  const account = await accounts_store.get(params?.account_id)

  const cache_store = new CacheStore()

  const recipient = params?.recipient
  const asset_amount = params?.amount
  const asset_info = getAmountDecimal(asset_amount, 2)
  const usd_info = getAmountDecimal(asset_amount * params?.current_asset?.price, 2) // TODO: update price!

  let estimated_fee = 0
  if(params?.current_asset.is_token) {
    if(params?.current_asset.name.toLowerCase() === 'bbb') {
      estimated_fee = await sendMessage('get_estimated_fee', {
        pallet: 'balances',
        call: 'transfer',
        call_parameters: [
          params?.recipient,
          humanToBalance(params?.amount)
        ],
        account_address: account.address
      })
    } else {
      estimated_fee = await sendMessage('get_estimated_fee', {
        pallet: 'tokens',
        call: 'transfer',
        call_parameters: [
          params?.recipient,
          params?.current_asset.name,
          humanToBalance(params?.amount)
        ],
        account_address: account.address
      })
    }
  } else {
    estimated_fee = await sendMessage('get_estimated_fee', {
      pallet: 'assets',
      call: 'transfer',
      call_parameters: [
        params?.current_asset?.name,
        params?.recipient,
        params?.amount
      ],
      account_address: account.address
    })
  }

  const bbbTokenPrice = await cache_store.get('bbb_price')
  const fee_usd = balanceToHuman(estimated_fee, 4) * bbbTokenPrice
  const fee_info = getAmountDecimal(fee_usd, 4)

  let asset_name = ''
  if(params?.current_asset?.is_token) {
    asset_name = params?.current_asset?.name?.toUpperCase()
  } else {
    asset_name = 'CREDITS'
  }

  await screen.set('.content', 'asset/review_transaction', {
    asset_name: asset_name,
    asset_amount: asset_info.amount,
    asset_decimals: asset_info.decimals,
    usd_amount: params?.current_asset?.price > 0 ? '<span class="dollar">$</span>' + usd_info.amount : 'N/A',
    usd_decimals: params?.current_asset?.price > 0 ? '.' + usd_info.decimals : '',
    fee_amount: fee_usd < 0.0001 ? '0' : fee_info.amount,
    fee_decimals: fee_usd < 0.0001 ? '0001' : fee_info.decimals,
    account_name: (account.name.length > 14 ? account.name.substring(0,14)+'...' : account.name),
    account_address: account.address,
    recipient_address: recipient
  })

  await screen.append('.content', 'global/loading', {
    title: 'processing transaction',
    desc: 'Hold tight while we get confirmation of this transaction.',
    top: '0;',
    padding_top: '60px',
    progress: '25 75'
  });

  const input_field = document.querySelector("#root .footer #password")
  const show_password = document.querySelector("#root .footer .show-password")

  screen.setListeners([
    {
      element: '.heading #go_back',
      listener: () => goBackScreen()
    },
    {
      element: '#approve_transaction',
      listener: () => makeTransaction()
    },
    {
      element: '#root #password',
      type: 'keypress',
      listener: async(e) => {
        if(e.key === "Enter") {
          await makeTransaction()
        }
      }
    },
    {
      element: '#root .footer .show-password',
      listener: () => {
        if(input_field.type === 'password') {
          input_field.type = 'text'
          show_password.innerHTML = '<span class="icon icon-eye-blocked"></span>'
        } else {
          input_field.type = 'password'
          show_password.innerHTML = '<span class="icon icon-eye"></span>'
        }
      }
    }
  ])

  const makeTransaction = async() => {
    const password_el = document.querySelector("#root #password")

    showProcessing()

    const response = await sendMessage('transfer', {
      password: DOMPurify.sanitize(password_el?.value),
      account_id: params?.account_id,
      asset: params?.current_asset,
      amount: params?.amount,
      recipient: params?.recipient,
      tab_id: params?.tab_id
    }, params?.message_id)

    if(response?.success) {
      // send message to tab if response is successful
      screen.sendMessageToTab({
        ...response
      })

      await goToScreen('assetTransactionFinishScreen', {
        account_name: account.name,
        account_address: account.address,
        recipient: params?.recipient,
        from_tab: !!params?.tab_id
      })
    } else if(response?.status === 'failed' && response.error) {
      hideProcessing()
      await showNotification(response.error, 'error', 5000)
    } else {
      hideProcessing()
      await showNotification('Password is wrong!', 'error')
    }

    show_password.innerHTML = '<span class="icon icon-eye"></span>'
    input_field.type = 'password'
  }

  const showProcessing = () => {
    const loading_el = document.querySelector("#loading_content")

    loading_el.classList.add('active')

    screen.freezeRoot()
  }

  const hideProcessing = () => {
    setTimeout(() => {
      const loading_el = document.querySelector("#loading_content")

      loading_el.classList.remove('active')
      screen.unFreezeRoot()
    }, 1200)
  }
}