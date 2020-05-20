const express = require("express");
const bodyParser = require("body-parser");
const conseiljs = require("conseiljs");
const TezosTypes = require("./node_modules/conseiljs/dist/types/tezos/TezosChainTypes")

const app = express();


// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: false, limit : '2mb' }));
app.use(bodyParser.json({limit : '2mb'}));

// construct contract Invocation Op
function constructContractInvocationOperation(publicKeyHash, counter, to, amount, fee, storageLimit, gasLimit, entrypoint, parameters, parameterFormat = TezosTypes.TezosParameterFormat.Michelson) {
    let transaction = {
        destination: to,
        amount: amount.toString(),
        storage_limit: storageLimit.toString(),
        gas_limit: gasLimit.toString(),
        counter: counter.toString(),
        fee: fee.toString(),
        source: publicKeyHash,
        kind: 'transaction'
    };
    if (parameters !== undefined) {
        if (parameterFormat === TezosTypes.TezosParameterFormat.Michelson) {
            const michelineParams = conseiljs.TezosLanguageUtil.translateParameterMichelsonToMicheline(parameters);
            transaction.parameters = { entrypoint: entrypoint || 'default', value: JSON.parse(michelineParams) };
        }
        else if (parameterFormat === TezosTypes.TezosParameterFormat.Micheline) {
            transaction.parameters = { entrypoint: entrypoint || 'default', value: JSON.parse(parameters) };
        }
        else if (parameterFormat === TezosTypes.TezosParameterFormat.MichelsonLambda) {
            const michelineLambda = conseiljs.TezosLanguageUtil.translateMichelsonToMicheline(`code ${parameters}`);
            transaction.parameters = { entrypoint: entrypoint || 'default', value: JSON.parse(michelineLambda) };
        }
    }
    else if (entrypoint !== undefined) {
        transaction.parameters = { entrypoint: entrypoint, value: [] };
    }
    return transaction;
}

const server = "https://testnet.tezster.tech";

//bodyParams :  publicKey, publicKeyHash, contract, amount, fee, storageLimit, gasLimit, parameters
app.post("/invokeOp",async (req,res) => {

    console.log(req.body.publicKey);

    var keyStore = {
        publicKey: req.body.publicKey,
        publicKeyHash:req.body.publicKeyHash,
        // privateKey: "edskRevMtNnc1W5jkPAKJDhC2oipaYuogxR3fZrsXhtZUsQrjibcU4WpnuS6WinNZ4WT8zNPpeSJHuUoEB83wwwuk9fkPv8z65"
    }
    
    //params
    const parameterFormat = TezosTypes.TezosParameterFormat.Michelson;
    const contract = req.body.contract
    const amount = req.body.amount
    const fee = req.body.fee
    const storageLimit = req.body.storageLimit
    const entryPoint = ""
    const gasLimit = req.body.gasLimit
    const parameters = req.body.parameters

    const counter = await conseiljs.TezosNodeReader.getCounterForAccount(server, keyStore.publicKeyHash) + 1;

    console.log(counter);

    const transaction = constructContractInvocationOperation(keyStore.publicKeyHash,counter, contract, amount, fee, storageLimit, gasLimit, undefined, parameters);

    console.log("Transaction :", transaction);

    const operations = await conseiljs.TezosNodeWriter.appendRevealOperation(server, keyStore, keyStore.publicKeyHash, counter - 1, [transaction]);
    console.log(operations);

    //sendOperation
    const blockHead = await conseiljs.TezosNodeReader.getBlockHead(server);
    const forgedOperationGroup = await conseiljs.TezosNodeWriter.forgeOperations(blockHead.hash, operations);

    console.log(forgedOperationGroup);

    // const signedOpGroup = await conseiljs.TezosNodeWriter.signOperationGroup(forgedOperationGroup, keyStore, "");

    // console.log("SignedOpGroup :",signedOpGroup);

    // console.log("Buffer to String: ", signedOpGroup.bytes.toString('hex'))
    //var sG = Buffer.from(signedOpGroup, "hex");
    //console.log("SG :", sG);

    // res.status(200).json({"forgedOperationGroup": forgedOperationGroup, "Blockhead_Hash:": blockHead.hash, "Blockhead_Protocol": blockHead.protocol, "operations": operations, "SignedOpGroup": signedOpGroup});
    res.status(200).json({"forgedOperationGroup": forgedOperationGroup, "Blockhead_Hash:": blockHead.hash, "Blockhead_Protocol": blockHead.protocol, "operations": operations});

});

app.post("/applyAndInjectOp", async (req, res) => {

    const blockHeadHash = req.body.blockHeadHash
    const blockHeadProtocol = req.body.blockHeadProtocol
    const operations = JSON.parse(req.body.operations)
    const signedOpGroup = {
        bytes: req.body.signedOpGroupBytes,
        signature: req.body.signedOpGroupSignature
    }

    console.log("Block Head Hash : ",blockHeadHash)
    console.log("BlockHeadProtocol :", blockHeadProtocol);

    console.log("signedOp : ", signedOpGroup)
    console.log("Operations : ",operations[0].parameters.value)

    try {
    const appliedOp = await conseiljs.TezosNodeWriter.preapplyOperation(server, blockHeadHash, blockHeadProtocol, operations, signedOpGroup);

    console.log("Applied Op :",appliedOp)

    const injectedOperation = await conseiljs.TezosNodeWriter.injectOperation(server, signedOpGroup);

    console.log("Results :", appliedOp[0]);
    console.log("Operation Group ID :", injectedOperation);

    res.status(200).json({ results: appliedOp[0], operationGroupID: injectedOperation })

    }
    catch {
        res.status(200).json({ "msg": "Op injections not valid" })
    }
})

// Defining the port - process.env.PORT
const port = process.env.PORT || 4000;

app.listen(port, () => console.log(` \nServer running in port ${port} !`));
