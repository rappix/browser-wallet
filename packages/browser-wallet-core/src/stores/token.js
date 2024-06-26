import BaseStore from "./base.js";

class TokenStore extends BaseStore {
  constructor(network, account) {
    const network_name = network.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '_')
      .replace(/^-+|-+$/g, '')

    super('token_' + network_name + '_' + account.address)

    this.network = network
    this.account = account
  }

  async fetch() {
    if(!['mainnet', 'testnet'].includes(this.network.id)) return false

    const url = this.network.api_endpoint + '/token/transactions?account=' + this.account.address + '&pageSize=10&page=1'
    let result = await fetch(url, {
      mode: 'cors'
    })
    result = await result.json()

    for(const token of result) {
      await this.set(token.id, token)
    }

    return result
  }
}

export default TokenStore