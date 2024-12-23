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
    let receipt = address(`EQC-1W9Tq2eCV1pRkksJ63lVxuOCgL_kvIIV01GCBxqNj40p`)
    let amount = toNano(0.1)


    const routerAddress = address("EQC9ILYLSq1U00KY8pBAwalNg2bb0flEPvRT9yOvAoyqOtL_")
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