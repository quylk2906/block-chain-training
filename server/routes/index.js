import express from "express";
import BlockChain from "../blockchain";
import { v1 } from "uuid";

const bitcoin = new BlockChain();
const indexRouter = express.Router();
const nodeAddress = v1()
  .split("-")
  .join("")
  .toUpperCase();

const router = () => {
  indexRouter.route("/blockchain").get((req, res) => {
    res.send(bitcoin);
  });

  indexRouter.route("/transaction").post((req, res) => {
    const body = req.body;
    const blockIndex = bitcoin.createNewTransaction(
      body.amount,
      body.sender,
      body.recipient
    );
    res.send({ note: `Transaction will be added in block ${blockIndex}.` });
  });

  indexRouter.route("/mine").get((req, res) => {
    const lastBlock = bitcoin.getLastBlock();
    const previousHash = lastBlock["hash"];
    const currentBlockData = {
      transactions: bitcoin.pendingTransactions,
      index: lastBlock["index"] + 1
    };
    const nonce = bitcoin.proofOfWork(previousHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousHash, currentBlockData, nonce);

    bitcoin.createNewTransaction(12.5, "00", nodeAddress);
    const newBlock = bitcoin.createNewBlock(nonce, previousHash, blockHash);
    res.json({ note: "New block has mined successfully", block: newBlock });
  });
  return indexRouter;
};

export default router;
