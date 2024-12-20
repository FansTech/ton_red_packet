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
    let id = 1
    let receipt = address(`EQC1Z3V5mE5dZmlf38-0-TzC_pHk08QkknunCLC_0-uQLVjQ`)
    let amount = toNano(0.001)


    const routerAddress = address("EQBAs_bWOkVwIsAgo3TE4GzgJqERTY7mxj7YUjo3QNui6K4X")
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
                recipientUid: beginCell().storeUint(1, 10).endCell()
            }
        ]
    )

    await router.sendTx(sender, fee, body)
}