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


    console.log(`deployer: ${provider.sender().address}`)
    const deployer = provider.sender().address!!

    //reporter address, 汇报
    let reporter = address(`EQCIYJ8kChj5d9HsR-zpeuNvEKDS20Xb9ZnqTrmIpU5JwiG1`)
    // EQBOTU-Q7aWJ0rd3SlFal_XMPG9JkGR4wcHMIZPNJC8xIKW6 //  [
    //   "scan", "taxi", "hockey", "learn", "saddle", "furnace", "grocery", "rhythm", "thrive", "husband", "noise",
    //   "park", "force", "program", "shine", "rib", "proud", "trigger", "spread", "where", "carpet", "season",
    //   "rocket", "online"
    // ]
    // 代领地址 
    let serverKeyPair = await mnemonicToPrivateKey("scan taxi hockey learn saddle furnace grocery rhythm thrive husband noise park force program shine rib proud trigger spread where carpet season rocket online".split(` `)); // EQCq4U95YNJviVnaskaGVvf0dIfMx9xAQRZnDByEK3u4eeD1
    let server = WalletContractV4.create({ workchain: 0, publicKey: serverKeyPair.publicKey }).address

    //give a mnemonic for code manager, you had better to load it from .env
    // 部署者
    let codeManagerKeyPair = await mnemonicToPrivateKey("manage laundry pair dignity remove word entry token eyebrow will say cash cricket nurse relief salt ahead home inmate rate hold corn winter kingdom".split(` `)); // EQCq4U95YNJviVnaskaGVvf0dIfMx9xAQRZnDByEK3u4eeD1
    let codeManagerPublicKey = BigInt(`0x` + codeManagerKeyPair.publicKey.toString(`hex`));

    let routerBaseCode = await compile("Router0");
    let routerDeployment = buildCodeDeployment(codeManagerKeyPair, 1, await compile("Router1"));
    let redPacketBaseCode = await compile("RedPacket0");
    let redPacketDeployment = buildCodeDeployment(codeManagerKeyPair, 1, await compile("RedPacket1"));

    let router = provider.open((
        RouterWrapper.createFromConfig(
            {
                codeManagerPublicKey: codeManagerPublicKey,
                ctx: Math.floor(Math.random() * 1000) % (2 ** 8),
                routerAdmin: deployer
            },
            routerBaseCode,
        )
    ));

    // 部署
    await router.sendTx(
        provider.sender(),
        toNano('0.1'),
        RouterWrapper.buildDeploy({
            routerDeployment
        })
    );
    await provider.waitForDeploy(router.address);

    console.log(`router ${router.address} dont forget to check tonview to see the tx is successful`);
    save[`router`] = router.address.toString()
    await saveToFile(save, `deployRouter`, false, provider)

    // 初始化
    await router.sendTx(
        provider.sender(),
        toNano('0.1'),
        RouterWrapper.buildInit({
            reporter: reporter,
            redPacketBaseCode,
            redPacketDeployment,
            serverPublicKey: BigInt("0x" + serverKeyPair.publicKey.toString('hex')),
            server: server,
        })
    );

    console.log(`router 部署完成: ${router.address}`);
}

