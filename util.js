var conseiljs = require("conseiljs")

async function hello(){

    var keystore = {
        publicKey: "edpkuLog552hecagkykJ3fTvop6grTMhfZY4TWbvchDWdYyxCHcrQL",
        publicKeyHash: "tz1g85oYHLFKDpNfDHPeBUbi3S7pUsgCB28q",
        secretKey: "edskRdVS5H9YCRAG8yqZkX2nUTbGcaDqjYgopkJwRuPUnYzCn3t9ZGksncTLYe33bFjq29pRhpvjQizCCzmugMGhJiXezixvdC"
    }

    var tezosNode = "https://testnet.tezster.tech";

    var contractAddress = "KT1LRre6w4EgkCRLwUugQLEdRGPvJdTmx3Ae"

    var amount = 10, fee=100000, derivation_path= undefined, storage_limit = 1000, gas_limit=10000, parameters="(Left 6)", entry_point=undefined;

    const result = await conseiljs.TezosNodeWriter.sendContractInvocationOperation(
        tezosNode,
        keystore,
        contractAddress,
        amount,
        fee,
        derivation_path,
        storage_limit,
        gas_limit,
        entry_point,
        parameters,
        conseiljs.TezosParameterFormat.Michelson
      );
    
      console.log(
        `Injected operation ! \n Invocation Group ID : ${result.operationGroupID}`
      );

}
hello();