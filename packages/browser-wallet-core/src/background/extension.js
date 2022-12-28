import aesjs from 'aes-js'
import { hexToU8a, stringToU8a, u8aToHex } from '@polkadot/util'
import {
    blake2AsU8a,
    cryptoWaitReady,
    keccakAsU8a,
    mnemonicGenerate,
    mnemonicValidate,
    sha512AsU8a
} from '@polkadot/util-crypto'
import { AccountStore, NetworkStore, SettingsStore, WalletStore } from "../stores/index.js"
import { Keyring } from "@polkadot/keyring"
import { polkadotApi } from "../polkadotApi.js";
import { humanToBalance } from "@bitgreen/browser-wallet-utils";

import { passwordTimeout } from "../constants.js";

class Extension {
    #password

    constructor() {
        this.accounts_store = new AccountStore()
        this.networks_store = new NetworkStore()
        this.wallets_store = new WalletStore()
        this.settings_store = new SettingsStore()

        this.#password = null
        this.password_timer = null
    }

    async handle(data, from, port) {
        await this.refreshPassword()

        switch(data.command) {
            case 'new_wallet':
                return await this.newWallet()
            case 'save_wallet':
                return await this.saveWallet(data?.params)
            case 'unlock_wallet':
                return await this.unlockWallet(data?.params)
            case 'lock_wallet':
                return await this.lockWallet()
            case 'new_account':
                return await this.newAccount(data?.params)
            case 'save_network':
                return await this.saveNetwork(data?.params)
            case 'change_network':
                return await this.changeNetwork(data?.params)
            case 'get_balance':
                return await this.getBalance()
            case 'reveal_mnemonic':
                return await this.revealMnemonic(data?.params)
            case 'check_login':
                return await this.checkLogin()
            case 'sign_in':
                return await this.signIn(data?.id, data?.params)
            case 'transfer':
                return await this.transfer(data?.id, data?.params)
            case 'extrinsic':
                return await this.submitExtrinsic(data?.id, data?.params)
            case 'change_setting':
                return await this.changeSetting(data?.params)
            default:
                return false
        }
    }

    async savePassword(password) {
        this.#password = password

        // remove password after password_time
        clearTimeout(this.password_timer)
        this.password_timer = setTimeout(() => {
            this.#password = null;
        }, passwordTimeout)
    }

