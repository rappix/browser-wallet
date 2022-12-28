import anime from 'animejs';

import Screen, { goToScreen } from './index.js'
import { sendMessage } from "../messaging.js";
import { WalletStore } from "@bitgreen/browser-wallet-core";

export default async function walletScreen() {
    const screen = new Screen({
        template_name: 'layouts/default',
        header: true,
        login: false,
        smooth_load: true,
    })
    await screen.init()

    await screen.set('#heading', 'shared/heading', {
        title: 'Get Started'
    })

    await screen.set('#bordered_content', 'wallet/index')

    anime({
        targets: '#bordered_content',
        duration: 800,
        translateY: [50, 0],
        easing: 'linear',
    });

    screen.setListeners([
        {
            element: '#new_wallet',
            listener: async() => {
                await goToScreen('walletCreateScreen')
            }
        },
        {
            element: '#import_wallet',
            listener: () => goToScreen('walletImportScreen')
        }
    ])
}