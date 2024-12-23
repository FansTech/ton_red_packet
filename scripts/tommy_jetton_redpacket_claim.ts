import { PacketType } from '../adapters/Params';
import { compile, NetworkProvider } from '@ton/blueprint';
import { WTonWalletWrapper } from '../adapters/WTonWallet.wrapper';
import { address, Address, fromNano, toNano, beginCell } from '@ton/core';
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
    let receipt = address(`EQC1Z3V5mE5dZmlf38-0-TzC_pHk08QkknunCLC_0-uQLVjQ`)
    let amount = toNano(0.1)


    const routerAddress = address("EQDosZXlMVgBKckXMkUFBPPo5yjT6HCHj0Z5qTH40vsoZfMn")
    const router = provider.open(RouterWrapper.createFromAddress(routerAddress))
    const fee = await router.getRouterClaimTxFee()
    console.log(`router tx fee ${fromNano(fee)}`)


    const body = RouterWrapper.buildClaim(
        [
            {
                subQueryId: queryId,
                redPacketIndex: id,
                recipient: receipt,
                amount: amount, //服务器指定
                recipientUid: beginCell().storeUint(1, 64).endCell()
            }
        ]
    )

    await router.sendTx(sender, fee, body)
}