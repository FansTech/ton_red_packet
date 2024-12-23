import { BigNumber } from 'bignumber.js'
import Decimal from "decimal.js";
import { KeyPair } from "@ton/crypto/dist/primitives/nacl";
import { Address, beginCell, Cell, Slice } from "@ton/core";
import { sha256_sync, sign } from "@ton/crypto";

export const addressZero = Address.parse(`EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c`)

export async function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function sha256(input: Buffer): bigint {
    return BigInt('0x' + sha256_sync(input).toString('hex'))
}

export function addressHash(input: Address): bigint {
    let dataSha256 = beginCell().storeAddress(input).endCell().hash();
    return BigInt(`0x` + dataSha256.toString(`hex`));
}

export function buildCodeDeployment(codeManager: KeyPair, codeVersion: bigint | number, code: Cell) {

    let codePack = beginCell()
        .storeUint(codeVersion, 8)
        .storeRef(code)
        .endCell();

    let sig = sign(codePack.hash(), codeManager.secretKey);

    let codeDeployment = beginCell()
        .storeRef(
            beginCell()
                .storeBuffer(sig)
                .endCell()
        )
        .storeRef(
            codePack
        )
        .endCell();

    return codeDeployment;
}


export function signCell(keyPair: KeyPair, toSign: Cell) {

    let sig = sign(toSign.hash(), keyPair.secretKey);

    return sig;
}
