import {Blockchain, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {Address, beginCell, Cell, fromNano, toNano} from '@ton/core';
import '@ton/test-utils';
import {compile} from "@ton/blueprint";
import {RouterWrapper} from "../adapters/Router.wrapper";
import {RedPacketWrapper} from "../adapters/RedPacket.wrapper";
import {JettonMinterWrapper} from "../adapters/JettonMinter.wrapper";
import {JettonWalletWrapper} from "../adapters/JettonWallet.wrapper";
import {WTonMinterWrapper} from "../adapters/WTonMinter.wrapper";
import {WTonWalletWrapper} from "../adapters/WTonWallet.wrapper";
import {addressHash, addressZero, buildCodeDeployment, signCell,} from "../scripts/utils";
import {Params} from "../adapters/Params";
import {KeyPair} from "@ton/crypto/dist/primitives/nacl";
import {mnemonicToPrivateKey, sha256} from "@ton/crypto";
import {RedPacketMultipleFixed, Report, ReportCreate, ReportRefund, ReportWithdraw} from "../adapters/Report";

describe('Router', () => {

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let reporter: SandboxContract<TreasuryContract>;
    let alice: SandboxContract<TreasuryContract>;
    let bob: SandboxContract<TreasuryContract>;
    let carlos: SandboxContract<TreasuryContract>;
    let server: SandboxContract<TreasuryContract>;

    let routerBaseCode: Cell;
    let routerDeployment: Cell;
    let redPacketBaseCode: Cell;
    let redPacketDeployment: Cell;
    let wTonWalletCode: Cell

    let codeManagerKeyPair: KeyPair;
    let codeManagerPublicKey: bigint;

    let serverKeyPair: KeyPair;
    let serverPublicKey: bigint;

    let router: SandboxContract<RouterWrapper>;
    let redPacket: SandboxContract<RedPacketWrapper>;

    let jettonMinter: SandboxContract<JettonMinterWrapper>;
    let wTonMinter: SandboxContract<WTonMinterWrapper>;

    let jettonWalletRouter: SandboxContract<JettonWalletWrapper>
    let jettonWalletAlice: SandboxContract<JettonWalletWrapper>
    let jettonWalletBob: SandboxContract<JettonWalletWrapper>
    let jettonWalletCarlos: SandboxContract<JettonWalletWrapper>

    let wTonWalletRouter: SandboxContract<WTonWalletWrapper>
    let wTonWalletAlice: SandboxContract<WTonWalletWrapper>
    let wTonWalletBob: SandboxContract<WTonWalletWrapper>
    let wTonWalletCarlos: SandboxContract<WTonWalletWrapper>

    let redPacketSingle: SandboxContract<RedPacketWrapper>
    let redPacketMultipleFixed: SandboxContract<RedPacketWrapper>
    let redPacketMultipleRandom: SandboxContract<RedPacketWrapper>
    let redPacketMultipleFixedRefund: SandboxContract<RedPacketWrapper>
    let redPacketMultipleSpecific: SandboxContract<RedPacketWrapper>

    let queryId = 1n;
    let packetIndex = 0n;

    beforeAll(async () => {
        try {
            blockchain = await Blockchain.create();
            blockchain.verbosity = {
                print: true,
                blockchainLogs: false,
                vmLogs: `none`,
                debugLogs: true,
                // debugLogs: false,
            }

            deployer = await blockchain.treasury('test test test test test test test test test test test deployer');
            reporter = await blockchain.treasury('test test test test test test test test test test test reporter');
            alice = await blockchain.treasury('test test test test test test test test test test test alice');
            bob = await blockchain.treasury('test test test test test test test test test test test bob');
            carlos = await blockchain.treasury('test test test test test test test test test test test carlos');
            server = await blockchain.treasury('test test test test test test test test test test test server');

            codeManagerKeyPair = await mnemonicToPrivateKey('test test test test test test test test test test test code'.split(` `));
            codeManagerPublicKey = BigInt(`0x` + codeManagerKeyPair.publicKey.toString(`hex`));

            routerBaseCode = await compile("Router0");
            routerDeployment = buildCodeDeployment(codeManagerKeyPair, 1, await compile("Router1"));
            redPacketBaseCode = await compile("RedPacket0");
            redPacketDeployment = buildCodeDeployment(codeManagerKeyPair, 1, await compile("RedPacket1"));

            serverKeyPair = await mnemonicToPrivateKey('test test test test test test test test test test test server'.split(` `));
            serverPublicKey = BigInt(`0x` + serverKeyPair.publicKey.toString(`hex`));


            router = blockchain.openContract(
                RouterWrapper.createFromConfig(
                    {
                        codeManagerPublicKey: codeManagerPublicKey,
                        ctx: 0,
                        routerAdmin: deployer.address
                    },
                    routerBaseCode
                )
            );

            let txResult = await router.sendTx(
                deployer.getSender(),
                toNano('0.01'),
                RouterWrapper.buildDeploy({
                    routerDeployment
                })
            );
            expect(txResult.transactions).not.toHaveTransaction({
                success: false,
            });

            txResult = await router.sendTx(
                deployer.getSender(),
                toNano('0.01'),
                RouterWrapper.buildInit({
                    reporter: reporter.address,
                    redPacketBaseCode,
                    redPacketDeployment,
                    serverPublicKey: serverPublicKey,
                    server: server.address,
                })
            );
            expect(txResult.transactions).not.toHaveTransaction({
                success: false,
            });
            let routerBase = await router.getBase();
            expect(routerBase.codeVersion).toEqual(1n)
            expect(routerBase.storageVersion).toEqual(1n)

            let routerStorage = await router.getStorage();
            expect(routerStorage.state).toEqual(1)

            {
                let jettonWalletCode = await compile(`JettonWallet`);
                let jettonMinterCode = await compile(`JettonMinter`);

                jettonMinter = blockchain.openContract(
                    JettonMinterWrapper.createFromConfig(
                        {
                            admin: deployer.address,
                            content: beginCell().storeUint(0, 1).endCell(),
                            wallet_code: jettonWalletCode,
                        },
                        jettonMinterCode
                    )
                );
                txResult = await jettonMinter.sendTx(
                    deployer.getSender(),
                    toNano('0.01'),
                    beginCell().endCell()
                );
                expect(txResult.transactions).not.toHaveTransaction({
                    success: false,
                });

                for (let receiver of [alice.address, bob.address, carlos.address]) {
                    txResult = await jettonMinter.sendMint(
                        deployer.getSender(),
                        {
                            to_address: receiver,
                            jetton_amount: toNano(1_000_000_000),
                            response_address: receiver,
                        }
                    );
                    expect(txResult.transactions).not.toHaveTransaction({
                        success: false,
                    });
                }

                jettonWalletRouter = blockchain.openContract(JettonWalletWrapper.createFromAddress(await jettonMinter.getWalletAddress(router.address)));
                jettonWalletAlice = blockchain.openContract(JettonWalletWrapper.createFromAddress(await jettonMinter.getWalletAddress(alice.address)));
                jettonWalletBob = blockchain.openContract(JettonWalletWrapper.createFromAddress(await jettonMinter.getWalletAddress(bob.address)));
                jettonWalletCarlos = blockchain.openContract(JettonWalletWrapper.createFromAddress(await jettonMinter.getWalletAddress(carlos.address)));

            }
            {

                wTonWalletCode = await compile(`WTonWallet`);
                let wTonMinterCode = await compile(`WTonMinter`);

                wTonMinter = blockchain.openContract(
                    WTonMinterWrapper.createFromConfig(
                        {
                            content: beginCell().storeUint(1, 1).endCell(),
                            walletCode: wTonWalletCode,
                        },
                        wTonMinterCode
                    )
                );
                txResult = await wTonMinter.sendTx(
                    deployer.getSender(),
                    toNano('0.01'),
                    WTonMinterWrapper.buildNothing()
                );
                expect(txResult.transactions).not.toHaveTransaction({
                    success: false,
                });
            }
            {
                jettonWalletRouter = blockchain.openContract(
                    JettonWalletWrapper.createFromAddress(
                        await jettonMinter.getWalletAddress(router.address)
                    )
                );
                jettonWalletAlice = blockchain.openContract(
                    JettonWalletWrapper.createFromAddress(
                        await jettonMinter.getWalletAddress(alice.address)
                    )
                );
                jettonWalletBob = blockchain.openContract(
                    JettonWalletWrapper.createFromAddress(
                        await jettonMinter.getWalletAddress(bob.address)
                    )
                );
                jettonWalletCarlos = blockchain.openContract(
                    JettonWalletWrapper.createFromAddress(
                        await jettonMinter.getWalletAddress(carlos.address)
                    )
                );
            }


            wTonWalletRouter = blockchain.openContract(
                WTonWalletWrapper.createFromConfig({
                        owner: router.address,
                        minter: wTonMinter.address,
                        walletCode: wTonWalletCode
                    },
                    wTonWalletCode
                )
            );
            //init it now
            txResult = await wTonWalletRouter.sendTx(
                deployer.getSender(),
                toNano('1'),
                WTonWalletWrapper.buildNothing()
            );
            expect(txResult.transactions).not.toHaveTransaction({
                success: false,
            });

            wTonWalletAlice = blockchain.openContract(
                WTonWalletWrapper.createFromConfig({
                        owner: alice.address,
                        minter: wTonMinter.address,
                        walletCode: wTonWalletCode
                    },
                    wTonWalletCode
                )
            );
            wTonWalletBob = blockchain.openContract(
                WTonWalletWrapper.createFromConfig({
                        owner: bob.address,
                        minter: wTonMinter.address,
                        walletCode: wTonWalletCode
                    },
                    wTonWalletCode
                )
            );
            wTonWalletCarlos = blockchain.openContract(
                WTonWalletWrapper.createFromConfig({
                        owner: carlos.address,
                        minter: wTonMinter.address,
                        walletCode: wTonWalletCode
                    },
                    wTonWalletCode
                )
            );

        } catch (e) {
            console.log(`beforeAll fails: ${e}`)
            throw e;
        }
    });

    beforeEach(async () => {
    });

    // it('nothing', async () =>{})
    it('alice create wTon pocket single', async () => {

        console.log(`=============================================alice create wTon pocket single=============================================`)

        let createTxFee = await router.getRouterCreateTxFee();
        console.log(`createTxFee ${fromNano(createTxFee)}`)


        let {body, tonAmount} = WTonWalletWrapper.buildTransfer(
            {
                queryId: queryId++,
                jettonAmount: toNano(10),
                toOwner: router.address,
                responseAddress: alice.address,
                forwardTonAmount: createTxFee,
                forwardPayload: RouterWrapper.buildCreatePayload({
                    createParam: Params.composeCreateParamSigned(
                        {
                            packetData: {
                                op: "single",
                                deadline: 1730779273,
                            },
                            uid: 1234n,
                            packetIndex: packetIndex++,
                            serverCheck: {
                                jettonUserWallet: wTonWalletRouter.address,
                                router: router.address,
                                redPacketSupply: toNano(10)
                            },
                            keyPair: serverKeyPair
                        }
                    )
                }),
            }
        );

        let txResult = await wTonWalletAlice.sendTx(
            alice.getSender(),
            tonAmount,
            body
        );
        expect(txResult.transactions).not.toHaveTransaction({
            success: false,
        });

        let redPacketAddress = await router.getRedPacket({redPacketIndex: 0})
        redPacketSingle = await blockchain.openContract(RedPacketWrapper.createFromAddress(redPacketAddress))
        expect((await redPacketSingle.getState()).state.type).toEqual(`active`)
        expect((await redPacketSingle.getStorage()).state).toEqual(RedPacketWrapper.State.normal)
        expect((await redPacketSingle.getStorage()).packetType).toEqual(Params.PacketTypeOp[`single`])
        expect((await redPacketSingle.getStorage()).totalSupply).toEqual(toNano(10))

        //初始化时给到了1Ton,收到10Ton+一点gasFee,
        expect((await wTonWalletRouter.getWalletData())?.balance).toBeGreaterThan(toNano(10) + toNano(1))

        let report = Report.parseTransactions(txResult.transactions, router.address);
        expect(report.length).toEqual(1)
        expect(report[0].op).toEqual(`create`)
        expect((report[0] as ReportCreate).packetType).toEqual(Params.PacketTypeOp.single)
        expect((report[0] as ReportCreate).redPacketData.packetType).toEqual(`single`)
        expect((report[0] as ReportCreate).packetIndex).toEqual(0n)
    })

    it('server on behalf of bob claim redPacket single', async () => {

        console.log(`=============================================server on behalf of bob claim redPacket single=============================================`)

        let claimTxFee = await router.getRouterClaimTxFee();
        console.log(`claimTxFee ${fromNano(claimTxFee)}`)

        let bobBalanceBefore = await bob.getBalance()
        console.log(`bobBalanceBefore ${fromNano(bobBalanceBefore)}`)

        let body = RouterWrapper.buildClaim(
            {
                recipient: bob.address,
                redPacketIndex: 0,
                queryId: queryId++,
                uid: 412341234n,
                redPacketClaimServer: beginCell().endCell()
            }
        );

        let txResult = await router.sendTx(
            server.getSender(),
            claimTxFee,
            body
        );
        expect(txResult.transactions).not.toHaveTransaction({
            success: false,
        });

        expect((await redPacketSingle.getStorage()).state).toEqual(RedPacketWrapper.State.finished)
        expect((await redPacketSingle.getStorage()).totalSupply).toEqual(toNano(10))
        expect((await redPacketSingle.getStorage()).remainingSupply).toEqual(toNano(0))
        expect((await redPacketSingle.getStorage()).totalPack).toEqual(0)
        expect((await redPacketSingle.getStorage()).remainingPack).toEqual(0)


        let bobBalanceAfter = await bob.getBalance()
        console.log(`bobBalanceAfter ${fromNano(bobBalanceAfter)}`)
        //fwd会耗费掉一点fwd_fee
        expect(toNano(10) - (bobBalanceAfter - bobBalanceBefore)).toBeLessThan(toNano(0.001))

        let report = Report.parseTransactions(txResult.transactions, router.address);
        expect(report.length).toEqual(1)
        expect(report[0].op).toEqual(`withdraw`)
        expect(bob.address.equals((report[0] as ReportWithdraw).recipient)).toBeTruthy()
        expect((report[0] as ReportWithdraw).redPacketIndex).toEqual(0n)
    })

    it('bob create wTon pocket multiple fixed', async () => {

        console.log(`=============================================bob create wTon pocket multiple fixed=============================================`)

        let createTxFee = await router.getRouterCreateTxFee();
        console.log(`createTxFee ${fromNano(createTxFee)}`)

        const uid = 51234123n;
        const deadline = 1730779273;
        let {body, tonAmount} = WTonWalletWrapper.buildTransfer(
            {
                queryId: queryId++,
                jettonAmount: toNano(4),
                toOwner: router.address,
                responseAddress: bob.address,
                forwardTonAmount: createTxFee,
                forwardPayload: RouterWrapper.buildCreatePayload({
                    createParam: Params.composeCreateParamSigned(
                        {
                            packetData: {
                                op: "multipleFixed",
                                totalPack: 2,
                                deadline,
                            },
                            uid,
                            packetIndex: packetIndex++,
                            serverCheck: {
                                jettonUserWallet: wTonWalletRouter.address,
                                router: router.address,
                                redPacketSupply: toNano(4)
                            },
                            keyPair: serverKeyPair
                        }
                    ),

                }),
            }
        );

        let txResult = await wTonWalletBob.sendTx(
            bob.getSender(),
            tonAmount,
            body
        );
        expect(txResult.transactions).not.toHaveTransaction({
            success: false,
        });

        const redPacketIndex = 1n;
        let redPacketAddress = await router.getRedPacket({redPacketIndex})
        redPacketMultipleFixed = await blockchain.openContract(RedPacketWrapper.createFromAddress(redPacketAddress))
        expect((await redPacketMultipleFixed.getState()).state.type).toEqual(`active`)
        expect((await redPacketMultipleFixed.getStorage()).state).toEqual(RedPacketWrapper.State.normal)
        expect((await redPacketMultipleFixed.getStorage()).packetType).toEqual(Params.PacketTypeOp[`multipleFixed`])
        expect((await redPacketMultipleFixed.getStorage()).totalSupply).toEqual(toNano(4))
        expect((await redPacketMultipleFixed.getStorage()).totalPack).toEqual(2)
        expect((await redPacketMultipleFixed.getStorage()).remainingPack).toEqual(2)

        let report = Report.parseTransactions(txResult.transactions, router.address);
        expect(report.length).toEqual(1);
        expect(report[0].op).toEqual(`create`)
        let reportCreate = report[0] as ReportCreate;
        expect(reportCreate.uid).toEqual(uid);
        expect(reportCreate.packetType).toEqual(Params.PacketTypeOp[`multipleFixed`]);
        expect(reportCreate.token.equals(wTonWalletRouter.address)).toEqual(true);
        expect(reportCreate.amount).toEqual(toNano(4));
        expect(reportCreate.packetIndex).toEqual(redPacketIndex);
        expect(reportCreate.redPacketData.packetType).toEqual(`multipleFixed`);
        expect(reportCreate.redPacketData.totalSupply).toEqual(toNano(4));
        expect(reportCreate.redPacketData.remainingSupply).toEqual(toNano(4));
        expect((reportCreate.redPacketData as RedPacketMultipleFixed).totalPack).toEqual(2);
        expect((reportCreate.redPacketData as RedPacketMultipleFixed).remainingPack).toEqual(2);
        expect((reportCreate.redPacketData as RedPacketMultipleFixed).deadline).toEqual(deadline);

        //初始化时给到了1Ton,收到10Ton+一点gasFee,又取走了,消耗了一点gas,有收到了4ton
        expect((await wTonWalletRouter.getWalletData())?.balance).toBeGreaterThan(toNano(4) + toNano(1))

    })

    it('server on behalf of alice and carlos claim redPacket multiple fixed', async () => {

        console.log(`=============================================server on behalf of alice and carlos claim redPacket multiple fixed=============================================`)

        let claimTxFee = await router.getRouterClaimTxFee();
        console.log(`claimTxFee ${fromNano(claimTxFee)}`)

        {

            let aliceBalanceBefore = await alice.getBalance()
            console.log(`aliceBalanceBefore ${fromNano(aliceBalanceBefore)}`)

            //第一次给alice取走,但是还没有取完
            let body = RouterWrapper.buildClaim(
                {
                    recipient: alice.address,
                    redPacketIndex: 1,
                    queryId: queryId++,
                    uid: 9778940123n,
                    redPacketClaimServer: beginCell().endCell()
                }
            );

            let txResult = await router.sendTx(
                server.getSender(),
                claimTxFee,
                body
            );
            expect(txResult.transactions).not.toHaveTransaction({
                success: false,
            });
            expect((await redPacketMultipleFixed.getStorage()).state).toEqual(RedPacketWrapper.State.normal)
            expect((await redPacketMultipleFixed.getStorage()).remainingSupply).toEqual(toNano(4) - toNano(2))
            expect((await redPacketMultipleFixed.getStorage()).totalPack).toEqual(2)
            expect((await redPacketMultipleFixed.getStorage()).remainingPack).toEqual(1)


            let aliceBalanceAfter = await alice.getBalance()
            console.log(`aliceBalanceAfter ${fromNano(aliceBalanceAfter)}`)
            //fwd会耗费掉一点fwd_fee
            expect(toNano(2) - (aliceBalanceAfter - aliceBalanceBefore)).toBeLessThan(toNano(0.001))
        }
        {
            //第二次给carlos取走,取完了
            let body = RouterWrapper.buildClaim(
                {
                    recipient: carlos.address,
                    redPacketIndex: 1,
                    queryId: queryId++,
                    uid: 71234123n,
                    redPacketClaimServer: beginCell().endCell()
                }
            );

            let txResult = await router.sendTx(
                server.getSender(),
                claimTxFee,
                body
            );
            expect(txResult.transactions).not.toHaveTransaction({
                success: false,
            });
            expect((await redPacketMultipleFixed.getStorage()).state).toEqual(RedPacketWrapper.State.finished)
            expect((await redPacketMultipleFixed.getStorage()).remainingSupply).toEqual(toNano(4) - toNano(4))
            expect((await redPacketMultipleFixed.getStorage()).totalPack).toEqual(2)
            expect((await redPacketMultipleFixed.getStorage()).remainingPack).toEqual(0)

            //总会多打一点,fwd_fee,gas_consume
            // expect((await wTonWalletCarlos.getWalletData())?.balance).toBeGreaterThan(toNano(2))
        }
    })

    it('carlos create jetton pocket multiple random', async () => {

        console.log(`=============================================carlos create jetton pocket multiple random=============================================`)

        let createTxFee = await router.getRouterCreateTxFee();
        console.log(`createTxFee ${fromNano(createTxFee)}`)

        let {body, tonAmount} = JettonWalletWrapper.buildTransfer(
            {
                queryId: queryId++,
                jettonAmount: toNano(20),
                toOwner: router.address,
                responseAddress: carlos.address,
                forwardTonAmount: createTxFee,
                forwardPayload: RouterWrapper.buildCreatePayload({
                    createParam: Params.composeCreateParamSigned(
                        {
                            packetData: {
                                op: "multipleRandom",
                                totalPack: 2,
                                deadline: 1730779273,
                            },
                            uid: 5623905n,
                            packetIndex: packetIndex++,
                            serverCheck: {
                                jettonUserWallet: jettonWalletRouter.address,
                                router: router.address,
                                redPacketSupply: toNano(20)
                            },
                            keyPair: serverKeyPair
                        }
                    )
                }),
            }
        );

        let txResult = await jettonWalletCarlos.sendTx(
            carlos.getSender(),
            tonAmount,
            body
        );
        expect(txResult.transactions).not.toHaveTransaction({
            success: false,
        });

        let redPacketAddress = await router.getRedPacket({redPacketIndex: 2})
        redPacketMultipleRandom = await blockchain.openContract(RedPacketWrapper.createFromAddress(redPacketAddress))
        expect((await redPacketMultipleRandom.getState()).state.type).toEqual(`active`)
        expect((await redPacketMultipleRandom.getStorage()).state).toEqual(RedPacketWrapper.State.normal)
        expect((await redPacketMultipleRandom.getStorage()).packetType).toEqual(Params.PacketTypeOp[`multipleRandom`])
        expect((await redPacketMultipleRandom.getStorage()).totalSupply).toEqual(toNano(20))
        expect((await redPacketMultipleRandom.getStorage()).totalPack).toEqual(2)
        expect((await redPacketMultipleRandom.getStorage()).remainingPack).toEqual(2)

        expect((await jettonWalletRouter.getWalletData())?.balance).toEqual(toNano(20))
    })

    it('server on behalf of alice and bob claim redPacket multiple random', async () => {

        console.log(`=============================================server on behalf of alice and bob claim redPacket multiple random=============================================`)

        let claimTxFee = await router.getRouterClaimTxFee();
        console.log(`claimTxFee ${fromNano(claimTxFee)}`)

        let aliceBalanceGain = 0n;
        let tempRemaining = 0n;
        {

            let aliceBalanceBefore = await jettonWalletAlice.getJettonBalance()
            console.log(`aliceBalanceBefore ${fromNano(aliceBalanceBefore)}`)

            //第一次给alice取走,但是还没有取完
            let body = RouterWrapper.buildClaim(
                {
                    recipient: alice.address,
                    redPacketIndex: 2,
                    queryId: queryId++,
                    uid: 875341234n,
                    redPacketClaimServer: beginCell().endCell()
                }
            );

            let txResult = await router.sendTx(
                server.getSender(),
                claimTxFee,
                body
            );
            expect(txResult.transactions).not.toHaveTransaction({
                success: false,
            });
            expect((await redPacketMultipleRandom.getStorage()).state).toEqual(RedPacketWrapper.State.normal)
            expect((await redPacketMultipleRandom.getStorage()).remainingSupply).toBeGreaterThan(toNano(0))
            expect((await redPacketMultipleRandom.getStorage()).remainingSupply).toBeLessThan(toNano(20))
            expect((await redPacketMultipleRandom.getStorage()).totalPack).toEqual(2)
            expect((await redPacketMultipleRandom.getStorage()).remainingPack).toEqual(1)

            let aliceBalanceAfter = await jettonWalletAlice.getJettonBalance()
            console.log(`aliceBalanceAfter ${fromNano(aliceBalanceAfter)}`)
            aliceBalanceGain = aliceBalanceAfter - aliceBalanceBefore
            //fwd会耗费掉一点fwd_fee
            expect(aliceBalanceGain).toEqual(toNano(20) - (await redPacketMultipleRandom.getStorage()).remainingSupply)

            tempRemaining = (await redPacketMultipleRandom.getStorage()).remainingSupply;
        }
        let bobBalanceGain = 0n;
        {

            let bobBalanceBefore = await jettonWalletBob.getJettonBalance()
            console.log(`bobBalanceBefore ${fromNano(bobBalanceBefore)}`)

            //第二次给bob取走,取完了
            let body = RouterWrapper.buildClaim(
                {
                    recipient: bob.address,
                    redPacketIndex: 2,
                    queryId: queryId++,
                    uid: 57891234n,
                    redPacketClaimServer: beginCell().endCell()
                }
            );

            let txResult = await router.sendTx(
                server.getSender(),
                claimTxFee,
                body
            );
            expect(txResult.transactions).not.toHaveTransaction({
                success: false,
            });
            expect((await redPacketMultipleRandom.getStorage()).state).toEqual(RedPacketWrapper.State.finished)
            expect((await redPacketMultipleRandom.getStorage()).remainingSupply).toEqual(toNano(20) - toNano(20))
            expect((await redPacketMultipleRandom.getStorage()).totalPack).toEqual(2)
            expect((await redPacketMultipleRandom.getStorage()).remainingPack).toEqual(0)

            let bobBalanceAfter = await jettonWalletBob.getJettonBalance()
            console.log(`bobBalanceAfter ${fromNano(bobBalanceAfter)}`)
            bobBalanceGain = bobBalanceAfter - bobBalanceBefore
            //fwd会耗费掉一点fwd_fee
            expect(bobBalanceGain).toEqual(tempRemaining - toNano(0))
        }
        expect(aliceBalanceGain + bobBalanceGain).toEqual(toNano(20))
    })

    it('bob create wTon pocket multiple fixed', async () => {

        console.log(`=============================================bob create wTon pocket multiple fixed=============================================`)

        let createTxFee = await router.getRouterCreateTxFee();
        console.log(`createTxFee ${fromNano(createTxFee)}`)

        let {body, tonAmount} = WTonWalletWrapper.buildTransfer(
            {
                queryId: queryId++,
                jettonAmount: toNano(50),
                toOwner: router.address,
                responseAddress: bob.address,
                forwardTonAmount: createTxFee,
                forwardPayload: RouterWrapper.buildCreatePayload({
                    createParam: Params.composeCreateParamSigned(
                        {
                            packetData: {
                                op: "multipleFixed",
                                totalPack: 2,
                                deadline: 1730779273,
                            },
                            uid: 3126123405n,
                            packetIndex: packetIndex++,
                            serverCheck: {
                                jettonUserWallet: wTonWalletRouter.address,
                                router: router.address,
                                redPacketSupply: toNano(50)
                            },
                            keyPair: serverKeyPair
                        })
                }),
            }
        );

        let txResult = await wTonWalletBob.sendTx(
            bob.getSender(),
            tonAmount,
            body
        );
        expect(txResult.transactions).not.toHaveTransaction({
            success: false,
        });

        let redPacketAddress = await router.getRedPacket({redPacketIndex: 3})
        redPacketMultipleFixedRefund = await blockchain.openContract(RedPacketWrapper.createFromAddress(redPacketAddress))
        expect((await redPacketMultipleFixedRefund.getState()).state.type).toEqual(`active`)
        expect((await redPacketMultipleFixedRefund.getStorage()).state).toEqual(RedPacketWrapper.State.normal)
        expect((await redPacketMultipleFixedRefund.getStorage()).packetType).toEqual(Params.PacketTypeOp[`multipleFixed`])
        expect((await redPacketMultipleFixedRefund.getStorage()).totalSupply).toEqual(toNano(50))
        expect((await redPacketMultipleFixedRefund.getStorage()).totalPack).toEqual(2)
        expect((await redPacketMultipleFixedRefund.getStorage()).remainingPack).toEqual(2)
        expect((await redPacketMultipleFixedRefund.getStorage()).creator.equals(bob.address)).toEqual(true)

        //初始化时给到了1Ton,收到10Ton+一点gasFee,又取走了,消耗了一点gas,有收到了4ton
        expect((await wTonWalletRouter.getWalletData())?.balance).toBeGreaterThan(toNano(4) + toNano(1))
    })

    it('server on behalf of alice claim redPacket multiple fixed', async () => {

        console.log(`=============================================server on behalf of alice claim redPacket multiple fixed=============================================`)

        let claimTxFee = await router.getRouterClaimTxFee();
        console.log(`claimTxFee ${fromNano(claimTxFee)}`)


        let aliceBalanceBefore = await alice.getBalance()
        console.log(`aliceBalanceBefore ${fromNano(aliceBalanceBefore)}`)

        //第一次给alice取走,但是还没有取完
        let body = RouterWrapper.buildClaim(
            {
                recipient: alice.address,
                redPacketIndex: 3,
                queryId: queryId++,
                uid: 2134551n,
                redPacketClaimServer: beginCell().endCell()
            }
        );

        let txResult = await router.sendTx(
            server.getSender(),
            claimTxFee,
            body
        );
        expect(txResult.transactions).not.toHaveTransaction({
            success: false,
        });
        expect((await redPacketMultipleFixedRefund.getStorage()).state).toEqual(RedPacketWrapper.State.normal)
        expect((await redPacketMultipleFixedRefund.getStorage()).remainingSupply).toEqual(toNano(50) - toNano(25))
        expect((await redPacketMultipleFixedRefund.getStorage()).totalPack).toEqual(2)
        expect((await redPacketMultipleFixedRefund.getStorage()).remainingPack).toEqual(1)


        let aliceBalanceAfter = await alice.getBalance()
        console.log(`aliceBalanceAfter ${fromNano(aliceBalanceAfter)}`)
        //fwd会耗费掉一点fwd_fee
        expect(toNano(25) - (aliceBalanceAfter - aliceBalanceBefore)).toBeLessThan(toNano(0.001))
    })

    it('bob to close multiple fixed', async () => {

        console.log(`=============================================server on behalf of bob to close multiple fixed=============================================`)

        let closeTxFee = await router.getRouterCloseTxFee();
        console.log(`closeTxFee ${fromNano(closeTxFee)}`)


        let bobBalanceBefore = await bob.getBalance()
        console.log(`bobBalanceBefore ${fromNano(bobBalanceBefore)}`)

        //第一次给alice取走,但是还没有取完
        let body = RouterWrapper.buildClose(
            {
                redPacketIndex: 3,
                redPacketCloseServer: beginCell().endCell(),
                keyPair: serverKeyPair,
                queryId: queryId++,
            }
        );

        let txResult = await router.sendTx(
            bob.getSender(),
            closeTxFee,
            body
        );
        expect(txResult.transactions).not.toHaveTransaction({
            success: false,
        });
        expect((await redPacketMultipleFixedRefund.getStorage()).state).toEqual(RedPacketWrapper.State.refund)
        expect((await redPacketMultipleFixedRefund.getStorage()).remainingSupply).toEqual(0n)
        expect((await redPacketMultipleFixedRefund.getStorage()).totalPack).toEqual(2)
        expect((await redPacketMultipleFixedRefund.getStorage()).remainingPack).toEqual(1)

        let bobBalanceAfter = await bob.getBalance()
        console.log(`bobBalanceAfter ${fromNano(bobBalanceAfter)}`)
        console.log(`bobBalanceAfter - bobBalanceBefore ${fromNano(bobBalanceAfter - bobBalanceBefore)}`)
        //fwd会耗费掉一点fwd_fee
        expect(toNano(25) - (bobBalanceAfter - bobBalanceBefore)).toBeLessThan(toNano(0.2))

        let report = Report.parseTransactions(txResult.transactions, router.address);
        expect(report.length).toEqual(1)
        expect(report[0].op).toEqual(`refund`)
        expect(bob.address.equals((report[0] as ReportRefund).recipient)).toBeTruthy()
        expect((report[0] as ReportRefund).redPacketIndex).toEqual(3n)
    })


    it('carlos create jetton pocket multiple specific', async () => {

        console.log(`=============================================carlos create jetton pocket multiple specific=============================================`)

        let createTxFee = await router.getRouterCreateTxFee();
        console.log(`createTxFee ${fromNano(createTxFee)}`)

        let {body, tonAmount} = JettonWalletWrapper.buildTransfer(
            {
                queryId: queryId++,
                jettonAmount: toNano(10),
                toOwner: router.address,
                responseAddress: carlos.address,
                forwardTonAmount: createTxFee,
                forwardPayload: RouterWrapper.buildCreatePayload({
                    createParam: Params.composeCreateParamSigned(
                        {
                            packetData: {
                                op: "multipleSpecific",
                                totalPack: 2,
                                deadline: 1730779273,
                            },
                            uid: 532314905n,
                            packetIndex: packetIndex++,
                            serverCheck: {
                                jettonUserWallet: jettonWalletRouter.address,
                                router: router.address,
                                redPacketSupply: toNano(10)
                            },
                            keyPair: serverKeyPair
                        }
                    )
                }),
            }
        );

        let txResult = await jettonWalletCarlos.sendTx(
            carlos.getSender(),
            tonAmount,
            body
        );
        expect(txResult.transactions).not.toHaveTransaction({
            success: false,
        });

        let redPacketAddress = await router.getRedPacket({redPacketIndex: 4})
        redPacketMultipleSpecific = await blockchain.openContract(RedPacketWrapper.createFromAddress(redPacketAddress))
        expect((await redPacketMultipleSpecific.getState()).state.type).toEqual(`active`)
        expect((await redPacketMultipleSpecific.getStorage()).state).toEqual(RedPacketWrapper.State.normal)
        expect((await redPacketMultipleSpecific.getStorage()).packetType).toEqual(Params.PacketTypeOp[`multipleSpecific`])
        expect((await redPacketMultipleSpecific.getStorage()).totalSupply).toEqual(toNano(10))
        expect((await redPacketMultipleSpecific.getStorage()).totalPack).toEqual(2)
        expect((await redPacketMultipleSpecific.getStorage()).remainingPack).toEqual(2)

        expect((await jettonWalletRouter.getWalletData())?.balance).toEqual(toNano(10))
    })

    it('carlos close redPacket multiple specific', async () => {

        console.log(`=============================================carlos close redPacket multiple specific=============================================`)

        let closeTxFee = await router.getRouterCloseTxFee();
        console.log(`closeTxFee ${fromNano(closeTxFee)}`)


        let carlosBalanceBefore = await jettonWalletCarlos.getJettonBalance()
        console.log(`carlosBalanceBefore ${fromNano(carlosBalanceBefore)}`)

        //carlos close, close的时候只取走4个, 留6个在合约里
        let body = RouterWrapper.buildClose(
            {
                redPacketIndex: 4,
                redPacketCloseServer: beginCell().storeUint(toNano(4n), 256).endCell(),
                queryId: queryId++,
                keyPair: serverKeyPair,
            }
        );

        let txResult = await router.sendTx(
            carlos.getSender(),
            closeTxFee,
            body
        );
        expect(txResult.transactions).not.toHaveTransaction({
            success: false,
        });
        expect((await redPacketMultipleSpecific.getStorage()).state).toEqual(RedPacketWrapper.State.refundButNotFinished)
        expect((await redPacketMultipleSpecific.getStorage()).remainingSupply).toEqual(toNano(6n))
        expect((await redPacketMultipleSpecific.getStorage()).remainingPack).toEqual(2)

        let carlosBalanceAfter = await jettonWalletCarlos.getJettonBalance()
        console.log(`carlosBalanceAfter ${fromNano(carlosBalanceAfter)}`)

        expect(carlosBalanceAfter - carlosBalanceBefore).toEqual(toNano(4n))
    })

    it('server on behalf of alice claim redPacket multiple specific after refunded', async () => {

        console.log(`=============================================server on behalf of alice claim redPacket multiple specific after refunded=============================================`)

        let claimTxFee = await router.getRouterClaimTxFee();
        console.log(`claimTxFee ${fromNano(claimTxFee)}`)

        let aliceBalanceBefore = await jettonWalletAlice.getJettonBalance()
        console.log(`aliceBalanceBefore ${fromNano(aliceBalanceBefore)}`)

        //第一次给alice取走,但是还没有取完
        let body = RouterWrapper.buildClaim(
            {
                recipient: alice.address,
                redPacketIndex: 4,
                queryId: queryId++,
                uid: 25140123n,
                //把剩余的6个全部claim完
                redPacketClaimServer: beginCell().storeUint(toNano(6n), 256).endCell()
            }
        );

        let txResult = await router.sendTx(
            server.getSender(),
            claimTxFee,
            body
        );
        expect(txResult.transactions).not.toHaveTransaction({
            success: false,
        });
        expect((await redPacketMultipleSpecific.getStorage()).state).toEqual(RedPacketWrapper.State.refund)
        expect((await redPacketMultipleSpecific.getStorage()).remainingSupply).toEqual(0n)
        expect((await redPacketMultipleSpecific.getStorage()).totalPack).toEqual(2)
        expect((await redPacketMultipleSpecific.getStorage()).remainingPack).toEqual(1)


        let aliceBalanceAfter = await jettonWalletAlice.getJettonBalance()
        console.log(`aliceBalanceAfter ${fromNano(aliceBalanceAfter)}`)
        expect(aliceBalanceAfter - aliceBalanceBefore).toEqual(toNano(6n))

    })

    async function getBalance(addr: Address) {
        return (await blockchain.getContract(addr)).balance
    }

    function bigIntAbs(a: bigint, b: bigint) {
        if (a < b) {
            return b - a;
        }
        return a - b;
    }

    function dit(a: string, b: () => {}) {

    }
});
