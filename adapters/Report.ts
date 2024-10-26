import {Address, Cell, Contract, Transaction} from '@ton/core';
import {crc32str} from "./crc32";
import {Params} from "./Params";

export type ReportType = ReportCreate | ReportWithdraw | ReportRefund;

export interface ReportCreate {
    op: "create";
    tx: Transaction;
    uid: bigint;
    packetType: number;
    token: Address;
    amount: bigint;
    packetIndex: bigint,
    creator: Address,
    redPacketDataRaw: Cell;
    redPacketData: RedPacketData;
}

export interface ReportWithdraw {
    op: "withdraw";
    tx: Transaction;
    uid: bigint;
    token: Address;
    amount: bigint;
    recipient: Address;
    redPacketIndex: bigint;
}

export interface ReportRefund {
    op: "refund";
    tx: Transaction;
    uid: bigint;
    token: Address;
    amount: bigint;
    recipient: Address;
    redPacketIndex: bigint;
}

export type RedPacketData =
    RedPacketSingle
    | RedPacketMultipleFixed
    | RedPacketMultipleRandom
    | RedPacketMultipleSpecific

export interface RedPacketSingle {
    packetType: `single`,
    totalSupply: bigint,
    remainingSupply: bigint,
}

export interface RedPacketMultipleFixed {
    packetType: `multipleFixed`,
    totalSupply: bigint,
    remainingSupply: bigint,
    totalPack: number,
    remainingPack: number,
}

export interface RedPacketMultipleRandom {
    packetType: `multipleRandom`,
    totalSupply: bigint,
    remainingSupply: bigint,
    totalPack: number,
    remainingPack: number,
}

export interface RedPacketMultipleSpecific {
    packetType: `multipleSpecific`,
    totalSupply: bigint,
    remainingSupply: bigint,
    totalPack: number,
    remainingPack: number,
}

export class Report implements Contract {
    static readonly Opcodes = {
        unknown: 0,
        create: crc32str(`op::report::report_create`),
        withdraw: crc32str(`op::report::report_withdraw`),
        refund: crc32str(`op::report::report_refund`),
    };

    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    public static parseTransactions(txs: Array<Transaction>, routerAddress: Address): Array<ReportType> {
        let parsed = txs.map(tx => Report.parseTransaction(tx, routerAddress)).flat()
        //how to use filter to eliminate Null type?
        let ret: Array<ReportType> = [];
        for (let t of parsed) {
            if (t !== null) {
                ret.push(t)
            }
        }
        return ret;
    }

    public static parseTransaction(tx: Transaction, routerAddress: Address): ReportType | null {

        if (!!tx.inMessage) {

            let report = Report.parseMessageBody(tx.inMessage.body, tx)

            if (report !== null) {
                //found
                //check genuine
                let src = tx.inMessage.info.src as Address
                if (src.equals(routerAddress)) {
                    return report;
                } else {
                    return null;
                }
            }

        }

        return null;
    }

    static parseMessageBody(body: Cell, tx: Transaction): ReportType | null {

        let ret: ReportType | null = null;

        let bs = body.beginParse();

        if (32 <= bs.remainingBits) {
            let op = bs.loadUint(32)
            let queryId = bs.loadUint(64)

            if (op == Report.Opcodes.create) {
                ret = Report.parseReportCreate(bs.loadRef(), tx)
            } else if (op == Report.Opcodes.withdraw) {
                ret = Report.parseReportWithdraw(bs.loadRef(), tx)
            } else if (op == Report.Opcodes.refund) {
                ret = Report.parseReportRefund(bs.loadRef(), tx)
            }
        }

        return ret
    }

    static parseReportCreate(param: Cell, tx: Transaction): ReportCreate {

        let cs = param.beginParse()

        let uid = cs.loadUintBig(64);
        let packetType = cs.loadUint(8);
        let token = cs.loadAddress();
        let amount = cs.loadUintBig(256);
        let packetIndex = cs.loadUintBig(64);
        let creator = cs.loadAddress();

        let redPacketDataRaw = cs.loadRef();
        let redPacketData: RedPacketData | null = null

        if (packetType == Params.PacketTypeOp.single) {

            let cs = param.beginParse()
            let totalSupply = cs.loadUintBig(256);
            let remainingSupply = cs.loadUintBig(256);
            redPacketData = {
                packetType: `single`,
                totalSupply,
                remainingSupply,
            }
        } else if (packetType == Params.PacketTypeOp.multipleFixed) {

            let cs = param.beginParse()
            let totalSupply = cs.loadUintBig(256);
            let remainingSupply = cs.loadUintBig(256);
            let totalPack = cs.loadUint(8);
            let remainingPack = cs.loadUint(8);
            redPacketData = {
                packetType: `multipleFixed`,
                totalSupply,
                remainingSupply,
                totalPack,
                remainingPack,
            }
        } else if (packetType == Params.PacketTypeOp.multipleRandom) {

            let cs = param.beginParse()
            let totalSupply = cs.loadUintBig(256);
            let remainingSupply = cs.loadUintBig(256);
            let totalPack = cs.loadUint(8);
            let remainingPack = cs.loadUint(8);
            redPacketData = {
                packetType: `multipleRandom`,
                totalSupply,
                remainingSupply,
                totalPack,
                remainingPack,
            }
        } else if (packetType == Params.PacketTypeOp.multipleSpecific) {

            let cs = param.beginParse()
            let totalSupply = cs.loadUintBig(256);
            let remainingSupply = cs.loadUintBig(256);
            let totalPack = cs.loadUint(8);
            let remainingPack = cs.loadUint(8);
            redPacketData = {
                packetType: `multipleSpecific`,
                totalSupply,
                remainingSupply,
                totalPack,
                remainingPack,
            }
        }

        if (!redPacketData) {
            throw new Error(`failed to parse packet data`)
        }


        return {
            op: "create",
            tx: tx,
            uid: uid,
            packetType: packetType,
            token: token,
            amount: amount,
            packetIndex,
            creator,
            redPacketDataRaw: redPacketDataRaw,
            redPacketData: redPacketData,
        }
    }

    static parseReportWithdraw(param: Cell, tx: Transaction): ReportWithdraw {

        let cs = param.beginParse()

        let uid = cs.loadUintBig(64);
        let token = cs.loadAddress();
        let amount = cs.loadUintBig(256);
        let recipient = cs.loadAddress();
        let redPacketIndex = cs.loadUintBig(64);

        return {
            op: "withdraw",
            tx,
            uid,
            token,
            amount,
            recipient,
            redPacketIndex,
        }
    }

    static parseReportRefund(param: Cell, tx: Transaction): ReportRefund {

        let cs = param.beginParse()

        let uid = cs.loadUintBig(64);
        let token = cs.loadAddress();
        let amount = cs.loadUintBig(256);
        let recipient = cs.loadAddress();
        let redPacketIndex = cs.loadUintBig(64);

        return {
            op: "refund",
            tx,
            uid,
            token,
            amount,
            recipient,
            redPacketIndex,
        }
    }

}
