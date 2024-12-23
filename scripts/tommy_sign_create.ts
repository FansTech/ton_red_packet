import { PacketType } from '../adapters/Params';
import { compile, NetworkProvider } from '@ton/blueprint';
import { WTonWalletWrapper } from '../adapters/WTonWallet.wrapper';
import { address, Address, fromNano, toNano } from '@ton/core';
import { mnemonicToPrivateKey } from "@ton/crypto";
import { RouterWrapper } from '../adapters/Router.wrapper';
import { Params } from '../adapters/Params';
import { RedPacketWrapper } from '../adapters/RedPacket.wrapper';
import { JettonWalletWrapper } from '../adapters/JettonWallet.wrapper';
import { JettonMinterWrapper } from '../adapters/JettonMinter.wrapper';
import { WTonMinterWrapper } from '../adapters/WTonMinter.wrapper';

export async function run(provider: NetworkProvider) {
    let id = 2
    let perfee = 10000000
    let totalPack = 2
    let supply = toNano(0.2)
    let deadline = 1730088251;


    const routerAddress = address("EQAr0nmMC6f8mPmIVoyFZfjOuu5yXB2UR11xBE1cSVbmOaJl")
    const jettonAddress = address(`EQDJo4SdGFocukquMLiGUGZ8uHrZA7syQvNWUSN0vGJ_S6Zb`)
    let serverKeyPair = await mnemonicToPrivateKey("scan taxi hockey learn saddle furnace grocery rhythm thrive husband noise park force program shine rib proud trigger spread where carpet season rocket online".split(` `)); // EQCq4U95YNJviVnaskaGVvf0dIfMx9xAQRZnDByEK3u4eeD1

    console.log(`private: ${serverKeyPair.secretKey.toString('hex')}`)
    console.log(`public: ${serverKeyPair.publicKey.toString('hex')}`)

    const router = provider.open(RouterWrapper.createFromAddress(routerAddress))
    const fee = await router.getRouterCreateTxFee({ perfee: perfee, totalPack: totalPack })
    console.log(`router tx fee ${fromNano(fee)}`)

    const jettonMinter = provider.open(JettonMinterWrapper.createFromAddress(jettonAddress))

    const jettonWalletRouter = JettonWalletWrapper.createFromAddress(await jettonMinter.getWalletAddress(router.address))

    Params.composeCreateParamSigned({
        redPacketIndex: id,
        packetData: {
            op: "multipleAverage",
            totalPack: totalPack,
            deadline: deadline,
        },
        perfee: perfee,
        serverCheck: {
            queryId: id,
            jettonRouterWallet: jettonWalletRouter.address,
            redPacketSupply: supply,
            router: routerAddress,
        },
        keyPair: serverKeyPair
    })
}