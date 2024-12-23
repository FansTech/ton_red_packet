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
    let refund = address(`EQAl1Fo694JbnR86_l6Ox2d2_voeTRJw3Em4s0dCn3_8pDab`)
    let amount = toNano(0.1)


    let serverKeyPair = await mnemonicToPrivateKey("scan taxi hockey learn saddle furnace grocery rhythm thrive husband noise park force program shine rib proud trigger spread where carpet season rocket online".split(` `)); // EQCq4U95YNJviVnaskaGVvf0dIfMx9xAQRZnDByEK3u4eeD1

    console.log(`private: ${serverKeyPair.secretKey.toString('hex')}`)
    console.log(`public: ${serverKeyPair.publicKey.toString('hex')}`)


    RouterWrapper.buildClose(
        {
            queryId: BigInt(id),
            redPacketIndex: id,
            refundAccount: refund,
            refundAmount: amount,//服务器指定
            keyPair: serverKeyPair
        },
    );
}