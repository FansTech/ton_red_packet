import {Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode} from '@ton/core';
import {crc32str} from "./crc32";
import {KeyPair} from "@ton/crypto/dist/primitives/nacl";
import {signCell} from "../scripts/utils";

export class RouterWrapper implements Contract {
    static readonly Opcodes = {
        deploy: crc32str(`op::router::deploy`),
        init: crc32str(`op::router::init`),
        create: crc32str(`op::router::create`),
        claim: crc32str(`op::router::claim`),
        close: crc32str(`op::router::close`),
    };

    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new RouterWrapper(address);
    }

    static createFromConfig(config: {
        codeManagerPublicKey: bigint,
        ctx: number,
        routerAdmin: Address,
    }, code: Cell, workchain = 0) {
        const data = beginCell()
            .storeUint(config.codeManagerPublicKey, 256)
            .storeUint(0, 8)
            .storeUint(0, 8)
            .storeRef(
                //data cell
                beginCell()
                    .storeUint(config.ctx, 8)
                    .storeAddress(config.routerAdmin)
                    .endCell()
            )
            .endCell();
        const init = {code, data};
        return new RouterWrapper(contractAddress(workchain, init), init);
    }

    static buildDeploy(opts: {
        routerDeployment: Cell,
    }) {
        return beginCell()
            .storeUint(RouterWrapper.Opcodes.deploy, 32)
            .storeUint(0, 64)
            .storeRef(
                beginCell()
                    .storeRef(opts.routerDeployment)
                    .endCell()
            )
            .endCell();
    }

    static buildInit(opts: {
        reporter: Address,
        redPacketBaseCode: Cell,
        redPacketDeployment: Cell,
        serverPublicKey: bigint,
        server: Address,
    }) {
        return beginCell()
            .storeUint(RouterWrapper.Opcodes.init, 32)
            .storeUint(0, 64)
            .storeRef(
                beginCell()
                    .storeAddress(opts.reporter)
                    .storeRef(opts.redPacketBaseCode)
                    .storeRef(opts.redPacketDeployment)
                    .storeUint(opts.serverPublicKey, 256)
                    .storeAddress(opts.server)
                    .endCell()
            )
            .endCell();
    }

    static buildCreatePayload(opts: {
        createParam: Cell,
    }) {
        return beginCell()
            .storeUint(RouterWrapper.Opcodes.create, 32)
            .storeUint(0, 64)
            .storeRef(opts.createParam)
            .endCell();
    }

    static buildClaim(
        opts: Array<{
            subQueryId: bigint | number,
            redPacketIndex: number | bigint,
            recipient: Address,
            amount: bigint | number,
            recipientUid: Cell,
        }>,
        queryId: bigint | number = 0, //没什么用
    ) {

        if (opts.length == 0) {
            throw new Error("claim at least one request!")
        }

        let requests = opts.map(claimReq => {
            return beginCell()
                .storeUint(claimReq.subQueryId, 64)
                .storeUint(claimReq.redPacketIndex, 64)
                .storeAddress(claimReq.recipient)
                .storeUint(claimReq.amount, 256)
                .storeRef(claimReq.recipientUid)

        }).reverse()

        //第0个不需要挂载别人,只需要被挂载到第1个就可以了
        requests[0] = requests[0].storeMaybeRef(null);

        for (let index = 0; index < requests.length - 1; index++) {
            let current = requests[index];
            let next = requests[index + 1];

            next.storeMaybeRef(current.endCell());

            requests[index + 1] = next;
        }

        let last = requests[requests.length - 1].endCell();

        return beginCell()
            .storeUint(RouterWrapper.Opcodes.claim, 32)
            .storeUint(queryId, 64)
            .storeRef(
                last
            )
            .endCell();
    }

    static buildClose(opts: {
        redPacketIndex: number | bigint,
        refundAccount: Address,
        refundAmount: number | bigint,
        queryId: bigint,
        keyPair: KeyPair
    }) {

        let toSign = beginCell()
            .storeUint(opts.queryId, 64)
            .storeUint(opts.redPacketIndex, 64)
            .storeAddress(opts.refundAccount)
            .storeUint(opts.refundAmount, 256)
            .endCell()

        let sig = signCell(opts.keyPair, toSign)

        return beginCell()
            .storeUint(RouterWrapper.Opcodes.close, 32)
            .storeUint(opts.queryId, 64)
            .storeRef(
                beginCell()
                    .storeUint(opts.redPacketIndex, 64)
                    .storeAddress(opts.refundAccount)
                    .storeUint(opts.refundAmount, 256)
                    .storeRef(
                        beginCell()
                            .storeBuffer(sig)
                            .endCell()
                    )
                    .endCell()
            )
            .endCell();
    }

    async sendTx(provider: ContractProvider, via: Sender, value: bigint, body: Cell) {
        await provider.internal(via, {
            value: value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body,
        });
    }

    //===========fee

    async getRouterCreateTxFee(provider: ContractProvider, opts: { perfee: bigint | number, totalPack: bigint | number }) {
        let res = await provider.get('get_router_create_tx_fee', [
            {type: 'int', value: BigInt(opts.perfee)},
            {type: 'int', value: BigInt(opts.totalPack)},
        ]);

        let fee = res.stack.readBigNumber();

        return fee;
    }

    async getRouterClaimTxFee(provider: ContractProvider/*, opts: { owner: Address }*/) {
        let res = await provider.get('get_router_claim_tx_fee', [
            // {type: 'slice', cell: beginCell().storeAddress(opts.owner).endCell()}
        ]);

        let fee = res.stack.readBigNumber();

        return fee;
    }

    async getRouterCloseTxFee(provider: ContractProvider/*, opts: { owner: Address }*/) {
        let res = await provider.get('get_router_close_tx_fee', [
            // {type: 'slice', cell: beginCell().storeAddress(opts.owner).endCell()}
        ]);

        let fee = res.stack.readBigNumber();

        return fee;
    }

    //===========fee
    //===========getter

    async getBase(provider: ContractProvider,) {
        let res = await provider.get('get_base', []);


        let codeManagerPublicKey = res.stack.readBigNumber();
        let storageVersion = res.stack.readBigNumber();
        let codeVersion = res.stack.readBigNumber();

        let ctx = res.stack.readNumber();
        let routerAdmin = res.stack.readAddress();


        return {
            codeManagerPublicKey,
            storageVersion,
            codeVersion,

            ctx,
            routerAdmin,
        };
    }

    async getStorage(provider: ContractProvider,) {
        let res = await provider.get('get_storage', []);


        let ctx = res.stack.readNumber();
        let routerAdmin = res.stack.readAddress();
        let state = res.stack.readNumber();
        let reporter = res.stack.readAddress();

        let redPacketBaseCode = res.stack.readCell();
        let redPacketDeployment = res.stack.readCell();
        let serverPublicKey = res.stack.readBigNumber();
        let server = res.stack.readAddress();

        return {
            ctx,
            routerAdmin,
            state,
            reporter,

            redPacketBaseCode,
            redPacketDeployment,
            serverPublicKey,
            server,
        };
    }

    async getRedPacket(provider: ContractProvider, opts: {
        redPacketIndex: bigint | number,
    }) {
        let res = await provider.get('get_red_packet', [
            {type: 'int', value: BigInt(opts.redPacketIndex)},
        ]);

        let redPacketAddress = res.stack.readAddress();

        return redPacketAddress;
    }
}
