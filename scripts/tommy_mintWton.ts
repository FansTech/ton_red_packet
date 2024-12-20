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

    const wtonAddress = address(`EQCqa8bBrpnytxPbgjK6LtOJ8R_qLxtkwTwq_n1FtOROa2if`)


    const jtMinter = provider.open(JettonMinterWrapper.createFromAddress(wtonAddress))
    await jtMinter.sendMint(sender, {
        to_address: sender.address,
        jetton_amount: toNano(2_000_000_000),
        response_address: sender.address
    })
}