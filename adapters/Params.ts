import {Address, beginCell, Cell, Contract} from '@ton/core';
import {crc32str} from "./crc32";
import {signCell} from "../scripts/utils";
import {KeyPair} from "@ton/crypto/dist/primitives/nacl";

export type PacketType =
    Single
    | MultipleFixed
    | MultipleRandom
    | MultipleSpecific

export interface Single {
    op: "single",
    deadline: number,
}

export interface MultipleFixed {
    op: "multipleFixed",
    totalPack: number | bigint,
    deadline: number,
}

export interface MultipleRandom {
    op: "multipleRandom",
    totalPack: number | bigint,
    deadline: number,

}

export interface MultipleSpecific {
    op: "multipleSpecific",
    totalPack: number | bigint,
    deadline: number,
}

export class Params implements Contract {
    static readonly Opcodes = {
        create: crc32str(`op::router::create`),
    };
    public static readonly PacketTypeOp = {
        single: 1,
        multipleFixed: 2,
        multipleRandom: 3,
        multipleSpecific: 4,
    };

    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    public static composeCreateParamSigned(
        opts: {
            packetData: PacketType,
            uid: bigint | number,
            packetIndex: bigint | number,
            serverCheck: {
                jettonUserWallet: Address,
                router: Address,
                redPacketSupply: bigint | number,
            }
            keyPair: KeyPair
        }
    ) {


        let packetTypeOp = Params.PacketTypeOp[opts.packetData.op]


        let redPacketInit = null;
        if (opts.packetData.op == `single`) {
            redPacketInit = beginCell()
                .storeUint(opts.packetData.deadline, 32)
                .endCell()

        } else if (opts.packetData.op == "multipleFixed") {
            redPacketInit = beginCell()
                .storeUint(opts.packetData.totalPack, 16)
                .storeUint(opts.packetData.deadline, 32)
                .endCell()

        } else if (opts.packetData.op == "multipleRandom") {
            redPacketInit = beginCell()
                .storeUint(opts.packetData.totalPack, 16)
                .storeUint(opts.packetData.deadline, 32)
                .endCell()

        } else if (opts.packetData.op == "multipleSpecific") {
            redPacketInit = beginCell()
                .storeUint(opts.packetData.totalPack, 16)
                .storeUint(opts.packetData.deadline, 32)
                .endCell()

        } else {
            throw new Error(`unknown packet type`)
        }


        let createServerCheck = beginCell()
            .storeAddress(opts.serverCheck.jettonUserWallet)
            .storeAddress(opts.serverCheck.router)
            .storeUint(opts.packetIndex, 64)
            .storeUint(packetTypeOp, 8)
            .storeUint(opts.serverCheck.redPacketSupply, 256)
            .storeUint(opts.packetData.op === "single" ? 1 : opts.packetData.totalPack, 16)
            .storeUint(opts.packetData.deadline, 32)
            .storeUint(opts.uid, 64)


        let toSign = beginCell()
            .storeRef(createServerCheck)
            .endCell()

        let sig = signCell(opts.keyPair, toSign)

        return beginCell()
            .storeUint(opts.packetIndex, 64)
            .storeUint(packetTypeOp, 8)
            .storeRef(redPacketInit)
            .storeRef(createServerCheck)
            .storeUint(opts.uid, 64)
            .storeRef(
                beginCell()
                    .storeBuffer(sig)
                    .endCell()
            )
            .endCell()

    }

}
