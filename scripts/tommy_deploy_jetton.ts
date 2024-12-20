import { address, Address, beginCell, toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { WalletContractV4 } from "@ton/ton";
import { saveToFile } from "./save";
import { RouterWrapper } from "../adapters/Router.wrapper";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { addressZero, buildCodeDeployment } from "./utils";
import { JettonMinterWrapper } from '../adapters/JettonMinter.wrapper';

export async function run(provider: NetworkProvider) {
    const sender = provider.sender()
    if (!sender.address) {
        throw new Error("empty sender address")
    }
    let save: Record<string, any> = {}
    save.network = provider.network()
    const router = address(`EQBAs_bWOkVwIsAgo3TE4GzgJqERTY7mxj7YUjo3QNui6K4X`)

    // jwtton 
    let jwttonWalletCode = await compile(`JettonWallet`);
    let jwttonMinterCode = await compile(`JettonMinter`);


    let jettonMinter = provider.open((
        JettonMinterWrapper.createFromConfig(
            {
                admin: sender.address,
                content: beginCell().storeUint(0, 1).endCell(),
                wallet_code: jwttonWalletCode,
            },
            jwttonMinterCode,
        )
    ));

    await jettonMinter.sendTx(
        provider.sender(),
        toNano('0.01'),
        beginCell().endCell()
    );
    await provider.waitForDeploy(jettonMinter.address);
    console.log(`jetton token 部署成功: ${jettonMinter.address}`)



    // const txResult = await jettonMinter.sendMint(
    //     provider.sender(),
    //     {
    //         to_address: provider.sender().address!,
    //         jetton_amount: toNano(10_000_000_000),
    //         response_address: provider.sender().address!,
    //     }
    // );

    // console.log(`mint 10 token: ${txResult}`)
}

