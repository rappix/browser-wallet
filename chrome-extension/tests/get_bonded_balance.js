// Testing for staking from Account: 5DoHzjMEKoWfjbmSEYDHU7RWkiJFMZwUfiqENomJgGfysQbk
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/api');
const util_crypto = require('@polkadot/util-crypto');

mainloop();

// function to connect/change network
async function mainloop() {
  let network='wss://testnet.bitg.org';
  const wsProvider = new WsProvider(network);
  const api = await ApiPromise.create({ provider: wsProvider,types:
    {
      "CallOf": "Call",
      "DispatchTime": {
        "_enum": {
          "At": "BlockNumber",
          "After": "BlockNumber"
        }
      },
      "ScheduleTaskIndex": "u32",
      "DelayedOrigin": {
        "delay": "BlockNumber",
        "origin": "PalletsOrigin"
      },
      "StorageValue": "Vec<u8>",
      "GraduallyUpdate": {
        "key": "StorageKey",
        "targetValue": "StorageValue",
        "perBlock": "StorageValue"
      },
      "StorageKeyBytes": "Vec<u8>",
      "StorageValueBytes": "Vec<u8>",
      "RpcDataProviderId": "Text",
      "OrderedSet": "Vec<AccountId>",
      "OrmlAccountData": {
        "free": "Balance",
        "frozen": "Balance",
        "reserved": "Balance"
      },
      "OrmlBalanceLock": {
        "amount": "Balance",
        "id": "LockIdentifier"
      },
      "DelayedDispatchTime": {
        "_enum": {
          "At": "BlockNumber",
          "After": "BlockNumber"
        }
      },
      "DispatchId": "u32",
      "Price": "FixedU128",
      "OrmlVestingSchedule": {
        "start": "BlockNumber",
        "period": "BlockNumber",
        "periodCount": "u32",
        "perPeriod": "Compact<Balance>"
      },
      "VestingScheduleOf": "OrmlVestingSchedule",
      "PalletBalanceOf": "Balance",
      "ChangeBalance": {
        "_enum": {
          "NoChange": "Null",
          "NewValue": "Balance"
        }
      },
      "BalanceWrapper": {
        "amount": "Balance"
      },
      "BalanceRequest": {
        "amount": "Balance"
      },
      "EvmAccountInfo": {
        "nonce": "Index",
        "contractInfo": "Option<EvmContractInfo>",
        "developerDeposit": "Option<Balance>"
      },
      "CodeInfo": {
        "codeSize": "u32",
        "refCount": "u32"
      },
      "EvmContractInfo": {
        "codeHash": "H256",
        "maintainer": "H160",
        "deployed": "bool"
      },
      "EvmAddress": "H160",
      "CallRequest": {
        "from": "Option<H160>",
        "to": "Option<H160>",
        "gasLimit": "Option<u32>",
        "storageLimit": "Option<u32>",
        "value": "Option<U128>",
        "data": "Option<Bytes>"
      },
      "CID": "Vec<u8>",
      "ClassId": "u32",
      "ClassIdOf": "ClassId",
      "TokenId": "u64",
      "TokenIdOf": "TokenId",
      "TokenInfoOf": {
        "metadata": "CID",
        "owner": "AccountId",
        "data": "TokenData"
      },
      "TokenData": {
        "deposit": "Balance"
      },
      "Properties": {
        "_set": {
          "_bitLength": 8,
          "Transferable": 1,
          "Burnable": 2
        }
      },
      "BondingLedger": {
        "total": "Compact<Balance>",
        "active": "Compact<Balance>",
        "unlocking": "Vec<UnlockChunk>"
      },
      "Amount": "i128",
      "AmountOf": "Amount",
      "AuctionId": "u32",
      "AuctionIdOf": "AuctionId",
      "TokenSymbol": {
        "_enum": {
          "BITG": 0,
          "USDG": 1
        }
      },
      "CurrencyId": {
        "_enum": {
          "Token": "TokenSymbol",
          "DEXShare": "(TokenSymbol, TokenSymbol)",
          "ERC20": "EvmAddress"
        }
      },
      "CurrencyIdOf": "CurrencyId",
      "AuthoritysOriginId": {
        "_enum": [
          "Root"
        ]
      },
      "TradingPair": "(CurrencyId,  CurrencyId)",
      "AsOriginId": "AuthoritysOriginId",
      "SubAccountStatus": {
        "bonded": "Balance",
        "available": "Balance",
        "unbonding": "Vec<(EraIndex,Balance)>",
        "mockRewardRate": "Rate"
      },
      "Params": {
        "targetMaxFreeUnbondedRatio": "Ratio",
        "targetMinFreeUnbondedRatio": "Ratio",
        "targetUnbondingToFreeRatio": "Ratio",
        "unbondingToFreeAdjustment": "Ratio",
        "baseFeeRate": "Rate"
      },
      "Ledger": {
        "bonded": "Balance",
        "unbondingToFree": "Balance",
        "freePool": "Balance",
        "toUnbondNextEra": "(Balance, Balance)"
      },
      "ChangeRate": {
        "_enum": {
          "NoChange": "Null",
          "NewValue": "Rate"
        }
      },
      "ChangeRatio": {
        "_enum": {
          "NoChange": "Null",
          "NewValue": "Ratio"
        }
      },
      "BalanceInfo": {
        "amount": "Balance"
      },
      "Rate": "FixedU128",
      "Ratio": "FixedU128",
      "PublicKey": "[u8; 20]",
      "DestAddress": "Vec<u8>",
      "Keys": "SessionKeys2",
      "PalletsOrigin": {
        "_enum": {
          "System": "SystemOrigin",
          "Timestamp": "Null",
          "RandomnessCollectiveFlip": "Null",
          "Balances": "Null",
          "Accounts": "Null",
          "Currencies": "Null",
          "Tokens": "Null",
          "Vesting": "Null",
          "Utility": "Null",
          "Multisig": "Null",
          "Recovery": "Null",
          "Proxy": "Null",
          "Scheduler": "Null",
          "Indices": "Null",
          "GraduallyUpdate": "Null",
          "Authorship": "Null",
          "Babe": "Null",
          "Grandpa": "Null",
          "Staking": "Null",
          "Session": "Null",
          "Historical": "Null",
          "Authority": "DelayedOrigin",
          "ElectionsPhragmen": "Null",
          "Contracts": "Null",
          "EVM": "Null",
          "Sudo": "Null",
          "TransactionPayment": "Null"
        }
      },
      "LockState": {
        "_enum": {
          "Committed": "None",
          "Unbonding": "BlockNumber"
        }
      },
      "LockDuration": {
        "_enum": [
          "OneMonth",
          "OneYear",
          "TenYears"
        ]
      },
      "EraIndex": "u32",
      "Era": {
        "index": "EraIndex",
        "start": "BlockNumber"
      },
      "Commitment": {
        "state": "LockState",
        "duration": "LockDuration",
        "amount": "Balance",
        "candidate": "AccountId"
      },
      "AssetDetails": {
          "owner": "AccountId",
          "issuer": "AccountId",
          "admin": "AccountId",
          "freezer": "AccountId",
          "supply": "Balance",
          "deposit": "DepositBalance",
          "max_zombies": "u32",
          "min_balance":"Balance",
          "zombies":"u32",
          "accounts":"u32",
          "is_frozen":"bool"
      },
      "AssetMetadata": {
          "deposit":"DepositBalance",
          "name": "Vec<u8>",
          "symbol": "Vec<u8>",
          "decimals":"u8"
      },
      "AssetBalance" : {
          "balance":"Balance",
          "is_frozen":"bool",
          "is_zombie":"bool"
      },
      "AssetId":"u32",
      "BalanceOf":"Balance",
      "VCU": {
        "serial_number": "i32",
        "project": "Vec<u8>",
        "amount_co2": "Balance",
        "ipfs_hash": "Vec<u8>"
      }
    }  
   });
   console.log("Genesis hash: "+api.genesisHash.toHex());
   await util_crypto.cryptoWaitReady();
   console.log("Creating Key Pairs from mnemonic");
   let k= new Keyring({ type: 'sr25519' });   
   let mnemonic="frost recycle copper hen mechanic immune develop blanket wine task screen goat";
   let keyspair = k.addFromUri(mnemonic, { name: '' }, 'sr25519');
   console.log("Public Key:");
   console.log(keyspair.publicKey);
   console.log("Address:");
   console.log(keyspair.address);

   console.log("Get Locks");
   const locks = await api.query.balances.locks(keyspair.address);
   console.log("Available Locks: ");
   for (const lock of locks) {
    if(lock.id.toString()=='0x7374616b696e6720'){  //staking in hex
        console.log("Staking:")
        console.log(parseFloat(lock.amount));
    }
   }
   

 }
 