    async refreshPassword() {
        if(!this.#password) return false

        // refresh password - extend its time
        clearTimeout(this.password_timer);
        if(this.#password) {
            this.password_timer = setTimeout(() => {
                this.#password = null;
            }, passwordTimeout)
        }
    }

    async newWallet() {
        await cryptoWaitReady()

        const mnemonic = mnemonicGenerate(24);
        return mnemonic.split(' ')
    }

    async saveWallet(params) {
        let mnemonic = params?.mnemonic
        const password = params?.password
        const name = params?.name

        // convert mnemonic to string, space separated
        mnemonic = Object.entries(mnemonic).map(([key, value]) => `${value}`).join(' ')

        if(!mnemonicValidate(mnemonic)) {
            return false
        }

        const encrypted_data = await this.encryptWallet(mnemonic, password)
        await this.wallets_store.asyncSet('main', encrypted_data)

        await this.createAccount(name, mnemonic)

        return true
    }

    async unlockWallet(params) {
        const password = params?.password
        const keep_me_signed_in = params?.keep_me_signed_in

        const result = await this.decryptWallet(password)

        if(!result) return false

        if(keep_me_signed_in) await this.savePassword(password)

        await this.settings_store.asyncSet('keep_me_signed_in', keep_me_signed_in)

        return true
    }

    async lockWallet() {
        this.#password = null
        clearTimeout(this.password_timer)
    }

    async newAccount(params) {
        const password = params?.password
        const name = params?.name
        const next_id = await this.accounts_store.nextId()

        if(!password || !name) {
            return false
        }

        const mnemonic = await this.decryptWallet(password, true)

        if(mnemonic) {
            return this.createAccount(name, mnemonic, next_id)
        }

        return false
    }

    async saveNetwork(params) {
        let network_id = params?.network_id
        const network_name = params?.network_name
        const network_url = params?.network_url
        const switch_network = params?.switch_network

        if(!network_id) {
            network_id = await this.networks_store.nextId()
        }

        await this.networks_store.asyncSet(network_id, {
            name: network_name,
            url: network_url
        })

        if(switch_network) {
            await this.networks_store.asyncSet('current', network_id)
            await polkadotApi(true) // reload polkadot API
        }
    }

    async changeNetwork(params) {
        const network_id = params?.network_id

        await this.networks_store.asyncSet('current', network_id)
        await polkadotApi(true) // reload polkadot API
    }

    async getBalance() {
        const polkadot_api = await polkadotApi()
        const current_account = await this.accounts_store.current()

        const { nonce, data: balance } = await polkadot_api.query.system.account(current_account.address);

        return balance.free.toString()
    }

    async revealMnemonic(params) {
        const password = params?.password

        if(!password) return false

        return await this.decryptWallet(password, true)
    }

    async checkLogin() {
        return await this.decryptWallet(this.#password)
    }

    async encryptWallet(mnemonic, password) {
        // get ascii value of first 2 chars
        const vb1 = password.charCodeAt(0);
        const vb2 = password.charCodeAt(1);

        // position to derive other 3 passwords
        const p = vb1*vb2;

        // derive the password used for encryption with an init vector (random string) and 10000 hashes with 3 different algorithms
        let randomstring = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        for(let i = 0; i < 32; i++) {
            randomstring += characters.charAt(Math.floor(Math.random()*charactersLength));
        }
        let dpwd1 = '';
        let dpwd2 = '';
        let dpwd3 = '';
        let h = keccakAsU8a(password + randomstring);
        for(let i = 0; i < 100000; i++) {
            h = keccakAsU8a(h);
            if(i === p) {
                dpwd1 = h;
            }
            h = sha512AsU8a(h);
            if(i === p) {
                dpwd2 = h;
            }
            h = blake2AsU8a(h);
            if(i === p) {
                dpwd3 = h;
            }
        }

        // 3 Layers encryption
        // encrypt the secret words in AES256-CFB
        let ivf = '';
        for(let i = 0; i < 16; i++) {
            ivf += characters.charAt(Math.floor(Math.random()*charactersLength));
        }
        const ivaescfb = aesjs.utils.utf8.toBytes(ivf);
        const keyaescfb = dpwd1.slice(0, 32);
        const aesCfb = new aesjs.ModeOfOperation.cfb(keyaescfb, ivaescfb);
        const mnemonicbytes = aesjs.utils.utf8.toBytes(mnemonic);

        let encryptedaescfb = aesCfb.encrypt(mnemonicbytes);

        // encrypt the output of AES256-CFB in AES256-CTR
        let ivs = '';
        for(let i = 0; i < 16; i++) {
            ivs += characters.charAt(Math.floor(Math.random()*charactersLength));
        }

        const ivaesctr = aesjs.utils.utf8.toBytes(ivs);
        //const keyaes= aesjs.utils.utf8.toBytes(dpwd2.slice(0,32));
        const keyaesctr = dpwd2.slice(0, 32);
        let aesCtr = new aesjs.ModeOfOperation.ctr(keyaesctr, ivaesctr);
        let encryptedaesctr = aesCtr.encrypt(encryptedaescfb);

        // encrypt the output of AES256-CTR in AES256-OFB
        let ivso = '';
        for(let i = 0; i < 16; i++) {
            ivso += characters.charAt(Math.floor(Math.random()*charactersLength));
        }
        const ivaesofb = aesjs.utils.utf8.toBytes(ivso);
        const keyaesofb = dpwd3.slice(0, 32);
        let aesOfb = new aesjs.ModeOfOperation.ofb(keyaesofb, ivaesofb);
        let encryptedaesofb = aesOfb.encrypt(encryptedaesctr);
        let encryptedhex = aesjs.utils.hex.fromBytes(encryptedaesofb);

        // convert to Hex json
        return {
            "iv": randomstring,
            "ivaescfb": u8aToHex(ivaescfb),
            "ivaesctr": u8aToHex(ivaesctr),
            "ivaesofb": u8aToHex(ivaesofb),
            "encrypted": encryptedhex
        };
    }

    async decryptWallet(password, mnemonic_only = false) {
        if(password?.length < 2 || !password) {
            return false;
        }

        const wallet_data = await this.wallets_store.asyncGet('main')
        if(!wallet_data) {
            return false;
        }

        // get ascii value of first 2 chars
        const vb1 = password.charCodeAt(0);
        const vb2 = password.charCodeAt(1);

        // position to derive other 3 passwords
        const p = vb1*vb2;

        // derive the password used for encryption with an init vector (random string) and 10000 hashes with 3 different algorithms
        const enc = wallet_data;
        let randomstring = enc.iv;
        let dpwd1 = '';
        let dpwd2 = '';
        let dpwd3 = '';
        let h = keccakAsU8a(password + randomstring);
        for(let i = 0; i < 100000; i++) {
            h = keccakAsU8a(h);
            if(i === p) {
                dpwd1 = h;
            }
            h = sha512AsU8a(h);
            if(i === p) {
                dpwd2 = h;
            }
            h = blake2AsU8a(h);
            if(i === p) {
                dpwd3 = h;
            }
        }

        // decrypt AES-OFB
        const ivaesofb = hexToU8a(enc.ivaesofb);
        const keyaesofb = dpwd3.slice(0, 32);
        let aesOfb = new aesjs.ModeOfOperation.ofb(keyaesofb, ivaesofb);
        const encryptedhex = enc.encrypted;
        const encryptedaesofb = aesjs.utils.hex.toBytes(encryptedhex);
        let encryptedaesctr = aesOfb.decrypt(encryptedaesofb);

        // decrypt AES-CTR
        const ivaesctr = hexToU8a(enc.ivaesctr);
        const keyaesctr = dpwd2.slice(0, 32);
        let aesCtr = new aesjs.ModeOfOperation.ctr(keyaesctr, ivaesctr);
        let encryptedaescfb = aesCtr.decrypt(encryptedaesctr);

        // decrypt AES-CFB
        const ivaescfb = hexToU8a(enc.ivaescfb);
        const keyaescfb = dpwd1.slice(0, 32);
        let aesCfb = new aesjs.ModeOfOperation.cfb(keyaescfb, ivaescfb);
        let decrypted = aesCfb.decrypt(encryptedaescfb);
        let decrypted_mnemonic = aesjs.utils.utf8.fromBytes(decrypted);

        if(!decrypted_mnemonic) {
            return false;
        } else {
            if(!mnemonicValidate(decrypted_mnemonic)) {
                return false;
            }

            if(mnemonic_only) {
                return decrypted_mnemonic;
            }

            return true;
        }
    }

    async createAccount(name, mnemonic, account_id = 0) {
        await cryptoWaitReady()

        let uri_mnemonic = mnemonic
        if(account_id > 0) {
            uri_mnemonic += '//' + account_id
        }

        const keyring = new Keyring({
            type: 'sr25519'
        });

        const keypair = keyring.addFromUri(uri_mnemonic, {
            name: ''
        }, 'sr25519');

        await this.accounts_store.asyncSet(account_id, {
            "address": keypair.address,
            "name": name
        })

        await this.accounts_store.asyncSet('current', account_id)

        return account_id
    }

    async loadAccount(password, account_id = false) {
        await cryptoWaitReady()

        let mnemonic = await this.decryptWallet(password, true)

        if(!mnemonic) {
            return false
        }

        account_id = parseInt(account_id)
        const account = await this.accounts_store.asyncGet(account_id)
        if(account_id && account_id > 0 && account) {
            mnemonic += '//' + account_id
        }

        const keyring = new Keyring({
            type: 'sr25519'
        });

        return keyring.addFromUri(mnemonic, { name: account.name }, 'sr25519');
    }

    async signIn(message_id, params) {
        let response = {}

        const account = await this.loadAccount(params?.password, params?.account_id)
        if(account) {
            const dt = new Date()
            const timestamp = dt.getTime()
            const message = timestamp.toString() + "#" + params?.domain
            const signature = account.sign(stringToU8a(message))

            response = {
                message,
                signature: u8aToHex(signature),
                address: account.address
            }
        } else {
            return false
        }

        return response
    }

    async transfer(message_id, params) {
        const polkadot_api = await polkadotApi()
        const amount = humanToBalance(params?.amount)

        let response = {}

        const account = await this.loadAccount(params?.password, params?.account_id)

        if(!account) {
            return false
        }

        return new Promise(async(resolve) => {
            await polkadot_api.tx.balances.transfer(params?.recipient, amount)
                .signAndSend(account, { nonce: -1 }, ({ status, events = [], dispatchError }) => {
                    if(dispatchError) {
                        // for module errors, we have the section indexed, lookup
                        const decoded = polkadot_api.registry.findMetaError(dispatchError.asModule)
                        const { docs, method, section } = decoded

                        if(dispatchError.isModule) {
                            response = {
                                section,
                                method,
                                status: 'failed',
                                error: 'Transaction failed: ' + docs.join(' ')
                            }
                        } else {
                            // Other, CannotLookup, BadOrigin, no extra info
                            response = {
                                status: 'failed',
                                error: 'Error in transaction: ' + dispatchError.toString()
                            }
                        }

                        resolve(response)
                    }

                    if(status.isInBlock || status.isFinalized) {
                        // return result as soon as successfully submitted to the chain
                        resolve({
                            status: 'success'
                        })
                    }
                }).catch(err => {
                    resolve({
                        status: 'failed',
                        error: err.message
                    })
                });
        });
    }

    async submitExtrinsic(message_id, params) {
        const polkadot_api = await polkadotApi()

        const pallet = params?.pallet
        const call = params?.call
        const call_parameters = params?.call_parameters

        let response = {}

        const account = await this.loadAccount(params?.password, params?.account_id)

        if(!account) {
            return false
        }

        return new Promise(async(resolve) => {
            await polkadot_api.tx[pallet][call](...call_parameters)
                .signAndSend(account, { nonce: -1 }, ({ status, events = [], dispatchError }) => {
                    if(dispatchError) {
                        // for module errors, we have the section indexed, lookup
                        const decoded = polkadot_api.registry.findMetaError(dispatchError.asModule)
                        const { docs, method, section } = decoded

                        if(dispatchError.isModule) {
                            response = {
                                section,
                                method,
                                status: 'failed',
                                error: 'Transaction failed: ' + docs.join(' ')
                            }
                        } else {
                            // Other, CannotLookup, BadOrigin, no extra info
                            response = {
                                status: 'failed',
                                error: 'Error in transaction: ' + dispatchError.toString()
                            }
                        }

                        resolve(response)
                    }

                    if(status.isInBlock || status.isFinalized) {
                        // return result as soon as successfully submitted to the chain
                        resolve({
                            status: 'success'
                        })
                    }
                }).catch(err => {
                    resolve({
                        status: 'failed',
                        error: err.message
                    })
                });
        });
    }

    async changeSetting(params) {
        for(const [key, value] of Object.entries(params)) {
            await this.settings_store.asyncSet(key, value)

            // remove saved password
            if(key === 'keep_me_signed_in' && value === false) {
                clearTimeout(this.password_timer);
                this.#password = null
            }
        }
    }
}

export default Extension