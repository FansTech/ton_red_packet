import { address, Address, beginCell, toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { WalletContractV4 } from "@ton/ton";
import { saveToFile } from "./save";
import { RouterWrapper } from "../adapters/Router.wrapper";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { addressZero, buildCodeDeployment } from "./utils";
import { WTonMinterWrapper } from "../adapters/WTonMinter.wrapper";
import { WTonWalletWrapper } from "../adapters/WTonWallet.wrapper";

export async function run(provider: NetworkProvider) {

    let save: Record<string, any> = {}
    save.network = provider.network()
    const router = address(`EQDosZXlMVgBKckXMkUFBPPo5yjT6HCHj0Z5qTH40vsoZfMn`)

    // wton 
    let wTonWalletCode = await compile(`WTonWallet`);
    let wTonMinterCode = await compile(`WTonMinter`);

    let wTonMinter = provider.open((
        WTonMinterWrapper.createFromConfig(
            {
                content: beginCell().storeUint(1, 1).endCell(),
                walletCode: wTonWalletCode,
            },
            wTonMinterCode
        )
    ));
    await wTonMinter.sendTx(
        provider.sender(),
        toNano('0.01'),
        WTonMinterWrapper.buildNothing()
    );
    await provider.waitForDeploy(wTonMinter.address);
    console.log(`wton: ${wTonMinter.address}`);
    const wTonAddress = wTonMinter.address


    // const wTonAddress = address(`EQCqa8bBrpnytxPbgjK6LtOJ8R_qLxtkwTwq_n1FtOROa2if`)
    let wTonWalletRouter = provider.open(
        WTonWalletWrapper.createFromConfig({
            owner: router,
            minter: wTonAddress,
            walletCode: wTonWalletCode
        },
            wTonWalletCode
        )
    );

    await wTonWalletRouter.sendTx(
        provider.sender(),
        toNano('0.1'),
        WTonWalletWrapper.buildNothing()
    );
    await provider.waitForDeploy(wTonWalletRouter.address);
    console.log(``)
}

