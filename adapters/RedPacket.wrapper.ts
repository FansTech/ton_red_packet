import {Address, Cell, Contract, ContractProvider} from '@ton/core';

export class RedPacketWrapper implements Contract {
    static readonly State = {
        initializing: 0,
        normal: 1,
        finished: 2,
        refund: 3,
        refundButNotFinished: 4,
    };

    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new RedPacketWrapper(address);
    }

    //===========getter base
    async getBase(provider: ContractProvider,) {
        let res = await provider.get('get_base', []);


        let codeManagerPublicKey = res.stack.readBigNumber();
        let storageVersion = res.stack.readBigNumber();
        let codeVersion = res.stack.readBigNumber();

        let router = res.stack.readAddress();
        let redPacketIndex = res.stack.readBigNumber()

        return {
            codeManagerPublicKey,
            storageVersion,
            codeVersion,

            router,
            redPacketIndex,
        };
    }

    async getStorage(provider: ContractProvider) {
        let res = await provider.get('get_storage', []);

        let router = res.stack.readAddress();
        let redPacketIndex = res.stack.readBigNumber();
        let state = res.stack.readNumber();
        let packetType = res.stack.readNumber();

        let totalSupply = res.stack.readBigNumber();
        let remainingSupply = res.stack.readBigNumber();
        let totalPack = res.stack.readNumber();
        let remainingPack = res.stack.readNumber();

        let deadline = res.stack.readNumber();
        let creator = res.stack.readAddress();

        return {
            router,
            redPacketIndex,
            state,
            packetType,

            totalSupply,
            remainingSupply,
            totalPack,
            remainingPack,

            deadline,
            creator,
        };
    }

    async getState(provider: ContractProvider) {
        return await provider.getState()
    }

    //===========getter base
}
