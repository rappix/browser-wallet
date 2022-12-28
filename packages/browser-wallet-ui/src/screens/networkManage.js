import Screen, { goBackScreen, goToScreen } from './index.js'
import { NetworkStore } from "@bitgreen/browser-wallet-core";

export default async function networkManageScreen() {
    const screen = new Screen({
        template_name: 'layouts/default_custom_header',
        header: false,
        footer: true
    })
    await screen.init()

    await screen.set('#heading', 'network/manage/heading')
    await screen.set('#bordered_content', 'network/manage/content')

    const network_store = new NetworkStore()
    const current_network = await network_store.current()
    const all_networks = await network_store.asyncAll()

    for(const n of all_networks) {
        const network_id = n?.key
        const network = n.value
        await screen.append('#root #wallet_list', 'network/manage/list_item', {
            network_id,
            network_name: network.name,
            network_url: network.url
        })
    }

    screen.setListeners([
        {
            element: '#heading #new_network',
            listener: () => goToScreen('networkCreateScreen')
        },
        {
            element: '#heading #go_back',
            listener: () => goBackScreen()
        },
        {
            element: '#root #wallet_list .button-item',
            listener: (e) => {
                return goToScreen('networkCreateScreen', {
                    network_id: e.target.dataset?.id
                })
            }
        }
    ])
}