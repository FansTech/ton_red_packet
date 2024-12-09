import {Address, Cell, Contract, Transaction} from '@ton/core';
import {crc32str} from "./crc32";
import {Params} from "./Params";

export type ReportType = ReportCreate | ReportWithdraw | ReportRefund;

export interface ReportCreate {
    op: "create";
    tx: Transaction;
    packetType: number;
    token: Address;
    redPacketIndex: bigint,
    creator: Address,
    packetTypeName: `multipleAverage` | `multipleRandom`,
    totalSupply: bigint,
    totalPack: number,
    perfee: bigint,
    deadline: number,
}

export interface ReportWithdraw {
    op: "withdraw";
    tx: Transaction;
    token: Address;
    amount: bigint;
    recipient: Address;
    recipientUid: Cell;
    redPacketIndex: bigint;
}

export interface ReportRefund {
    op: "refund";
    tx: Transaction;
    token: Address;
    amount: bigint;
    recipient: Address;
    redPacketIndex: bigint;
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

        let packetIndex = cs.loadUintBig(64);
        let packetType = cs.loadUint(8);
        let totalPack = cs.loadUint(16);
        let token = cs.loadAddress();

        let totalSupply = cs.loadUintBig(256);
        let creator = cs.loadAddress();

        let subSlice1 = cs.loadRef().beginParse();

        let perfee = subSlice1.loadUintBig(256)
        let deadline = subSlice1.loadUint(32)

        let packetTypeName: `multipleAverage` | `multipleRandom` = `multipleAverage`
        if (packetType == Params.PacketTypeOp.multipleAverage) {

            packetTypeName = `multipleAverage`
        } else if (packetType == Params.PacketTypeOp.multipleRandom) {

            packetTypeName = `multipleRandom`
        } else {
            throw new Error(`failed to parse packet type`)
        }

        return {
            op: "create",
            tx: tx,
            packetType: packetType,
            token: token,
            redPacketIndex: packetIndex,
            creator,
            packetTypeName,
            totalSupply,
            totalPack,
            perfee,
            deadline,
        }
    }

    static parseReportWithdraw(param: Cell, tx: Transaction): ReportWithdraw {

        let cs = param.beginParse()

        let token = cs.loadAddress();
        let amount = cs.loadUintBig(256);
        let recipient = cs.loadAddress();
        let recipientUid = cs.loadRef();
        let redPacketIndex = cs.loadUintBig(64);

        return {
            op: "withdraw",
            tx,
            token,
            amount,
            recipient,
            recipientUid,
            redPacketIndex,
        }
    }

    static parseReportRefund(param: Cell, tx: Transaction): ReportRefund {

        let cs = param.beginParse()

        let token = cs.loadAddress();
        let amount = cs.loadUintBig(256);
        let recipient = cs.loadAddress();
        let redPacketIndex = cs.loadUintBig(64);

        return {
            op: "refund",
            tx,
            token,
            amount,
            recipient,
            redPacketIndex,
        }
    }

}
