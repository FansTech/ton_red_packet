import {Address, Cell, Contract, ContractProvider} from '@ton/core';

export class RedPacketWrapper implements Contract {
    static readonly State = {
        initializing: 0,
        normal: 1,
        finished: 2,
        refundButNotFinished: 3,
        refundedAndFinished: 4,
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

        let creator = res.stack.readAddress();
        let totalSupply = res.stack.readBigNumber();
        let remainingSupply = res.stack.readBigNumber();
        let totalPack = res.stack.readBigNumber();

        let deadline = res.stack.readNumber();

        return {
            router,
            redPacketIndex,
            state,
            packetType,

            creator,
            totalSupply,
            remainingSupply,
            totalPack,

            deadline,
        };
    }

    async getState(provider: ContractProvider) {
        return await provider.getState()
    }

    //===========getter base
}
