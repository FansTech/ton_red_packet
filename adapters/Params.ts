import { Address, beginCell, Cell, Contract } from '@ton/core';
import { crc32str } from "./crc32";
import { signCell } from "../scripts/utils";
import { KeyPair } from "@ton/crypto/dist/primitives/nacl";

export type PacketType =
    | MultipleAverage
    | MultipleRandom

export interface MultipleAverage {
    op: "multipleAverage",
    totalPack: number | bigint,
    deadline: number,
}

export interface MultipleRandom {
    op: "multipleRandom",
    totalPack: number | bigint,
    deadline: number,

}

export class Params implements Contract {
    static readonly Opcodes = {
        create: crc32str(`op::router::create`),
    };
    public static readonly PacketTypeOp = {
        multipleAverage: 1,
        multipleRandom: 2,
    };

    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    public static composeCreateParamSigned(
        opts: {
            redPacketIndex: bigint | number,
            packetData: PacketType,
            perfee: bigint | number,
            serverCheck: {
                queryId: bigint | number,
                jettonRouterWallet: Address,
                redPacketSupply: bigint | number,
                router: Address,
            }
            keyPair: KeyPair
        }
    ) {

        let packetTypeOp = Params.PacketTypeOp[opts.packetData.op]

        let body = beginCell();

        body.storeUint(opts.redPacketIndex, 64)

        if (opts.packetData.op == "multipleAverage") {
            body.storeUint(packetTypeOp, 8)
                .storeUint(opts.packetData.totalPack, 16)
                .storeUint(opts.packetData.deadline, 32)

        } else if (opts.packetData.op == "multipleRandom") {
            body.storeUint(packetTypeOp, 8)
                .storeUint(opts.packetData.totalPack, 16)
                .storeUint(opts.packetData.deadline, 32)

        } else {
            throw new Error(`unknown packet type`)
        }

        body.storeUint(opts.perfee, 256)


        let createServerCheck = beginCell()
            .storeUint(opts.serverCheck.queryId, 64)
            .storeUint(opts.redPacketIndex, 64)
            .storeUint(packetTypeOp, 8)
            .storeUint(opts.packetData.totalPack, 16)
            .storeUint(opts.packetData.deadline, 32)
            .storeUint(opts.perfee, 256)
            .storeRef(
                beginCell()
                    .storeAddress(opts.serverCheck.jettonRouterWallet)
                    .storeUint(opts.serverCheck.redPacketSupply, 256)
                    .storeAddress(opts.serverCheck.router)
                    .endCell()
            )
            .endCell()

        let sig = signCell(opts.keyPair, createServerCheck);
        console.log(`sign hash: ${createServerCheck.hash().toString('hex')}`)
        console.log(`sign : ${sig.toString('hex')}`)

        return body
            .storeRef(
                beginCell()
                    .storeBuffer(sig)
                    .endCell()
            )
            .endCell()
    }

}
