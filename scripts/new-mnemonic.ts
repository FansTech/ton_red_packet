import { mnemonicToPrivateKey, sha256, mnemonicNew } from "@ton/crypto";
import { WalletContractV4 } from "@ton/ton";
import { Address, beginCell, Cell, Slice } from "@ton/core";
import { sha256_sync, sign } from "@ton/crypto";
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';

export async function main() {

    const ownerMnemonic = await mnemonicNew(24)
    const ownerKeyPair = await mnemonicToPrivateKey(ownerMnemonic);
    console.log("owner private:", ownerMnemonic)
    console.log("owner:", WalletContractV4.create({ workchain: 0, publicKey: ownerKeyPair.publicKey }).address)


    const reportMnemonic = await mnemonicNew(24)
    const reportKeyPair = await mnemonicToPrivateKey(reportMnemonic);
    console.log("report private:", reportMnemonic)
    console.log("report:", WalletContractV4.create({ workchain: 0, publicKey: reportKeyPair.publicKey }).address)


    // const serverKeyPair = await mnemonicToPrivateKey('style multiply shell drama remember zoo escape favorite wasp social board possible crisp false swap baby diamond eagle dawn hurt artist random daring example'.split(` `));

    // console.log(WalletContractV4.create({ workchain: 0, publicKey: serverKeyPair.publicKey }).address)

    // console.log("secretKey: ", serverKeyPair.secretKey.toString("hex"))

    // let toSign = beginCell()
    //     .storeUint(1111, 64)
    //     .endCell()

    // let sig = sign(toSign.hash(), serverKeyPair.secretKey);
    // console.log("hash: ", toSign.hash().toString("hex"))
    // console.log("sig: ", sig.toString("hex"))


    // const blockchain = await Blockchain.create()
    // const bob = await blockchain.treasury('valve speak pulse glue unfold cloth reunion movie valve celery path setup pottery tiny wait excite develop wage lend silver zero bacon hip impulse')
    // console.log(bob.address)

}

main()