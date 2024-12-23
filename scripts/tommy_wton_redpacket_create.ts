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
    const sender = provider.sender()
    if (!sender.address) {
        throw new Error("empty sender address")
    }
    let queryId = 0
    let id = 2
    let perfee = 10000000
    let totalPack = 1
    let supply = toNano(0.2)
    // let deadline = Date.parse(new Date().toString()) / 1000 + 3600 * 24;
    let deadline = Date.parse(new Date().toString()) / 1000 + 360;


    const routerAddress = address("EQAr0nmMC6f8mPmIVoyFZfjOuu5yXB2UR11xBE1cSVbmOaJl")
    const wtonAddress = address(`EQCqa8bBrpnytxPbgjK6LtOJ8R_qLxtkwTwq_n1FtOROa2if`)
    let serverKeyPair = await mnemonicToPrivateKey("scan taxi hockey learn saddle furnace grocery rhythm thrive husband noise park force program shine rib proud trigger spread where carpet season rocket online".split(` `)); // EQCq4U95YNJviVnaskaGVvf0dIfMx9xAQRZnDByEK3u4eeD1

    const router = provider.open(RouterWrapper.createFromAddress(routerAddress))
    const fee = await router.getRouterCreateTxFee({ perfee: perfee, totalPack: totalPack })
    console.log(`router tx fee ${fromNano(fee)}`)


    const wtonMinter = provider.open(WTonMinterWrapper.createFromAddress(wtonAddress))

    // const wTonWalletAddress = await wtonMinter.getWalletAddress(sender.address)
    // const wtonWallet = provider.open(WTonMinterWrapper.createFromAddress(wTonWalletAddress))


    const wTonWalletCode = await compile(`WTonWallet`);
    let wTonMinterCode = await compile(`WTonMinter`);

    const wTonWalletSender = provider.open(
        WTonWalletWrapper.createFromConfig({
            owner: sender.address,
            minter: wtonMinter.address,
            walletCode: wTonWalletCode
        },
            wTonWalletCode
        )
    );

    const wTonWalletRouter = provider.open(
        WTonWalletWrapper.createFromConfig({
            owner: router.address,
            minter: wtonMinter.address,
            walletCode: wTonWalletCode
        },
            wTonWalletCode
        )
    );
    const { body, tonAmount } = WTonWalletWrapper.buildTransfer(
        {
            queryId: queryId,
            jettonAmount: supply,
            toOwner: router.address,
            responseAddress: sender.address,
            forwardTonAmount: fee,
            forwardPayload: RouterWrapper.buildCreatePayload({
                createParam: Params.composeCreateParamSigned({
                    redPacketIndex: id,
                    packetData: {
                        op: "multipleAverage",
                        totalPack: totalPack,
                        deadline: deadline,
                    },
                    perfee: perfee,
                    serverCheck: {
                        queryId: queryId,
                        jettonRouterWallet: wTonWalletRouter.address,
                        redPacketSupply: supply,
                        router: routerAddress,
                    },
                    keyPair: serverKeyPair
                })
            }),
        }
    )

    await wTonWalletSender.sendTx(sender, tonAmount, body)
}