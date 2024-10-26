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

    static buildClaim(opts: {
        recipient: Address,
        redPacketIndex: number | bigint,
        uid: bigint,
        redPacketClaimServer: Cell
        queryId: bigint,
    }) {
        return beginCell()
            .storeUint(RouterWrapper.Opcodes.claim, 32)
            .storeUint(opts.queryId, 64)
            .storeRef(
                beginCell()
                    .storeAddress(opts.recipient)
                    .storeUint(opts.redPacketIndex, 64)
                    .storeUint(opts.uid, 64)
                    .storeRef(opts.redPacketClaimServer)
                    .endCell()
            )
            .endCell();
    }

    static buildClose(opts: {
        redPacketIndex: number | bigint,
        uid?: bigint,
        redPacketCloseServer: Cell,
        queryId: bigint,
        keyPair: KeyPair
    }) {

        let toSign = beginCell()
            .storeUint(opts.uid ?? 0n, 64)
            .storeRef(opts.redPacketCloseServer)
            .endCell()

        let sig = signCell(opts.keyPair, toSign)

        return beginCell()
            .storeUint(RouterWrapper.Opcodes.close, 32)
            .storeUint(opts.queryId, 64)
            .storeRef(
                beginCell()
                    .storeUint(opts.redPacketIndex, 64)
                    .storeUint(opts.uid ?? 0n, 64)
                    .storeRef(opts.redPacketCloseServer)
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

    async getRouterCreateTxFee(provider: ContractProvider/*, opts: { owner: Address }*/) {
        let res = await provider.get('get_router_create_tx_fee', []);

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

    async getLiquidity(provider: ContractProvider, opts: {
        liquidityId: bigint | number,
    }) {
        let res = await provider.get('get_liquidity', [
            {type: 'int', value: BigInt(opts.liquidityId)},
        ]);

        let liquidityAddress = res.stack.readAddress();

        return liquidityAddress;
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

    //===========getter nft

    async getCollectionData(provider: ContractProvider,) {
        let res = await provider.get('get_collection_data', []);

        let nextLiquidityId = res.stack.readBigNumber();
        let content = res.stack.readCell();
        let admin = res.stack.readAddress();

        return {
            nextLiquidityId,
            content,
            admin,
        };
    }

    async getNftAddressByIndex(provider: ContractProvider, opts: {
        liquidityId: bigint | number,
    }) {
        let res = await provider.get('get_nft_address_by_index', [
            {type: 'int', value: BigInt(opts.liquidityId)}
        ]);

        let liquidityAddress = res.stack.readAddress();

        return liquidityAddress;
    }

    async getNftContent(provider: ContractProvider, opts: {
        liquidityId: bigint | number,
        individualNftContent: Cell,
    }) {
        let res = await provider.get('get_nft_content', [
            {type: 'int', value: BigInt(opts.liquidityId)},
            {type: 'cell', cell: opts.individualNftContent},
        ]);

        let nftContent = res.stack.readCell();

        return nftContent;
    }

    //===========getter nft

}
