import BaseStore from "./base.js";

class TransactionStore extends BaseStore {
  constructor(network, account) {
    const network_name = network.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '_')
      .replace(/^-+|-+$/g, '')

    super('transaction_' + network_name + '_' + account.address)

    this.network = network
    this.account = account
  }

  async fetch() {
    if(!['mainnet', 'testnet'].includes(this.network.id)) return false

    const date = new Date();
    const date_end = date.toISOString().slice(0, 19).replace('T', '+')
    const url = this.network.api_endpoint + '/transactions?account=' + this.account.address;
    let result = await fetch(url, {
      mode: 'cors'
    })
    result = await result.json()

    for(const transaction of result.transactions) {
      await this.set(transaction.hash, transaction)
    }

    return result
  }
}

export default TransactionStore